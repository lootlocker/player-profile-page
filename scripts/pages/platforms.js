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
  light: "../styles/logo-lightmode.svg",
  dark: "../styles/logo-darkmode.svg",
};
const COPY_ICON = "📋";
const COPY_SUCCESS_ICON = "✓";

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

const PLATFORM_KEYS = [
  "steam",
  "discord",
  "epic_games",
  "credentials",
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
  friendsCount: document.getElementById("friendsCount"),
  followersCount: document.getElementById("followersCount"),
  followingCount: document.getElementById("followingCount"),
  platformsError: document.getElementById("platformsError"),
  platformsTableBody: document.getElementById("platformsTableBody"),
  connectModal: document.getElementById("connectModal"),
  connectLoading: document.getElementById("connectLoading"),
  connectQrImage: document.getElementById("connectQrImage"),
  connectLink: document.getElementById("connectLink"),
  connectStatus: document.getElementById("connectStatus"),
  connectDoneButton: document.getElementById("connectDoneButton"),
  connectCancelButton: document.getElementById("connectCancelButton"),
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
  els.connectCancelButton?.addEventListener("click", closeConnectModal);
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
    els.themeToggleButton.innerHTML = `<span aria-hidden="true">${isDark ? "☀" : "🌙"}</span>`;
    els.themeToggleButton.setAttribute("aria-label", nextThemeLabel);
    els.themeToggleButton.setAttribute("title", nextThemeLabel);
  }

  if (els.brandLogo) {
    els.brandLogo.src = isDark ? LOGO_BY_THEME.dark : LOGO_BY_THEME.light;
  }
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

    const publicUid = state.player.public_uid;
    const [accountsResult, friendsResult, followersResult, followingResult] =
      await Promise.allSettled([
        api.listConnectedAccounts(),
        api.listFriends(),
        api.listFollowers(publicUid),
        api.listFollowing(publicUid),
      ]);

    if (accountsResult.status === "fulfilled") {
      state.connectedAccounts = accountsResult.value.connected_accounts || [];
      renderPlatformRows(state.connectedAccounts);
    } else {
      state.connectedAccounts = [];
      renderPlatformRows([]);
      showNotice(els.platformsError, readableError(accountsResult.reason));
    }

    handleFriendsResult(friendsResult);
    handleFollowersResult(followersResult);
    handleFollowingResult(followingResult);
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

  els.platformsTableBody.innerHTML = PLATFORM_KEYS.map((platformKey) => {
    const label = PLATFORM_LABELS[platformKey] || platformKey;
    const linked = linkedProviders.has(platformKey);
    return `
      <tr>
        <td>${escapeHtml(label)}</td>
        <td>
          <span class="status-chip ${linked ? "status-chip--linked" : "status-chip--not-linked"}">
            ${linked ? "Linked" : "Not linked"}
          </span>
        </td>
        <td>
          ${linked ? "" : `<button class="button button--small" type="button" data-link-platform="${escapeHtml(platformKey)}">Link</button>`}
        </td>
      </tr>
    `;
  }).join("");
}

function handlePlatformTableClick(event) {
  const button = event.target.closest("[data-link-platform]");
  if (!button) {
    return;
  }

  openConnectModal();
}

function normalizeProviderKey(provider) {
  const key = String(provider || "").toLowerCase();
  if (key === "epic") {
    return "epic_games";
  }
  return key;
}

async function openConnectModal() {
  state.connectLease = null;
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

    if (lease.redirect_uri_qr && els.connectQrImage) {
      els.connectQrImage.src = normalizeQrSource(lease.redirect_uri_qr);
      els.connectQrImage.classList.remove("hidden");
    }

    if (els.connectLink) {
      els.connectLink.href = lease.redirect_uri || "#";
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

function normalizeQrSource(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  if (raw.startsWith("data:")) {
    return raw;
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const compact = raw.replace(/\s+/g, "");
  const isBase64Payload = /^[A-Za-z0-9+/=]+$/.test(compact);
  if (isBase64Payload) {
    return `data:image/png;base64,${compact}`;
  }

  return raw;
}

function handleFriendsResult(result) {
  if (result.status === "fulfilled") {
    const friends = result.value.friends || [];
    els.friendsCount.textContent = String(friends.length);
    return;
  }

  els.friendsCount.textContent = "0";
}

function handleFollowersResult(result) {
  if (result.status === "fulfilled") {
    const followers = result.value.followers || [];
    els.followersCount.textContent = String(
      result.value.pagination?.total ?? followers.length,
    );
    return;
  }

  els.followersCount.textContent = "0";
}

function handleFollowingResult(result) {
  if (result.status === "fulfilled") {
    const following = result.value.followers || [];
    els.followingCount.textContent = String(
      result.value.pagination?.total ?? following.length,
    );
    return;
  }

  els.followingCount.textContent = "0";
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

  els.copyUidButton.innerHTML = `<span aria-hidden="true">${COPY_SUCCESS_ICON}</span>`;

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

  els.copyUidButton.innerHTML = `<span aria-hidden="true">${COPY_ICON}</span>`;
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
