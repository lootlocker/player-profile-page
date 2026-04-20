import { createApiClient } from "../api/client.js";
import { CONFIG } from "../core/config.js";
import { clearSessionToken, getSessionToken } from "../api/session.js";
import {
  clearNotice,
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
  light: "styles/logo-lightmode.svg",
  dark: "styles/logo-darkmode.svg",
};
const COPY_ICON = "📋";
const COPY_SUCCESS_ICON = "✓";

const state = {
  sessionToken: getSessionToken(),
  player: null,
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
  settingsPlayerId: document.getElementById("settingsPlayerId"),
  settingsPublicUid: document.getElementById("settingsPublicUid"),
  settingsJoinedAt: document.getElementById("settingsJoinedAt"),
  settingsLastSeenAt: document.getElementById("settingsLastSeenAt"),
  passwordResetForm: document.getElementById("passwordResetForm"),
  settingsEmailInput: document.getElementById("settingsEmailInput"),
  passwordResetButton: document.getElementById("passwordResetButton"),
  passwordResetStatus: document.getElementById("passwordResetStatus"),
  brandLogo: document.getElementById("brandLogo"),
  themeToggleButton: document.getElementById("themeToggleButton"),
};

function init() {
  syncTheme(resolveInitialTheme());

  if (!state.sessionToken) {
    window.location.href = "login.html";
    return;
  }

  bindEvents();
  showLoadingState();
  hydrateProfile();
}

function bindEvents() {
  els.logoutButton.addEventListener("click", signOut);
  els.themeToggleButton.addEventListener("click", toggleThemePreference);
  els.copyUidButton.addEventListener("click", handleCopyUid);
  els.passwordResetForm.addEventListener("submit", handlePasswordReset);
  THEME_QUERY.addEventListener("change", handleThemeChange);
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
  if (els.settingsPlayerId) {
    els.settingsPlayerId.textContent = "-";
  }
  if (els.settingsPublicUid) {
    els.settingsPublicUid.textContent = "-";
  }
  if (els.settingsJoinedAt) {
    els.settingsJoinedAt.textContent = "Unknown";
  }
  if (els.settingsLastSeenAt) {
    els.settingsLastSeenAt.textContent = "Unknown";
  }
  els.copyUidButton.disabled = true;
  resetCopyUidButtonIcon();
  clearCopyUidStatus();
}

async function hydrateProfile() {
  clearNotice(els.globalError);

  try {
    const playerInfo = await api.getInfoFromSession();
    state.player = playerInfo.info;

    renderProfile(state.player);
    renderSettings(state.player);

    const publicUid = state.player.public_uid;
    const [friendsResult, followersResult, followingResult] =
      await Promise.allSettled([
        api.listFriends(),
        api.listFollowers(publicUid),
        api.listFollowing(publicUid),
      ]);

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
  els.copyUidButton.disabled = !profile.public_uid;
  resetCopyUidButtonIcon();
  clearCopyUidStatus();
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

function renderSettings(profile) {
  const playerId = profile.player_id ?? profile.id ?? "-";
  const publicUid = profile.public_uid || "-";
  const joinedAt =
    profile.player_created_at || profile.created_at || profile.createdAt;
  const lastSeenAt =
    profile.last_seen_at ||
    profile.last_seen ||
    profile.last_login ||
    profile.last_login_at ||
    profile.updated_at;
  const email = profile.email || profile.player_email || "";

  if (els.settingsPlayerId) {
    els.settingsPlayerId.textContent = String(playerId);
  }
  if (els.settingsPublicUid) {
    els.settingsPublicUid.textContent = publicUid;
  }
  if (els.settingsJoinedAt) {
    els.settingsJoinedAt.textContent = formatDateTime(joinedAt);
  }
  if (els.settingsLastSeenAt) {
    els.settingsLastSeenAt.textContent = formatDateTime(lastSeenAt);
  }

  if (els.settingsEmailInput && email && !els.settingsEmailInput.value.trim()) {
    els.settingsEmailInput.value = email;
  }
}

async function handlePasswordReset(event) {
  event.preventDefault();
  clearPasswordResetStatus();

  const email = els.settingsEmailInput.value.trim();
  if (!email) {
    showPasswordResetStatus("Please enter your account email.", true);
    return;
  }

  const originalText = els.passwordResetButton.textContent;
  els.passwordResetButton.disabled = true;
  els.passwordResetButton.textContent = "Sending...";

  try {
    await api.requestPasswordReset(email);
    showPasswordResetStatus(
      "Password reset email sent. Check your inbox.",
      false,
    );
  } catch (error) {
    showPasswordResetStatus(readableError(error), true);
  } finally {
    els.passwordResetButton.disabled = false;
    els.passwordResetButton.textContent = originalText;
  }
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

function signOut() {
  state.sessionToken = null;
  state.player = null;
  clearSessionToken();
  window.location.href = "login.html";
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
  if (state.copyUidStatusTimerId) {
    window.clearTimeout(state.copyUidStatusTimerId);
    state.copyUidStatusTimerId = null;
  }

  els.copyUidStatus.textContent = "";
  els.copyUidStatus.classList.add("hidden");
  els.copyUidStatus.classList.remove("notice--error", "notice--success");
}

function showPasswordResetStatus(text, isError) {
  els.passwordResetStatus.textContent = text;
  els.passwordResetStatus.classList.remove("hidden");
  els.passwordResetStatus.classList.toggle("notice--error", isError);
  els.passwordResetStatus.classList.toggle("notice--success", !isError);
}

function clearPasswordResetStatus() {
  els.passwordResetStatus.textContent = "";
  els.passwordResetStatus.classList.add("hidden");
  els.passwordResetStatus.classList.remove("notice--error", "notice--success");
}

function setConnectLoading(isLoading) {
  if (!els.connectLoading) {
    return;
  }

  els.connectLoading.classList.toggle("hidden", !isLoading);
}

init();
