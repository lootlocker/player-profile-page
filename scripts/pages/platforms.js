import { createApiClient } from "../api/client.js";
import { CONFIG } from "../config.js";
import { clearSessionToken, getSessionToken } from "../api/session.js";
import {
  applyCustomScripts,
  applyCustomStylesheets,
  clearNotice,
  ensureRequiredConfigOrRenderError,
  escapeHtml,
  getCookie,
  getInitials,
  isSessionError,
  readableError,
  setCookie,
  showNotice,
} from "../utils.js";

const THEME_ROOT_CLASS = "theme-dark";
const THEME_QUERY = window.matchMedia("(prefers-color-scheme: dark)");
const THEME_COOKIE_NAME = "ll_theme";
const THEME_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

const LOGO_BY_THEME = {
  light: "../styles/assets/logo-lightmode.svg",
  dark: "../styles/assets/logo-darkmode.svg",
};
const ICON_BY_STATE = {
  default: "copy",
  success: "check",
};

const PUBLISHER_NAME = String(CONFIG.publisherName || "Publisher");
const PLATFORM_LABELS = {
  steam: "Steam",
  discord: "Discord",
  epic_games: "Epic Games",
  credentials: PUBLISHER_NAME,
  google: "Google",
  apple: "Apple",
  xbox: "Xbox",
  psn: "PlayStation",
  twitch: "Twitch",
};

const PLATFORM_ICON_BY_MODE = {
  credentials: {
    light: "../styles/assets/platforms/logo-icon.svg",
    dark: "../styles/assets/platforms/logo-icon.svg",
  },
  steam: {
    light: "../styles/assets/platforms/steam-lightmode.svg",
    dark: "../styles/assets/platforms/steam-darkmode.svg",
  },
  discord: {
    light: "../styles/assets/platforms/discord-lightmode.svg",
    dark: "../styles/assets/platforms/discord-darkmode.svg",
  },
};

const DEFAULT_PLATFORM_KEYS = [
  "credentials",
  "steam",
  "discord",
  "epic_games",
  "google",
  "apple",
  "xbox",
  "psn",
  "twitch",
];

const state = {
  sessionToken: getSessionToken(),
  player: null,
  connectedAccounts: [],
  platformProviders: [],
  platformsLoading: true,
  gameInfo: null,
  connectLease: null,
  connectProvider: null,
  pendingUnlinkPlatform: null,
  copyUidStatusTimerId: null,
  copyUidButtonTimerId: null,
};

const api = createApiClient(CONFIG, () => state.sessionToken);

const els = {
  logoutButton: document.getElementById("logoutButton"),
  globalError: document.getElementById("globalError"),
  playerName: document.getElementById("playerName"),
  playerUid: document.getElementById("playerUid"),
  copyUidButton: document.getElementById("copyUidButton"),
  copyUidStatus: document.getElementById("copyUidStatus"),
  avatar: document.getElementById("avatar"),
  platformsError: document.getElementById("platformsError"),
  platformsTableBody: document.getElementById("platformsTableBody"),
  connectModal: document.getElementById("connectModal"),
  connectLoading: document.getElementById("connectLoading"),
  connectQrImage: document.getElementById("connectQrImage"),
  connectLink: document.getElementById("connectLink"),
  connectStatus: document.getElementById("connectStatus"),
  connectDoneButton: document.getElementById("connectDoneButton"),
  connectCloseButton: document.getElementById("connectCloseButton"),
  unlinkModal: document.getElementById("unlinkModal"),
  unlinkConfirmMessage: document.getElementById("unlinkConfirmMessage"),
  unlinkStatus: document.getElementById("unlinkStatus"),
  unlinkConfirmButton: document.getElementById("unlinkConfirmButton"),
  unlinkCancelButton: document.getElementById("unlinkCancelButton"),
  unlinkCloseButton: document.getElementById("unlinkCloseButton"),
  brandLogo: document.getElementById("brandLogo"),
  themeToggleButton: document.getElementById("themeToggleButton"),
};

function init() {
  if (!ensureRequiredConfigOrRenderError(CONFIG)) {
    return;
  }

  applyCustomScripts(CONFIG.customScripts);
  applyCustomStylesheets(CONFIG.customStylesheets);
  syncTheme(resolveInitialTheme());

  if (!state.sessionToken) {
    window.location.href = "../login.html";
    return;
  }

  bindEvents();
  showLoadingState();
  hydratePage();
}

