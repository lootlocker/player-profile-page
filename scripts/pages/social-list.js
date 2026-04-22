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

const state = {
  sessionToken: getSessionToken(),
  player: null,
  copyUidStatusTimerId: null,
  copyUidButtonTimerId: null,
  pendingFriendAction: null,
};

const pageType = document.body.dataset.socialType || "friends";
const pageTitle = document.body.dataset.socialTitle || "Friends";

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

const api = createApiClient(CONFIG, () => state.sessionToken);

const els = {
  logoutButton: document.getElementById("logoutButton"),
  globalError: document.getElementById("globalError"),
  avatar: document.getElementById("avatar"),
  playerName: document.getElementById("playerName"),
  playerUid: document.getElementById("playerUid"),
  copyUidButton: document.getElementById("copyUidButton"),
  copyUidStatus: document.getElementById("copyUidStatus"),
  listTitle: document.getElementById("listTitle"),
  listCount: document.getElementById("listCount"),
  listError: document.getElementById("listError"),
  list: document.getElementById("socialList"),
  sendFriendRequestButton: document.getElementById("sendFriendRequestButton"),
  friendRequestModal: document.getElementById("friendRequestModal"),
  friendRequestForm: document.getElementById("friendRequestForm"),
  friendRequestPublicUidInput: document.getElementById(
    "friendRequestPublicUidInput",
  ),
  friendRequestStatus: document.getElementById("friendRequestStatus"),
  friendRequestSubmitButton: document.getElementById(
    "friendRequestSubmitButton",
  ),
  friendRequestCancelButton: document.getElementById(
    "friendRequestCancelButton",
  ),
  friendActionModal: document.getElementById("friendActionModal"),
  friendActionCloseButton: document.getElementById("friendActionCloseButton"),
  friendActionTitle: document.getElementById("friendActionModalTitle"),
  friendActionMessage: document.getElementById("friendActionMessage"),
  friendActionStatus: document.getElementById("friendActionStatus"),
  friendActionCancelButton: document.getElementById("friendActionCancelButton"),
  friendActionConfirmButton: document.getElementById(
    "friendActionConfirmButton",
  ),
  pendingRequestsSection: document.getElementById("pendingRequestsSection"),
  incomingCount: document.getElementById("incomingCount"),
  outgoingCount: document.getElementById("outgoingCount"),
  incomingList: document.getElementById("incomingList"),
  outgoingList: document.getElementById("outgoingList"),
  socialActionStatus: document.getElementById("socialActionStatus"),
  brandLogo: document.getElementById("brandLogo"),
  themeToggleButton: document.getElementById("themeToggleButton"),
};

function init() {
  syncTheme(resolveInitialTheme());

  if (!state.sessionToken) {
    window.location.href = "../login.html";
    return;
  }

  els.listTitle.textContent = pageTitle;
  bindEvents();
  showLoadingState();
  hydratePage();
}

function bindEvents() {
  els.logoutButton.addEventListener("click", signOut);
  els.themeToggleButton?.addEventListener("click", toggleThemePreference);
  els.copyUidButton?.addEventListener("click", handleCopyUid);
  THEME_QUERY.addEventListener("change", handleThemeChange);

  if (pageType === "friends" && els.sendFriendRequestButton) {
    els.sendFriendRequestButton.addEventListener(
      "click",
      openFriendRequestModal,
    );
    els.list?.addEventListener("click", handleSocialListClick);
    els.friendRequestForm?.addEventListener("submit", submitFriendRequest);
    els.friendRequestCancelButton?.addEventListener(
      "click",
      closeFriendRequestModal,
    );
    els.friendActionCloseButton?.addEventListener(
      "click",
      closeFriendActionModal,
    );
    els.friendActionCancelButton?.addEventListener(
      "click",
      closeFriendActionModal,
    );
    els.friendActionConfirmButton?.addEventListener(
      "click",
      confirmFriendAction,
    );
    els.friendRequestModal?.addEventListener("click", (event) => {
      if (event.target === els.friendRequestModal) {
        closeFriendRequestModal();
      }
    });
    els.friendActionModal?.addEventListener("click", (event) => {
      if (event.target === els.friendActionModal) {
        closeFriendActionModal();
      }
    });
  }
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
  if (els.copyUidButton) {
    els.copyUidButton.disabled = true;
  }
  resetCopyUidButtonIcon();
  clearCopyUidStatus();
  if (pageType === "friends") {
    els.list.innerHTML = `<div class="platform-row"><div class="platform-cell muted table-empty">Loading friends...</div></div>`;
  } else if (pageType === "followers") {
    els.list.innerHTML = `<div class="platform-row"><div class="platform-cell muted table-empty">Loading followers...</div></div>`;
  } else if (pageType === "following") {
    els.list.innerHTML = `<div class="platform-row"><div class="platform-cell muted table-empty">Loading following...</div></div>`;
  } else {
    els.list.innerHTML = `<li class="muted">Loading ${escapeHtml(pageTitle.toLowerCase())}...</li>`;
  }
}

