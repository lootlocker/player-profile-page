import { createApiClient } from "../api/client.js";
import { CONFIG } from "../core/config.js";
import { clearSessionToken, getSessionToken } from "../api/session.js";
import {
  clearNotice,
  escapeHtml,
  getCookie,
  getInitials,
  isSessionError,
  readableError,
  setCookie,
  showNotice,
} from "../core/utils.js";

const THEME_ROOT_CLASS = "theme-dark";
const THEME_QUERY = window.matchMedia("(prefers-color-scheme: dark)");
const THEME_COOKIE_NAME = "ll_theme";
const THEME_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

const LOGO_BY_THEME = {
  light: "../styles/assets/logo-lightmode.svg",
  dark: "../styles/assets/logo-darkmode.svg",
};

const THEME_ICON = {
  moon: "../styles/assets/icons/moon-dark.svg",
  sun: "../styles/assets/icons/sun-light.svg",
};

const COPY_ICON_BY_MODE = {
  default: {
    light: "../styles/assets/icons/copy-light.svg",
    dark: "../styles/assets/icons/copy-dark.svg",
  },
  success: {
    light: "../styles/assets/icons/check-light.svg",
    dark: "../styles/assets/icons/check-dark.svg",
  },
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

const PLATFORM_KEYS = [
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
  connectLease: null,
  connectProvider: null,
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
  brandLogo: document.getElementById("brandLogo"),
  themeToggleButton: document.getElementById("themeToggleButton"),
};

function init() {
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
  els.platformsTableBody?.addEventListener("click", handlePlatformTableClick);
  THEME_QUERY.addEventListener("change", handleThemeChange);

  els.connectModal?.addEventListener("click", (event) => {
    if (event.target === els.connectModal) {
      closeConnectModal();
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
    const themeIcon = isDark ? THEME_ICON.moon : THEME_ICON.sun;
    els.themeToggleButton.innerHTML = `<span aria-hidden="true"><img src="${themeIcon}" alt="" /></span>`;
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
      <tr>
        <td colspan="3" class="muted">Loading platforms...</td>
      </tr>
    `;
  }
}

async function hydratePage() {
  clearNotice(els.globalError);
  clearNotice(els.platformsError);

  try {
    const playerInfo = await api.getInfoFromSession();
    state.player = playerInfo.info;
    renderProfile(state.player);

    const accountsResult = await Promise.resolve(
      api.listConnectedAccounts(),
    ).then(
      (value) => ({ status: "fulfilled", value }),
      (reason) => ({ status: "rejected", reason }),
    );

    if (accountsResult.status === "fulfilled") {
      state.connectedAccounts = accountsResult.value.connected_accounts || [];
      renderPlatformRows(state.connectedAccounts);
    } else {
      state.connectedAccounts = [];
      renderPlatformRows([]);
      showNotice(els.platformsError, readableError(accountsResult.reason));
    }
  } catch (error) {
    handlePageError(error);
  }
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

function renderPlatformRows(accounts) {
  if (!els.platformsTableBody) {
    return;
  }

  const linkedProviders = new Set(
    accounts.map((account) => normalizeProviderKey(account.provider)),
  );

  const mode = getThemeMode();
  els.platformsTableBody.innerHTML = PLATFORM_KEYS.map((platformKey) => {
    const label = PLATFORM_LABELS[platformKey] || platformKey;
    const linked = linkedProviders.has(platformKey);
    const canUnlink = platformKey !== "credentials";
    const iconPath = PLATFORM_ICON_BY_MODE[platformKey]?.[mode] || null;
    const fallback = escapeHtml(label.slice(0, 2).toUpperCase());
    const iconMarkup = iconPath
      ? `<span class="platform-name__icon provider-icon provider-icon--asset"><img class="provider-icon__img" src="${iconPath}" alt="" /></span>`
      : `<span class="platform-name__icon provider-icon"><span class="provider-icon__fallback">${fallback}</span></span>`;
    return `
      <tr>
        <td>
          <span class="platform-name">${iconMarkup}<span>${escapeHtml(label)}</span></span>
        </td>
        <td>
          <span class="status-chip ${linked ? "status-chip--linked" : "status-chip--not-linked"}">
            ${linked ? "Linked" : "Not linked"}
          </span>
        </td>
        <td>
          ${linked ? renderLinkedAction(platformKey, canUnlink) : `<button class="button button--small" type="button" data-link-platform="${escapeHtml(platformKey)}">Link</button>`}
        </td>
      </tr>
    `;
  }).join("");
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
    unlinkPlatform(unlinkPlatformKey, button);
  }
}

function normalizeProviderKey(provider) {
  const key = String(provider || "").toLowerCase();
  if (key === "epic") {
    return "epic_games";
  }
  return key;
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

    if (lease.code && els.connectQrImage) {
      els.connectQrImage.src = buildProviderQrSource(lease.code, platformKey);
      els.connectQrImage.classList.remove("hidden");
    }

    if (els.connectLink) {
      els.connectLink.href = appendProviderQuery(
        lease.redirect_uri || "#",
        platformKey,
      );
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

function buildProviderQrSource(code, provider) {
  const safeCode = encodeURIComponent(String(code || ""));
  const safeProvider = encodeURIComponent(String(provider || ""));
  return `http://auth.game/qr/${safeCode}.png?provider=${safeProvider}`;
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

async function unlinkPlatform(platformKey, button) {
  if (platformKey === "credentials") {
    showNotice(els.platformsError, "Credentials cannot be unlinked.");
    return;
  }

  clearNotice(els.platformsError);
  const provider = toDetachProvider(platformKey);
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Unlinking...";

  try {
    await api.detachProvider(provider);
    const result = await api.listConnectedAccounts();
    state.connectedAccounts = result.connected_accounts || [];
    renderPlatformRows(state.connectedAccounts);
  } catch (error) {
    if (isSessionError(error)) {
      signOut();
      return;
    }

    showNotice(els.platformsError, readableError(error));
  } finally {
    button.disabled = false;
    button.textContent = originalText;
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

  const mode = getThemeMode();
  els.copyUidButton.innerHTML = `<span aria-hidden="true"><img src="${COPY_ICON_BY_MODE.success[mode]}" alt="" /></span>`;

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

  const mode = getThemeMode();
  els.copyUidButton.innerHTML = `<span aria-hidden="true"><img src="${COPY_ICON_BY_MODE.default[mode]}" alt="" /></span>`;
}

function updateCopyUidButtonIconForTheme() {
  if (!els.copyUidButton) {
    return;
  }

  const mode = getThemeMode();
  const iconSet = state.copyUidButtonTimerId
    ? COPY_ICON_BY_MODE.success
    : COPY_ICON_BY_MODE.default;

  els.copyUidButton.innerHTML = `<span aria-hidden="true"><img src="${iconSet[mode]}" alt="" /></span>`;
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