function bindEvents() {
  els.logoutButton.addEventListener("click", signOut);
  els.themeToggleButton?.addEventListener("click", toggleThemePreference);
  els.copyUidButton?.addEventListener("click", handleCopyUid);
  els.connectDoneButton?.addEventListener("click", confirmConnectedAccount);
  els.connectCloseButton?.addEventListener("click", closeConnectModal);
  els.unlinkConfirmButton?.addEventListener("click", confirmUnlinkPlatform);
  els.unlinkCancelButton?.addEventListener("click", closeUnlinkModal);
  els.unlinkCloseButton?.addEventListener("click", closeUnlinkModal);
  els.platformsTableBody?.addEventListener("click", handlePlatformTableClick);
  THEME_QUERY.addEventListener("change", handleThemeChange);

  els.connectModal?.addEventListener("click", (event) => {
    if (event.target === els.connectModal) {
      closeConnectModal();
    }
  });

  els.unlinkModal?.addEventListener("click", (event) => {
    if (event.target === els.unlinkModal) {
      closeUnlinkModal();
    }
  });
}

function handleThemeChange(event) {
  if (getSavedTheme()) {
    return;
  }

  syncTheme(event.matches);
}

function syncTheme(isDark) {
  document.documentElement.classList.toggle(THEME_ROOT_CLASS, isDark);

  if (els.themeToggleButton) {
    const nextThemeLabel = isDark ? "Enable light mode" : "Enable dark mode";
    const themeIcon = isDark ? "moon" : "sun";
    els.themeToggleButton.innerHTML = `<span class="ui-icon ui-icon--${themeIcon}" aria-hidden="true"></span>`;
    els.themeToggleButton.setAttribute("aria-label", nextThemeLabel);
    els.themeToggleButton.setAttribute("title", nextThemeLabel);
  }

  if (els.brandLogo) {
    els.brandLogo.src = isDark ? LOGO_BY_THEME.dark : LOGO_BY_THEME.light;
  }

  renderPlatformRows(state.connectedAccounts);
  updateCopyUidButtonIconForTheme();
}

function resolveInitialTheme() {
  const savedTheme = getSavedTheme();
  if (savedTheme === "dark") {
    return true;
  }

  if (savedTheme === "light") {
    return false;
  }

  return THEME_QUERY.matches;
}

function getSavedTheme() {
  const value = getCookie(THEME_COOKIE_NAME);
  if (value === "light" || value === "dark") {
    return value;
  }

  return null;
}

function toggleThemePreference() {
  const isDark = document.documentElement.classList.contains(THEME_ROOT_CLASS);
  const nextTheme = isDark ? "light" : "dark";

  setCookie(THEME_COOKIE_NAME, nextTheme, {
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: "Lax",
    secure: window.location.protocol === "https:",
  });

  syncTheme(nextTheme === "dark");
}

function showLoadingState() {
  els.playerName.textContent = "Loading profile...";
  els.playerUid.textContent = "Please wait";
  els.avatar.textContent = "..";
  if (els.copyUidButton) {
    els.copyUidButton.disabled = true;
  }
  resetCopyUidButtonIcon();
  clearCopyUidStatus();

  if (els.platformsTableBody) {
    els.platformsTableBody.innerHTML = `
      <div class="platform-row">
        <div class="platform-cell table-empty muted">Loading platforms...</div>
      </div>
    `;
  }
}

