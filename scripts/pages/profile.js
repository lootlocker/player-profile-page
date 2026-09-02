import { createApiClient } from "../api/client.js";
import { CONFIG } from "../config.js";
import { getAccountEmail, getSessionToken } from "../api/session.js";
import {
  applyCustomScripts,
  applyCustomStylesheets,
  clearNotice,
  ensureRequiredConfigOrRenderError,
  isSessionError,
  readableError,
  showNotice,
} from "../utils.js";
import {
  bindHeaderEvents,
  injectHeader,
  renderProfile,
  setHeaderPlayer,
  showHeaderLoadingState,
  signOut,
  syncTheme,
  resolveInitialTheme,
} from "../header.js";
import { navTemplate } from "../templates/nav.js";

const state = {
  sessionToken: getSessionToken(),
  player: null,
  playerName: null,
};

const api = createApiClient(CONFIG, () => state.sessionToken);

const els = {
  globalError: document.getElementById("globalError"),
  settingsPlayerId: document.getElementById("settingsPlayerId"),
  settingsPublicUid: document.getElementById("settingsPublicUid"),
  settingsJoinedAt: document.getElementById("settingsJoinedAt"),
  settingsLastSeenAt: document.getElementById("settingsLastSeenAt"),
  settingsEmail: document.getElementById("settingsEmail"),
  passwordResetForm: document.getElementById("passwordResetForm"),
  passwordResetButton: document.getElementById("passwordResetButton"),
  passwordResetStatus: document.getElementById("passwordResetStatus"),
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

  injectHeader("");
  const navEl = document.querySelector("nav-placeholder");
  if (navEl) {
    navEl.outerHTML = navTemplate({
      activePage: "profile",
      modules: CONFIG.modules,
    });
  }

  applyCustomScripts(CONFIG.customScripts);
  applyCustomStylesheets(CONFIG.customStylesheets);
  syncTheme(resolveInitialTheme());

  if (!state.sessionToken) {
    window.location.href = "login.html";
    return;
  }

  bindHeaderEvents("login.html");
  bindEvents();
  showHeaderLoadingState();
  hydrateProfile();
}

function bindEvents() {
  els.passwordResetForm.addEventListener("submit", handlePasswordReset);
  els.playerNameEditButton.addEventListener("click", handlePlayerNameEdit);
  els.playerNameForm.addEventListener("submit", handlePlayerNameSave);
  els.playerNameCancelButton.addEventListener("click", handlePlayerNameCancel);
  els.playerNameInput.addEventListener("keydown", handlePlayerNameInputKeydown);
}

function showLoadingState() {
  showHeaderLoadingState();
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

    setHeaderPlayer(state.player);
    renderProfile(state.player, state.playerName);
    renderSettings(state.player);
    renderPlayerName(state.playerName);
  } catch (error) {
    handlePageError(error);
  }
}

function handlePageError(error) {
  if (isSessionError(error)) {
    signOut("login.html");
    return;
  }

  showNotice(els.globalError, readableError(error));
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

init();
