import { createApiClient } from "../api/client.js";
import { CONFIG } from "../config.js";
import { getSessionToken } from "../api/session.js";
import {
  applyCustomScripts,
  applyCustomStylesheets,
  clearNotice,
  ensureRequiredConfigOrRenderError,
  escapeHtml,
  isModuleEnabled,
  isSessionError,
  readableError,
  renderModuleDisabledPage,
  showNotice,
} from "../utils.js";
import {
  bindHeaderEvents,
  getThemeMode,
  injectHeader,
  renderProfile,
  setHeaderPlayer,
  setOnThemeChange,
  showHeaderLoadingState,
  syncTheme,
  resolveInitialTheme,
  signOut,
} from "../header.js";
import { subnavTemplate } from "../templates/nav.js";

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
};

const api = createApiClient(CONFIG, () => state.sessionToken);

const els = {
  globalError: document.getElementById("globalError"),
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
};

function init() {
  if (!ensureRequiredConfigOrRenderError(CONFIG)) {
    return;
  }

  if (!isModuleEnabled(CONFIG, "platforms")) {
    renderModuleDisabledPage("../profile.html");
    return;
  }

  injectHeader("..");
  const navEl = document.querySelector("nav-placeholder");
  if (navEl) {
    navEl.outerHTML = subnavTemplate({
      activePage: "platforms",
      modules: CONFIG.modules,
    });
  }

  applyCustomScripts(CONFIG.customScripts);
  applyCustomStylesheets(CONFIG.customStylesheets);
  syncTheme(resolveInitialTheme());

  if (!state.sessionToken) {
    window.location.href = "../login.html";
    return;
  }

  bindHeaderEvents("../login.html");
  setOnThemeChange(() => {
    renderPlatformRows(state.connectedAccounts);
  });
  bindEvents();
  showHeaderLoadingState();
  hydratePage();
}

function bindEvents() {
  els.connectDoneButton?.addEventListener("click", confirmConnectedAccount);
  els.connectCloseButton?.addEventListener("click", closeConnectModal);
  els.unlinkConfirmButton?.addEventListener("click", confirmUnlinkPlatform);
  els.unlinkCancelButton?.addEventListener("click", closeUnlinkModal);
  els.unlinkCloseButton?.addEventListener("click", closeUnlinkModal);
  els.platformsTableBody?.addEventListener("click", handlePlatformTableClick);

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

function showLoadingState() {
  showHeaderLoadingState();
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
    setHeaderPlayer(state.player);
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
    signOut("../login.html");
    return;
  }

  showNotice(els.globalError, readableError(error));
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

function setConnectLoading(isLoading) {
  if (!els.connectLoading) {
    return;
  }

  els.connectLoading.classList.toggle("hidden", !isLoading);
}

init();
