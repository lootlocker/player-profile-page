import { createApiClient } from "../api/client.js";
import { CONFIG } from "../config.js";
import { clearSessionToken, getSessionToken } from "../api/session.js";
import {
  applyCustomScripts,
  applyCustomStylesheets,
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

const PLATFORM_ICON_BY_MODE = {
  steam: {
    light: "../styles/assets/platforms/steam-lightmode.svg",
    dark: "../styles/assets/platforms/steam-darkmode.svg",
  },
};

const state = {
  sessionToken: getSessionToken(),
  keys: [],
  keysLoading: true,
};

const api = createApiClient(CONFIG, () => state.sessionToken);

const els = {
  globalError: document.getElementById("globalError"),
  keysError: document.getElementById("keysError"),
  keysTableBody: document.getElementById("keysTableBody"),
};

async function init() {
  if (!ensureRequiredConfigOrRenderError(CONFIG)) {
    return;
  }

  if (!isModuleEnabled(CONFIG, "game-keys")) {
    renderModuleDisabledPage("../profile.html");
    return;
  }

  injectHeader("..");
  const navEl = document.querySelector("nav-placeholder");
  if (navEl) {
    navEl.outerHTML = subnavTemplate({
      activePage: "keys",
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
    renderKeyRows();
  });
  els.keysTableBody?.addEventListener("click", handleKeysTableClick);

  showHeaderLoadingState();
  await Promise.all([hydrateProfile(), loadKeys()]);
}

async function hydrateProfile() {
  try {
    const data = await api.getInfoFromSession();
    const player = data?.info;
    if (!player) {
      return;
    }

    setHeaderPlayer(player);
    renderProfile(player);
  } catch (error) {
    if (isSessionError(error)) {
      clearSessionToken();
      window.location.href = "../login.html";
    }
  }
}

async function loadKeys() {
  state.keysLoading = true;
  renderKeyRows();

  try {
    const data = await api.getPlatformKeys();
    state.keys = data?.platform_keys || [];
  } catch (error) {
    if (isSessionError(error)) {
      clearSessionToken();
      window.location.href = "../login.html";
      return;
    }

    showNotice(els.keysError, readableError(error));
  } finally {
    state.keysLoading = false;
    renderKeyRows();
  }
}

function renderKeyRows() {
  if (!els.keysTableBody) {
    return;
  }

  if (state.keysLoading) {
    els.keysTableBody.innerHTML = `
      <div class="platform-row">
        <div class="platform-cell table-empty muted">Loading keys...</div>
      </div>
    `;
    return;
  }

  if (!state.keys.length) {
    els.keysTableBody.innerHTML = `
      <div class="platform-row">
        <div class="platform-cell table-empty muted">No platform keys found.</div>
      </div>
    `;
    return;
  }

  const mode = getThemeMode();
  els.keysTableBody.innerHTML = state.keys
    .map((entry) => {
      const campaign = entry.campaign || {};
      const platform = String(campaign.platform || "").toLowerCase();
      const campaignName = escapeHtml(campaign.name || platform || "Unknown");
      const keyValue = escapeHtml(entry.key || "");

      const iconPath = PLATFORM_ICON_BY_MODE[platform]?.[mode] || null;
      const fallback = escapeHtml(platform.slice(0, 2).toUpperCase());
      const iconMarkup = iconPath
        ? `<span class="platform-name__icon provider-icon provider-icon--asset"><img class="provider-icon__img" src="${iconPath}" alt="" /></span>`
        : `<span class="platform-name__icon provider-icon"><span class="provider-icon__fallback">${fallback}</span></span>`;

      return `
      <div class="platform-row">
        <div class="platform-cell">
          <span class="platform-name">${iconMarkup}<span>${campaignName}</span></span>
        </div>
        <div class="platform-cell">
          <code class="key-value">${keyValue}</code>
        </div>
        <div class="platform-cell platform-cell--action">
          <button class="button button--small" type="button" data-copy-key="${escapeHtml(entry.key)}">Copy Key</button>
        </div>
      </div>
    `;
    })
    .join("");
}

function handleKeysTableClick(event) {
  const button = event.target.closest("[data-copy-key]");
  if (!button) {
    return;
  }

  const keyValue = button.getAttribute("data-copy-key");
  if (!keyValue) {
    return;
  }

  navigator.clipboard.writeText(keyValue).then(() => {
    const originalText = button.textContent;
    button.textContent = "Copied!";
    button.disabled = true;
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 2000);
  });
}

init();
