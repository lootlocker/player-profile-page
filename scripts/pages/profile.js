import { createApiClient } from "../api/client.js";
import { CONFIG } from "../config.js";
import {
  clearSessionToken,
  getAccountEmail,
  getSessionToken,
} from "../api/session.js";
import {
  applyCustomScripts,
  applyCustomStylesheets,
  clearNotice,
  ensureRequiredConfigOrRenderError,
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
  light: "styles/assets/logo-lightmode.svg",
  dark: "styles/assets/logo-darkmode.svg",
};

const state = {
  sessionToken: getSessionToken(),
  player: null,
  playerName: null,
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
  settingsPlayerId: document.getElementById("settingsPlayerId"),
  settingsPublicUid: document.getElementById("settingsPublicUid"),
  settingsJoinedAt: document.getElementById("settingsJoinedAt"),
  settingsLastSeenAt: document.getElementById("settingsLastSeenAt"),
  settingsEmail: document.getElementById("settingsEmail"),
  passwordResetForm: document.getElementById("passwordResetForm"),
  passwordResetButton: document.getElementById("passwordResetButton"),
  passwordResetStatus: document.getElementById("passwordResetStatus"),
  brandLogo: document.getElementById("brandLogo"),
  themeToggleButton: document.getElementById("themeToggleButton"),
  settingsPlayerName: document.getElementById("settingsPlayerName"),
  playerNameEditButton: document.getElementById("playerNameEditButton"),
  playerNameEditRow: document.getElementById("playerNameEditRow"),
  playerNameForm: document.getElementById("playerNameForm"),
  playerNameInput: document.getElementById("playerNameInput"),
  playerNameSaveButton: document.getElementById("playerNameSaveButton"),
  playerNameCancelButton: document.getElementById("playerNameCancelButton"),
  playerNameStatus: document.getElementById("playerNameStatus"),
};

function init() {
  if (!ensureRequiredConfigOrRenderError(CONFIG)) {
    return;
  }

  applyCustomScripts(CONFIG.customScripts);
  applyCustomStylesheets(CONFIG.customStylesheets);
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
  els.playerNameEditButton.addEventListener("click", handlePlayerNameEdit);
  els.playerNameForm.addEventListener("submit", handlePlayerNameSave);
  els.playerNameCancelButton.addEventListener("click", handlePlayerNameCancel);
  els.playerNameInput.addEventListener("keydown", handlePlayerNameInputKeydown);
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
    const themeIcon = isDark ? "moon" : "sun";
    els.themeToggleButton.innerHTML = `<span class="ui-icon ui-icon--${themeIcon}" aria-hidden="true"></span>`;
    els.themeToggleButton.setAttribute("aria-label", nextThemeLabel);
    els.themeToggleButton.setAttribute("title", nextThemeLabel);
  }

  if (els.brandLogo) {
    els.brandLogo.src = isDark ? LOGO_BY_THEME.dark : LOGO_BY_THEME.light;
  }

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
  if (els.settingsEmail) {
    els.settingsEmail.textContent = "Unknown";
  }
  els.copyUidButton.disabled = true;
  resetCopyUidButtonIcon();
  clearCopyUidStatus();
  if (els.settingsPlayerName) {
    els.settingsPlayerName.textContent = "-";
  }
}

async function hydrateProfile() {
  clearNotice(els.globalError);

  try {
    const [playerInfoResult, playerNameResult] = await Promise.allSettled([
      api.getInfoFromSession(),
      api.getPlayerName(),
    ]);

    if (playerInfoResult.status === "rejected") {
      throw playerInfoResult.reason;
    }

    state.player = playerInfoResult.value.info;
    state.playerName =
      playerNameResult.status === "fulfilled"
        ? playerNameResult.value.name || null
        : null;

    renderProfile(state.player, state.playerName);
    renderSettings(state.player);
    renderPlayerName(state.playerName);
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

function renderProfile(profile, playerName) {
  const displayName =
    playerName || profile.name || profile.public_uid || "Player";
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

  const iconName = state.copyUidButtonTimerId ? "check" : "copy";
  els.copyUidButton.innerHTML = `<span class="ui-icon ui-icon--${iconName}" aria-hidden="true"></span>`;
}

function getThemeMode() {
  return document.documentElement.classList.contains(THEME_ROOT_CLASS)
    ? "dark"
    : "light";
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
  const playerEmail = resolveAccountEmail(profile);

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
    els.settingsLastSeenAt.textContent = lastSeenAt
      ? formatDateTime(lastSeenAt)
      : "-";
  }
  if (els.settingsEmail) {
    els.settingsEmail.textContent = playerEmail || "Unknown";
  }
}

function renderPlayerName(name) {
  if (els.settingsPlayerName) {
    els.settingsPlayerName.textContent = name || "-";
  }
}

function handlePlayerNameEdit() {
  els.playerNameInput.value = state.playerName || "";
  els.playerNameEditRow.classList.remove("hidden");
  els.settingsPlayerName.classList.add("hidden");
  els.playerNameEditButton.classList.add("hidden");
  clearPlayerNameStatus();
  els.playerNameInput.focus();
}

function handlePlayerNameCancel() {
  els.playerNameEditRow.classList.add("hidden");
  els.settingsPlayerName.classList.remove("hidden");
  els.playerNameEditButton.classList.remove("hidden");
  clearPlayerNameStatus();
}

function handlePlayerNameInputKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }

  event.preventDefault();
  handlePlayerNameCancel();
}

async function handlePlayerNameSave(event) {
  event.preventDefault();
  const name = els.playerNameInput.value.trim();
  if (!name) {
    showPlayerNameStatus("Player name cannot be empty.", true);
    return;
  }

  setPlayerNameEditBusy(true);

  try {
    const result = await api.setPlayerName(name);
    state.playerName = result.name;
    renderPlayerName(state.playerName);
    renderProfile(state.player, state.playerName);
    handlePlayerNameCancel();
  } catch (error) {
    showPlayerNameStatus(readableError(error), true);
  } finally {
    setPlayerNameEditBusy(false);
  }
}

function setPlayerNameEditBusy(isBusy) {
  els.playerNameSaveButton.disabled = isBusy;
  els.playerNameCancelButton.disabled = isBusy;
  els.playerNameInput.disabled = isBusy;
}

function showPlayerNameStatus(text, isError) {
  els.playerNameStatus.textContent = text;
  els.playerNameStatus.classList.remove("hidden");
  els.playerNameStatus.classList.toggle("notice--error", isError);
  els.playerNameStatus.classList.toggle("notice--success", !isError);
}

function clearPlayerNameStatus() {
  els.playerNameStatus.textContent = "";
  els.playerNameStatus.classList.add("hidden");
  els.playerNameStatus.classList.remove("notice--error", "notice--success");
}

async function handlePasswordReset(event) {
  event.preventDefault();
  clearPasswordResetStatus();

  const email = resolveAccountEmail(state.player);
  if (!email) {
    showPasswordResetStatus("No account email found for password reset.", true);
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

function resolveAccountEmail(profile) {
  return String(
    profile?.player_identifier ||
      profile?.email ||
      profile?.player_email ||
      profile?.identifier ||
      getAccountEmail() ||
      "",
  ).trim();
}

function setConnectLoading(isLoading) {
  if (!els.connectLoading) {
    return;
  }

  els.connectLoading.classList.toggle("hidden", !isLoading);
}

init();