async function hydratePage() {
  clearNotice(els.globalError);
  clearNotice(els.platformsError);
  state.platformsLoading = true;
  renderPlatformRows(state.connectedAccounts);

  try {
    const playerInfo = await api.getInfoFromSession();
    state.player = playerInfo.info;
    renderProfile(state.player);

    const providersResult = await Promise.resolve(loadPlatformProviders()).then(
      (value) => ({ status: "fulfilled", value }),
      (reason) => ({ status: "rejected", reason }),
    );

    if (providersResult.status === "fulfilled") {
      state.platformProviders = ensureCredentialsProvider(
        providersResult.value,
      );
    } else {
      state.platformProviders = buildDefaultPlatformProviders();
      showNotice(els.platformsError, readableError(providersResult.reason));
    }

    const accountsResult = await Promise.resolve(
      api.listConnectedAccounts(),
    ).then(
      (value) => ({ status: "fulfilled", value }),
      (reason) => ({ status: "rejected", reason }),
    );

    if (accountsResult.status === "fulfilled") {
      state.connectedAccounts = accountsResult.value.connected_accounts || [];
    } else {
      state.connectedAccounts = [];
      showNotice(els.platformsError, readableError(accountsResult.reason));
    }

    state.platformsLoading = false;
    renderPlatformRows(state.connectedAccounts);
  } catch (error) {
    state.platformsLoading = false;
    handlePageError(error);
  }
}

async function loadPlatformProviders() {
  const gameInfoResult = await api.getGameInfo();
  const info = gameInfoResult?.info || null;
  const titleId = info?.title_id;
  const environmentId = info?.environment_id;

  if (!titleId || !environmentId) {
    throw new Error("Missing title or environment ID for providers.");
  }

  state.gameInfo = info;
  const authConfig = await api.getExternalAuthenticationConfig(
    titleId,
    environmentId,
  );
  const identityProviders = Array.isArray(authConfig?.identity_providers)
    ? authConfig.identity_providers
    : [];

  const providers = identityProviders
    .map((provider) => {
      const id = String(provider?.id || "").trim();
      if (!id) {
        return null;
      }

      const name = String(provider?.name || "").trim();
      return {
        id,
        name,
      };
    })
    .filter(Boolean);

  return providers.length ? providers : buildDefaultPlatformProviders();
}

function buildDefaultPlatformProviders() {
  return ensureCredentialsProvider(
    DEFAULT_PLATFORM_KEYS.map((id) => ({
      id,
      name: PLATFORM_LABELS[id] || formatProviderLabel(id),
    })),
  );
}

function ensureCredentialsProvider(providers) {
  const providerList = Array.isArray(providers) ? providers : [];
  const hasCredentials = providerList.some(
    (provider) => normalizeProviderKey(provider?.id) === "credentials",
  );

  if (hasCredentials) {
    return providerList;
  }

  return [
    {
      id: "credentials",
      name: PLATFORM_LABELS.credentials,
    },
    ...providerList,
  ];
}

function buildRenderableProviders(accounts) {
  const configuredProviders = state.platformProviders.length
    ? state.platformProviders
    : buildDefaultPlatformProviders();
  const providersByKey = new Map();

  configuredProviders.forEach((provider) => {
    const id = String(provider?.id || "").trim();
    if (!id) {
      return;
    }

    const normalizedKey = normalizeProviderKey(id);
    providersByKey.set(normalizedKey, {
      id,
      name: String(provider?.name || "").trim(),
    });
  });

  accounts.forEach((account) => {
    const accountProvider = String(account?.provider || "").trim();
    if (!accountProvider) {
      return;
    }

    const normalizedKey = normalizeProviderKey(accountProvider);
    if (providersByKey.has(normalizedKey)) {
      return;
    }

    providersByKey.set(normalizedKey, {
      id: normalizedKey,
      name:
        PLATFORM_LABELS[normalizedKey] || formatProviderLabel(normalizedKey),
    });
  });

  ensureCredentialsProvider(Array.from(providersByKey.values())).forEach(
    (provider) => {
      const normalizedKey = normalizeProviderKey(provider.id);
      if (!providersByKey.has(normalizedKey)) {
        providersByKey.set(normalizedKey, provider);
      }
    },
  );

  return Array.from(providersByKey.values());
}

function showPlatformsLoadingState() {
  if (!els.platformsTableBody) {
    return;
  }

  els.platformsTableBody.innerHTML = `
      <div class="platform-row">
        <div class="platform-cell muted table-empty">Loading platforms...</div>
      </div>
    `;
}