async function hydratePage() {
  clearNotice(els.globalError);
  clearNotice(els.listError);

  try {
    const info = await api.getInfoFromSession();
    state.player = info.info;
    renderProfile(state.player);

    if (pageType === "friends") {
      await hydrateFriendsPage(state.player.public_uid);
      return;
    }

    await hydrateFollowerLikePage(state.player.public_uid);
  } catch (error) {
    handlePageError(error);
  }
}

async function hydrateFriendsPage(publicUid) {
  const [friendsResult, incomingResult, outgoingResult] =
    await Promise.allSettled([
      api.listFriends(),
      api.listIncomingFriendRequests(),
      api.listOutgoingFriendRequests(),
    ]);

  if (friendsResult.status !== "fulfilled") {
    showNotice(els.listError, "Unable to load friends.");
    els.listCount.textContent = "0";
    renderFriendsTablePlaceholder("No friends found.");
    return;
  }

  clearNotice(els.listError);
  const friends = extractSocialRows(friendsResult.value);
  const incomingRequests =
    incomingResult.status === "fulfilled"
      ? extractSocialRows(incomingResult.value)
      : [];
  const outgoingRequests =
    outgoingResult.status === "fulfilled"
      ? extractSocialRows(outgoingResult.value)
      : [];

  els.listCount.textContent = String(friends.length);
  renderFriendList(friends, incomingRequests, outgoingRequests);
  renderPendingRequests(incomingRequests, outgoingRequests);
}

async function hydrateFollowerLikePage(publicUid) {
  const activeResult = await Promise.resolve(
    pageType === "followers"
      ? api.listFollowers(publicUid)
      : api.listFollowing(publicUid),
  ).then(
    (value) => ({ status: "fulfilled", value }),
    (reason) => ({ status: "rejected", reason }),
  );

  if (activeResult.status !== "fulfilled") {
    showNotice(els.listError, `Unable to load ${pageTitle.toLowerCase()}.`);
    els.listCount.textContent = "0";
    renderListPlaceholder(`No ${pageTitle.toLowerCase()} found.`);
    return;
  }

  clearNotice(els.listError);
  const rows = activeResult.value.followers || [];
  els.listCount.textContent = String(
    activeResult.value.pagination?.total ?? rows.length,
  );
  renderFollowerLikeList(rows);
}