function renderPlatformRows(accounts) {
  if (!els.platformsTableBody) {
    return;
  }

  if (state.platformsLoading) {
    showPlatformsLoadingState();
    return;
  }

  const linkedProviders = new Set(
    accounts.map((account) => normalizeProviderKey(account.provider)),
  );
  const providers = buildRenderableProviders(accounts);

  const mode = getThemeMode();
  els.platformsTableBody.innerHTML = providers
    .map((provider) => {
      const platformId = provider.id;
      const normalizedKey = normalizeProviderKey(platformId);
      const label = getPlatformLabel(platformId, provider.name);
      const linked = linkedProviders.has(normalizedKey);
      const canUnlink = normalizedKey !== "credentials";
      const iconPath = PLATFORM_ICON_BY_MODE[normalizedKey]?.[mode] || null;
      const fallback = escapeHtml(label.slice(0, 2).toUpperCase());
      const iconMarkup = iconPath
        ? `<span class="platform-name__icon provider-icon provider-icon--asset"><img class="provider-icon__img" src="${iconPath}" alt="" /></span>`
        : `<span class="platform-name__icon provider-icon"><span class="provider-icon__fallback">${fallback}</span></span>`;
      return `
      <div class="platform-row">
        <div class="platform-cell">
          <span class="platform-name">${iconMarkup}<span>${escapeHtml(label)}</span></span>
        </div>
        <div class="platform-cell">
          <span class="status-chip ${linked ? "status-chip--linked" : "status-chip--not-linked"}">
            ${linked ? "Linked" : "Not linked"}
          </span>
        </div>
        <div class="platform-cell platform-cell--action">
          ${linked ? renderLinkedAction(platformId, canUnlink) : `<button class="button button--small" type="button" data-link-platform="${escapeHtml(platformId)}">Link</button>`}
        </div>
      </div>
    `;
    })
    .join("");
}

function handlePageError(error) {
  if (isSessionError(error)) {
    signOut();
    return;
  }

  showNotice(els.globalError, readableError(error));
}

function renderProfile(profile) {
  const displayName = profile.name || profile.public_uid || "Player";
  const uid = profile.public_uid || "No public UID";

  els.playerName.textContent = displayName;
  els.playerUid.textContent = uid;
  els.avatar.textContent = getInitials(displayName);
  if (els.copyUidButton) {
    els.copyUidButton.disabled = !profile.public_uid;
  }
  resetCopyUidButtonIcon();
  clearCopyUidStatus();
}

function renderLinkedAction(platformKey, canUnlink) {
  if (!canUnlink) {
    return ``;
  }

  return `<button class="button button--ghost button--small" type="button" data-unlink-platform="${escapeHtml(platformKey)}">Unlink</button>`;
}

function handlePlatformTableClick(event) {
  const button = event.target.closest(
    "[data-link-platform], [data-unlink-platform]",
  );
  if (!button) {
    return;
  }

  const linkPlatformKey = button.getAttribute("data-link-platform");
  if (linkPlatformKey) {
    openConnectModal(linkPlatformKey);
    return;
  }

  const unlinkPlatformKey = button.getAttribute("data-unlink-platform");
  if (unlinkPlatformKey) {
    openUnlinkModal(unlinkPlatformKey);
  }
}

function openUnlinkModal(platformKey) {
  if (!platformKey) {
    showNotice(els.platformsError, "Missing platform provider.");
    return;
  }

  const platformLabel = getPlatformLabel(platformKey);
  state.pendingUnlinkPlatform = platformKey;
  clearNotice(els.unlinkStatus);
  if (els.unlinkConfirmButton) {
    els.unlinkConfirmButton.disabled = false;
    els.unlinkConfirmButton.textContent = "Unlink";
  }

  if (els.unlinkConfirmMessage) {
    els.unlinkConfirmMessage.textContent = `Unlink ${platformLabel}? You can link it again later.`;
  }

  els.unlinkModal?.classList.remove("hidden");
}

function closeUnlinkModal() {
  els.unlinkModal?.classList.add("hidden");
  clearNotice(els.unlinkStatus);
  state.pendingUnlinkPlatform = null;

  if (els.unlinkConfirmButton) {
    els.unlinkConfirmButton.disabled = false;
    els.unlinkConfirmButton.textContent = "Unlink";
  }
}