function handlePageError(error) {
  if (isSessionError(error)) {
    signOut();
    return;
  }

  showNotice(els.globalError, readableError(error));
  showNotice(els.listError, `Unable to load ${pageTitle.toLowerCase()}.`);
  els.listCount.textContent = "0";
  renderListPlaceholder(`No ${pageTitle.toLowerCase()} found.`);
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

function renderFriendList(
  friends,
  incomingRequests = [],
  outgoingRequests = [],
) {
  const friendKeys = buildIdentitySet(friends);
  const incomingKeys = buildIdentitySet(incomingRequests);
  const outgoingKeys = buildIdentitySet(outgoingRequests);
  const merged = mergeSocialRows(friends, incomingRequests, outgoingRequests);

  if (!merged.length) {
    renderFriendsTablePlaceholder("No friends found.");
    return;
  }

  els.list.innerHTML = merged
    .map((friend) => {
      const { name, uid, playerId, identityKeys } =
        normalizeSocialPerson(friend);
      const hasIncoming = identityKeys.some((key) => incomingKeys.has(key));
      const hasOutgoing = identityKeys.some((key) => outgoingKeys.has(key));
      const isFriend = identityKeys.some((key) => friendKeys.has(key));
      const pendingBadges = [
        hasIncoming
          ? `<span class="pill pending-badge pending-badge--incoming">Incoming</span>`
          : "",
        hasOutgoing
          ? `<span class="pill pending-badge pending-badge--outgoing">Outgoing</span>`
          : "",
      ]
        .filter(Boolean)
        .join("");

      const statusChipClass = friend.online
        ? "status-chip status-chip--linked"
        : "status-chip status-chip--not-linked";
      const statusLabel = friend.online ? "Online" : "Offline";
      const escapedPlayerId = playerId ? escapeHtml(String(playerId)) : "";
      const escapedPlayerName = escapeHtml(name);
      const primaryAction =
        isFriend && playerId
          ? `<button class="button button--ghost button--small" type="button" data-remove-friend-id="${escapedPlayerId}" data-player-name="${escapedPlayerName}">Remove</button>`
          : hasIncoming && playerId
            ? `<button class="button button--small" type="button" data-accept-friend-id="${escapedPlayerId}">Accept</button>`
            : hasOutgoing && playerId
              ? `<button class="button button--ghost button--small" type="button" data-cancel-friend-id="${escapedPlayerId}">Cancel request</button>`
              : "";
      const blockAction =
        playerId && !isFriend
          ? `<button class="button button--ghost button--small button--danger" type="button" data-block-player-id="${escapedPlayerId}" data-player-name="${escapedPlayerName}">Block</button>`
          : isFriend && playerId
            ? `<button class="button button--ghost button--small button--danger" type="button" data-block-player-id="${escapedPlayerId}" data-player-name="${escapedPlayerName}">Block</button>`
            : "";
      const actionButtons = [primaryAction, blockAction]
        .filter(Boolean)
        .join("");

      return `
      <div class="platform-row">
        <div class="platform-cell">${escapeHtml(name)}</div>
        <div class="platform-cell muted">${escapeHtml(uid)}</div>
        <div class="platform-cell">
          <div class="list-item__badges">
            ${pendingBadges}
            <span class="${statusChipClass}">${escapeHtml(statusLabel)}</span>
          </div>
        </div>
        <div class="platform-cell platform-cell--action">${actionButtons ? `<div class="row-actions">${actionButtons}</div>` : ""}</div>
      </div>
    `;
    })
    .join("");
}

function renderFriendsTablePlaceholder(text) {
  if (pageType !== "friends") {
    renderListPlaceholder(text);
    return;
  }

  els.list.innerHTML = `<div class="platform-row"><div class="platform-cell muted table-empty">${escapeHtml(text)}</div></div>`;
}

function handleSocialListClick(event) {
  const button = event.target.closest(
    "[data-remove-friend-id], [data-accept-friend-id], [data-cancel-friend-id], [data-block-player-id]",
  );
  if (!button) {
    return;
  }

  const removePlayerId = button.getAttribute("data-remove-friend-id");
  if (removePlayerId) {
    openFriendActionModal(
      "remove",
      removePlayerId,
      button.getAttribute("data-player-name") || "this player",
    );
    return;
  }

  const blockPlayerId = button.getAttribute("data-block-player-id");
  if (blockPlayerId) {
    openFriendActionModal(
      "block",
      blockPlayerId,
      button.getAttribute("data-player-name") || "this player",
    );
    return;
  }

  const acceptPlayerId = button.getAttribute("data-accept-friend-id");
  if (acceptPlayerId) {
    acceptFriendRequest(acceptPlayerId, button);
    return;
  }

  const cancelPlayerId = button.getAttribute("data-cancel-friend-id");
  if (cancelPlayerId) {
    cancelFriendRequest(cancelPlayerId, button);
    return;
  }
}

function openFriendActionModal(action, playerId, playerName) {
  if (
    !action ||
    !playerId ||
    !els.friendActionModal ||
    !els.friendActionTitle ||
    !els.friendActionMessage
  ) {
    return;
  }

  state.pendingFriendAction = {
    action,
    playerId,
    playerName: playerName || "this player",
  };

  const isBlockAction = action === "block";
  els.friendActionTitle.textContent = isBlockAction
    ? "Block Player"
    : "Remove Friend";
  els.friendActionMessage.textContent = isBlockAction
    ? `Block ${playerName}? This will prevent friend interactions with this player.`
    : `Remove ${playerName} from your friends list?`;
  clearFriendActionStatus();

  if (els.friendActionConfirmButton) {
    els.friendActionConfirmButton.disabled = false;
    els.friendActionConfirmButton.textContent = isBlockAction
      ? "Block player"
      : "Remove friend";
    els.friendActionConfirmButton.classList.toggle(
      "button--danger",
      isBlockAction,
    );
  }

  els.friendActionModal.classList.remove("hidden");
}

function closeFriendActionModal() {
  if (!els.friendActionModal) {
    return;
  }

  els.friendActionModal.classList.add("hidden");
  state.pendingFriendAction = null;
  clearFriendActionStatus();

  if (els.friendActionConfirmButton) {
    els.friendActionConfirmButton.disabled = false;
    els.friendActionConfirmButton.textContent = "Confirm";
    els.friendActionConfirmButton.classList.remove("button--danger");
  }
}

async function confirmFriendAction() {
  if (!state.pendingFriendAction) {
    showFriendActionStatus("No friend action is currently selected.", true);
    return;
  }

  clearSocialActionStatus();
  clearFriendActionStatus();

  if (els.friendActionConfirmButton) {
    els.friendActionConfirmButton.disabled = true;
    els.friendActionConfirmButton.textContent =
      state.pendingFriendAction.action === "block"
        ? "Blocking..."
        : "Removing...";
  }

  const actionType = state.pendingFriendAction.action;
  const targetPlayerId = state.pendingFriendAction.playerId;

  try {
    if (actionType === "block") {
      await api.blockPlayer(targetPlayerId);
      showSocialActionStatus("Player blocked.", false);
    } else {
      await api.removeFriend(targetPlayerId);
      showSocialActionStatus("Friend removed.", false);
    }

    closeFriendActionModal();
    await hydrateFriendsPage(state.player?.public_uid);
  } catch (error) {
    if (isSessionError(error)) {
      signOut();
      return;
    }

    showFriendActionStatus(readableError(error), true);
    if (els.friendActionConfirmButton) {
      els.friendActionConfirmButton.disabled = false;
      els.friendActionConfirmButton.textContent =
        actionType === "block" ? "Block player" : "Remove friend";
    }
  }
}

async function acceptFriendRequest(playerId, button) {
  clearSocialActionStatus();
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Accepting...";

  try {
    await api.acceptFriendRequest(playerId);
    showSocialActionStatus("Friend request accepted.", false);
    await hydrateFriendsPage(state.player?.public_uid);
  } catch (error) {
    if (isSessionError(error)) {
      signOut();
      return;
    }

    showSocialActionStatus(readableError(error), true);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function cancelFriendRequest(playerId, button) {
  clearSocialActionStatus();
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Canceling...";

  try {
    await api.cancelFriendRequest(playerId);
    showSocialActionStatus("Friend request canceled.", false);
    await hydrateFriendsPage(state.player?.public_uid);
  } catch (error) {
    if (isSessionError(error)) {
      signOut();
      return;
    }

    showSocialActionStatus(readableError(error), true);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function extractSocialRows(payload) {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  if (Array.isArray(payload.info)) {
    return payload.info;
  }

  if (Array.isArray(payload.friends)) {
    return payload.friends;
  }

  if (Array.isArray(payload.requests)) {
    return payload.requests;
  }

  if (Array.isArray(payload.players)) {
    return payload.players;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  const firstArray = Object.values(payload).find(Array.isArray);
  if (Array.isArray(firstArray)) {
    return firstArray;
  }

  return [];
}

function mergeSocialRows(friends, incomingRequests, outgoingRequests) {
  const merged = [];
  const seen = new Set();
  const allRows = [...incomingRequests, ...outgoingRequests, ...friends];

  for (const row of allRows) {
    const { identityKeys } = normalizeSocialPerson(row);
    const key = identityKeys[0] || "";
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(row);
  }

  return merged;
}

function buildIdentitySet(rows) {
  const set = new Set();
  rows.forEach((row) => {
    const { identityKeys } = normalizeSocialPerson(row);
    identityKeys.forEach((key) => set.add(key));
  });
  return set;
}

function normalizeSocialPerson(row) {
  const source = row?.player || row?.requester || row?.target || row;
  const name =
    source?.name ||
    source?.player_name ||
    source?.playerName ||
    row?.player_name ||
    "Unnamed Player";
  const uid =
    source?.public_uid ||
    source?.PublicUID ||
    source?.player_public_uid ||
    row?.public_uid ||
    row?.PublicUID ||
    row?.player_public_uid ||
    "No UID";
  const playerId =
    source?.player_id ||
    source?.id ||
    source?.playerId ||
    row?.player_id ||
    row?.id ||
    row?.playerId ||
    row?.requester_player_id ||
    row?.target_player_id;

  const identityKeys = [];
  if (uid && uid !== "No UID") {
    identityKeys.push(`uid:${String(uid)}`);
  }
  if (playerId) {
    identityKeys.push(`id:${String(playerId)}`);
  }

  return { name, uid, playerId, identityKeys };
}

function renderPendingRequests(incomingRequests, outgoingRequests) {
  if (
    !els.pendingRequestsSection ||
    !els.incomingList ||
    !els.outgoingList ||
    !els.incomingCount ||
    !els.outgoingCount
  ) {
    return;
  }

  const hasAny = incomingRequests.length > 0 || outgoingRequests.length > 0;
  els.pendingRequestsSection.classList.toggle("hidden", !hasAny);
  els.incomingCount.textContent = String(incomingRequests.length);
  els.outgoingCount.textContent = String(outgoingRequests.length);

  renderPendingList(
    els.incomingList,
    incomingRequests,
    "No incoming requests.",
  );
  renderPendingList(
    els.outgoingList,
    outgoingRequests,
    "No outgoing requests.",
  );
}

function renderPendingList(targetElement, rows, emptyText) {
  if (!rows.length) {
    targetElement.innerHTML = `<li class="muted">${escapeHtml(emptyText)}</li>`;
    return;
  }

  targetElement.innerHTML = rows
    .map((row) => {
      const { name, uid } = normalizeSocialPerson(row);
      return `
      <li class="list-item">
        <div>
          <p class="list-item__title">${escapeHtml(name)}</p>
          <p class="list-item__meta">${escapeHtml(uid)}</p>
        </div>
      </li>
    `;
    })
    .join("");
}

function renderFollowerLikeList(rows) {
  if (!rows.length) {
    renderListPlaceholder(`No ${pageTitle.toLowerCase()} found.`);
    return;
  }

  els.list.innerHTML = rows
    .map((row) => {
      const uid = row.PublicUID || row.public_uid || "No UID";
      const name = row.player_name || "Unnamed Player";

      return `
      <div class="platform-row">
        <div class="platform-cell">${escapeHtml(name)}</div>
        <div class="platform-cell muted">${escapeHtml(uid)}</div>
      </div>
    `;
    })
    .join("");
}

function renderListPlaceholder(text) {
  if (pageType === "friends") {
    els.list.innerHTML = `<div class="platform-row"><div class="platform-cell muted table-empty">${escapeHtml(text)}</div></div>`;
    return;
  }

  if (pageType === "followers" || pageType === "following") {
    els.list.innerHTML = `<div class="platform-row"><div class="platform-cell muted table-empty">${escapeHtml(text)}</div></div>`;
    return;
  }

  els.list.innerHTML = `<li class="muted">${escapeHtml(text)}</li>`;
}

function openFriendRequestModal() {
  clearSocialActionStatus();
  clearFriendRequestStatus();

  if (!els.friendRequestModal || !els.friendRequestPublicUidInput) {
    return;
  }

  els.friendRequestPublicUidInput.value = "";
  els.friendRequestModal.classList.remove("hidden");
  els.friendRequestPublicUidInput.focus();
}

function closeFriendRequestModal() {
  if (!els.friendRequestModal) {
    return;
  }

  els.friendRequestModal.classList.add("hidden");
  clearFriendRequestStatus();
}

async function submitFriendRequest(event) {
  event.preventDefault();
  clearSocialActionStatus();
  clearFriendRequestStatus();

  if (!els.friendRequestPublicUidInput) {
    return;
  }

  const targetPublicUid = els.friendRequestPublicUidInput.value.trim();

  if (!targetPublicUid) {
    showFriendRequestStatus("Please enter a Public UID.", true);
    return;
  }

  if (targetPublicUid === state.player?.public_uid) {
    showFriendRequestStatus(
      "You cannot send a friend request to yourself.",
      true,
    );
    return;
  }

  if (!els.friendRequestSubmitButton) {
    return;
  }

  const originalText = els.friendRequestSubmitButton.textContent;
  els.friendRequestSubmitButton.disabled = true;
  els.friendRequestSubmitButton.textContent = "Sending...";

  try {
    const lookup = await api.lookupPlayerInfoByPublicUid(targetPublicUid);
    const targetPlayerId = extractPlayerIdFromInfoLookup(lookup);

    if (!targetPlayerId) {
      throw new Error("No player was found for that Public UID.");
    }

    await api.sendFriendRequest(targetPlayerId);
    closeFriendRequestModal();
    showSocialActionStatus("Friend request sent.", false);
  } catch (error) {
    if (isSessionError(error)) {
      signOut();
      return;
    }

    showFriendRequestStatus(readableError(error), true);
  } finally {
    els.friendRequestSubmitButton.disabled = false;
    els.friendRequestSubmitButton.textContent = originalText;
  }
}

function extractPlayerIdFromInfoLookup(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (Array.isArray(payload.info) && payload.info.length) {
    const first = payload.info[0];
    if (typeof first?.id === "string" && first.id) {
      return first.id;
    }
  }

  return null;
}

function showFriendRequestStatus(text, isError) {
  if (!els.friendRequestStatus) {
    return;
  }

  els.friendRequestStatus.textContent = text;
  els.friendRequestStatus.classList.remove("hidden");
  els.friendRequestStatus.classList.toggle("notice--error", isError);
  els.friendRequestStatus.classList.toggle("notice--success", !isError);
}

function clearFriendRequestStatus() {
  if (!els.friendRequestStatus) {
    return;
  }

  els.friendRequestStatus.textContent = "";
  els.friendRequestStatus.classList.add("hidden");
  els.friendRequestStatus.classList.remove("notice--error", "notice--success");
}

function showFriendActionStatus(text, isError) {
  if (!els.friendActionStatus) {
    return;
  }

  els.friendActionStatus.textContent = text;
  els.friendActionStatus.classList.remove("hidden");
  els.friendActionStatus.classList.toggle("notice--error", isError);
  els.friendActionStatus.classList.toggle("notice--success", !isError);
}

function clearFriendActionStatus() {
  if (!els.friendActionStatus) {
    return;
  }

  els.friendActionStatus.textContent = "";
  els.friendActionStatus.classList.add("hidden");
  els.friendActionStatus.classList.remove("notice--error", "notice--success");
}

function showSocialActionStatus(text, isError) {
  if (!els.socialActionStatus) {
    return;
  }

  els.socialActionStatus.textContent = text;
  els.socialActionStatus.classList.remove("hidden");
  els.socialActionStatus.classList.toggle("notice--error", isError);
  els.socialActionStatus.classList.toggle("notice--success", !isError);
}

function clearSocialActionStatus() {
  if (!els.socialActionStatus) {
    return;
  }

  els.socialActionStatus.textContent = "";
  els.socialActionStatus.classList.add("hidden");
  els.socialActionStatus.classList.remove("notice--error", "notice--success");
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

function signOut() {
  state.sessionToken = null;
  state.player = null;
  clearSessionToken();
  window.location.href = "../login.html";
}

init();