async function confirmUnlinkPlatform() {
  if (!state.pendingUnlinkPlatform) {
    showNotice(els.unlinkStatus, "No platform selected to unlink.");
    return;
  }

  clearNotice(els.unlinkStatus);

  if (els.unlinkConfirmButton) {
    els.unlinkConfirmButton.disabled = true;
    els.unlinkConfirmButton.textContent = "Unlinking...";
  }

  const unlinked = await unlinkPlatform(state.pendingUnlinkPlatform);

  if (unlinked) {
    closeUnlinkModal();
    return;
  }

  if (els.unlinkConfirmButton) {
    els.unlinkConfirmButton.disabled = false;
    els.unlinkConfirmButton.textContent = "Unlink";
  }
}

function normalizeProviderKey(provider) {
  const key = String(provider || "").toLowerCase();
  if (key === "epic") {
    return "epic_games";
  }
  return key;
}

function getPlatformLabel(providerId, fallbackName = "") {
  const normalizedKey = normalizeProviderKey(providerId);
  const providerFromConfig = state.platformProviders.find(
    (provider) => provider.id === providerId,
  );

  return (
    providerFromConfig?.name ||
    fallbackName ||
    PLATFORM_LABELS[normalizedKey] ||
    formatProviderLabel(providerId)
  );
}

function formatProviderLabel(providerId) {
  return String(providerId || "Provider")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function openConnectModal(platformKey) {
  if (!platformKey) {
    showNotice(els.platformsError, "Missing platform provider.");
    return;
  }

  state.connectLease = null;
  state.connectProvider = platformKey;
  clearNotice(els.connectStatus);
  setConnectLoading(true);
  els.connectQrImage?.removeAttribute("src");
  els.connectQrImage?.classList.add("hidden");

  if (els.connectLink) {
    els.connectLink.href = "#";
    els.connectLink.setAttribute("aria-disabled", "true");
    els.connectLink.classList.add("is-disabled");
  }

  if (els.connectDoneButton) {
    els.connectDoneButton.disabled = true;
  }

  els.connectModal?.classList.remove("hidden");

  try {
    const lease = await api.createRemoteLease();
    state.connectLease = lease;

    const authUrl = appendProviderQuery(lease.redirect_uri || "#", platformKey);

    if (lease.code && els.connectQrImage) {
      els.connectQrImage.src = buildProviderQrSource(authUrl);
      els.connectQrImage.classList.remove("hidden");
    }

    if (els.connectLink) {
      els.connectLink.href = authUrl;
      els.connectLink.removeAttribute("aria-disabled");
      els.connectLink.classList.remove("is-disabled");
    }

    if (els.connectDoneButton) {
      els.connectDoneButton.disabled = false;
    }
  } catch (error) {
    showNotice(els.connectStatus, readableError(error));
  } finally {
    setConnectLoading(false);
  }
}

function closeConnectModal() {
  els.connectModal?.classList.add("hidden");
  clearNotice(els.connectStatus);
  setConnectLoading(false);
  state.connectProvider = null;
}

async function confirmConnectedAccount() {
  if (!state.connectLease?.code || !state.connectLease?.nonce) {
    showNotice(els.connectStatus, "No lease found. Close and try again.");
    return;
  }

  clearNotice(els.connectStatus);
  if (els.connectDoneButton) {
    els.connectDoneButton.disabled = true;
  }

  try {
    await api.attachProvider(state.connectLease.code, state.connectLease.nonce);
    const result = await api.listConnectedAccounts();
    state.connectedAccounts = result.connected_accounts || [];
    renderPlatformRows(state.connectedAccounts);
    closeConnectModal();
  } catch (error) {
    if (isSessionError(error)) {
      signOut();
      return;
    }

    showNotice(els.connectStatus, readableError(error));
  } finally {
    if (els.connectDoneButton) {
      els.connectDoneButton.disabled = false;
    }
  }
}

function buildProviderQrSource(authUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(authUrl)}&size=220x220&margin=4&color=a8ff78&bgcolor=060f06`;
}

function appendProviderQuery(url, provider) {
  const rawUrl = String(url || "").trim();
  const providerValue = String(provider || "").trim();
  if (!rawUrl || rawUrl === "#" || !providerValue) {
    return rawUrl || "#";
  }

  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set("provider", providerValue);
    return parsed.toString();
  } catch (_error) {
    const separator = rawUrl.includes("?") ? "&" : "?";
    return `${rawUrl}${separator}provider=${encodeURIComponent(providerValue)}`;
  }
}

async function unlinkPlatform(platformKey) {
  if (platformKey === "credentials") {
    showNotice(els.platformsError, "Credentials cannot be unlinked.");
    return false;
  }

  clearNotice(els.platformsError);
  clearNotice(els.unlinkStatus);
  const provider = toDetachProvider(platformKey);

  try {
    await api.deleteProvider(provider);
    const result = await api.listConnectedAccounts();
    state.connectedAccounts = result.connected_accounts || [];
    renderPlatformRows(state.connectedAccounts);
    return true;
  } catch (error) {
    if (isSessionError(error)) {
      signOut();
      return false;
    }

    const message = readableError(error);
    showNotice(els.platformsError, message);
    showNotice(els.unlinkStatus, message);
    return false;
  }
}

function toDetachProvider(platformKey) {
  if (platformKey === "epic_games") {
    return "epic";
  }

  return platformKey;
}

async function handleCopyUid() {
  const uid = state.player?.public_uid;
  if (!uid) {
    showCopyUidStatus("No Public UID available to copy.", true);
    return;
  }

  try {
    await copyText(uid);
    showCopiedButtonState();
    showCopyUidStatus("Public UID copied.", false);
  } catch (_error) {
    resetCopyUidButtonIcon();
    showCopyUidStatus("Unable to copy UID on this browser.", true);
  }
}

function showCopiedButtonState() {
  if (!els.copyUidButton) {
    return;
  }

  if (state.copyUidButtonTimerId) {
    window.clearTimeout(state.copyUidButtonTimerId);
    state.copyUidButtonTimerId = null;
  }

  els.copyUidButton.innerHTML =
    '<span class="ui-icon ui-icon--check" aria-hidden="true"></span>';

  state.copyUidButtonTimerId = window.setTimeout(() => {
    state.copyUidButtonTimerId = null;
    resetCopyUidButtonIcon();
  }, 2200);
}

function resetCopyUidButtonIcon() {
  if (!els.copyUidButton) {
    return;
  }

  if (state.copyUidButtonTimerId) {
    window.clearTimeout(state.copyUidButtonTimerId);
    state.copyUidButtonTimerId = null;
  }

  els.copyUidButton.innerHTML =
    '<span class="ui-icon ui-icon--copy" aria-hidden="true"></span>';
}

function updateCopyUidButtonIconForTheme() {
  if (!els.copyUidButton) {
    return;
  }

  const iconName = state.copyUidButtonTimerId
    ? ICON_BY_STATE.success
    : ICON_BY_STATE.default;
  els.copyUidButton.innerHTML = `<span class="ui-icon ui-icon--${iconName}" aria-hidden="true"></span>`;
}

function getThemeMode() {
  return document.documentElement.classList.contains(THEME_ROOT_CLASS)
    ? "dark"
    : "light";
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "absolute";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

function showCopyUidStatus(text, isError) {
  if (!els.copyUidStatus) {
    return;
  }

  if (state.copyUidStatusTimerId) {
    window.clearTimeout(state.copyUidStatusTimerId);
    state.copyUidStatusTimerId = null;
  }

  els.copyUidStatus.textContent = text;
  els.copyUidStatus.classList.remove("hidden");
  els.copyUidStatus.classList.toggle("notice--error", isError);
  els.copyUidStatus.classList.toggle("notice--success", !isError);

  state.copyUidStatusTimerId = window.setTimeout(
    clearCopyUidStatus,
    isError ? 3200 : 2200,
  );
}

function clearCopyUidStatus() {
  if (!els.copyUidStatus) {
    return;
  }

  if (state.copyUidStatusTimerId) {
    window.clearTimeout(state.copyUidStatusTimerId);
    state.copyUidStatusTimerId = null;
  }

  els.copyUidStatus.textContent = "";
  els.copyUidStatus.classList.add("hidden");
  els.copyUidStatus.classList.remove("notice--error", "notice--success");
}

function setConnectLoading(isLoading) {
  if (!els.connectLoading) {
    return;
  }

  els.connectLoading.classList.toggle("hidden", !isLoading);
}

function signOut() {
  state.sessionToken = null;
  state.player = null;
  clearSessionToken();
  window.location.href = "../login.html";
}

init();
