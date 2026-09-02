import { createApiClient } from "../api/client.js";
import { CONFIG } from "../config.js";
import { clearSessionToken, getSessionToken } from "../api/session.js";
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
  injectHeader,
  renderProfile,
  setHeaderPlayer,
  showHeaderLoadingState,
  syncTheme,
  resolveInitialTheme,
  signOut,
} from "../header.js";
import { subnavTemplate } from "../templates/nav.js";

const STORE_LABELS = {
  stripe_store: "Stripe",
  apple_app_store: "Apple App Store",
  google_play_store: "Google Play",
  steam_store: "Steam",
};

const STATUS_CLASSES = {
  active: "status-chip--linked",
  pending: "status-chip--pending",
  expiring: "status-chip--pending",
  expired: "status-chip--not-linked",
  canceled: "status-chip--not-linked",
  refunded: "status-chip--not-linked",
  partially_refunded: "status-chip--not-linked",
  failed: "status-chip--not-linked",
};

const state = {
  sessionToken: getSessionToken(),
  player: null,
  listings: [],
  loading: true,
  pagination: {
    previous_cursor: null,
    next_cursor: null,
    total: 0,
  },
  perPage: 50,
};

const api = createApiClient(CONFIG, () => state.sessionToken);

const els = {
  globalError: document.getElementById("globalError"),
  subscriptionsError: document.getElementById("subscriptionsError"),
  tableBody: document.getElementById("subscriptionsTableBody"),
  prevButton: document.getElementById("prevPageButton"),
  nextButton: document.getElementById("nextPageButton"),
  pageInfo: document.getElementById("pageInfo"),
};

function init() {
  if (!ensureRequiredConfigOrRenderError(CONFIG)) {
    return;
  }

  if (!isModuleEnabled(CONFIG, "subscriptions")) {
    renderModuleDisabledPage("../profile.html");
    return;
  }

  injectHeader("..");
  const navEl = document.querySelector("nav-placeholder");
  if (navEl) {
    navEl.outerHTML = subnavTemplate({
      activePage: "subscriptions",
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
  bindEvents();
  showHeaderLoadingState();
  hydratePage();
}

function bindEvents() {
  els.prevButton?.addEventListener("click", () => {
    loadEntitlements(state.pagination.previous_cursor);
  });
  els.nextButton?.addEventListener("click", () => {
    loadEntitlements(state.pagination.next_cursor);
  });
  els.tableBody?.addEventListener("click", handleTableClick);
}

function showLoadingState() {
  showHeaderLoadingState();
  if (els.tableBody) {
    els.tableBody.innerHTML = `
      <div class="platform-row">
        <div class="platform-cell table-empty muted">Loading subscriptions...</div>
      </div>
    `;
  }
}

async function hydratePage() {
  clearNotice(els.globalError);
  clearNotice(els.subscriptionsError);

  try {
    const info = await api.getInfoFromSession();
    state.player = info?.info;
    if (state.player) {
      setHeaderPlayer(state.player);
      renderProfile(state.player);
    }
  } catch (error) {
    if (isSessionError(error)) {
      clearSessionToken();
      window.location.href = "../login.html";
      return;
    }
  }

  await loadEntitlements();
}

async function loadEntitlements(cursor) {
  state.loading = true;
  renderRows();
  renderPagination();

  try {
    const data = await api.getEntitlements({
      type: "subscription",
      cursor: cursor || undefined,
      per_page: state.perPage,
    });

    state.listings = data?.listings || [];
    state.pagination = data?.pagination || {
      previous_cursor: null,
      next_cursor: null,
      total: 0,
    };
  } catch (error) {
    if (isSessionError(error)) {
      clearSessionToken();
      window.location.href = "../login.html";
      return;
    }

    const message = readableError(error).toLowerCase();
    if (message.includes("no entitlements") || message.includes("not found")) {
      state.listings = [];
    } else {
      showNotice(els.subscriptionsError, readableError(error));
      state.listings = [];
    }
  } finally {
    state.loading = false;
    renderRows();
    renderPagination();
  }
}

function renderRows() {
  if (!els.tableBody) {
    return;
  }

  if (state.loading) {
    els.tableBody.innerHTML = `
      <div class="platform-row">
        <div class="platform-cell table-empty muted">Loading subscriptions...</div>
      </div>
    `;
    return;
  }

  if (!state.listings.length) {
    els.tableBody.innerHTML = `
      <div class="platform-row">
        <div class="platform-cell table-empty muted">No subscriptions found.</div>
      </div>
    `;
    return;
  }

  els.tableBody.innerHTML = state.listings
    .map((entry) => {
      const status = String(entry.status || "").toLowerCase();
      const store = String(entry.store || "");
      const storeLabel = STORE_LABELS[store] || formatStoreLabel(store);
      const createdDate = formatDate(entry.created_at);
      const itemsCount = Array.isArray(entry.items) ? entry.items.length : 0;
      const statusClass = STATUS_CLASSES[status] || "status-chip--not-linked";
      const statusLabel = formatStatusLabel(status);

      const showCancel =
        store === "stripe_store" && status === "active" && entry.id;
      const cancelButton = showCancel
        ? `<button class="button button--small button--danger" type="button" data-cancel-entitlement-id="${escapeHtml(entry.id)}">Cancel</button>`
        : "";

      return `
      <div class="platform-row">
        <div class="platform-cell">
          <span class="status-chip ${statusClass}">${escapeHtml(statusLabel)}</span>
        </div>
        <div class="platform-cell">${escapeHtml(storeLabel)}</div>
        <div class="platform-cell">${escapeHtml(createdDate)}</div>
        <div class="platform-cell">${itemsCount}</div>
        <div class="platform-cell platform-cell--action">${cancelButton}</div>
      </div>
    `;
    })
    .join("");
}

function renderPagination() {
  if (els.prevButton) {
    els.prevButton.disabled = !state.pagination.previous_cursor;
  }
  if (els.nextButton) {
    els.nextButton.disabled = !state.pagination.next_cursor;
  }
  if (els.pageInfo) {
    const total = state.pagination.total || 0;
    els.pageInfo.textContent = total > 0 ? `${total} total` : "";
  }
}

function handleTableClick(event) {
  const button = event.target.closest("[data-cancel-entitlement-id]");
  if (!button) {
    return;
  }

  const entitlementId = button.getAttribute("data-cancel-entitlement-id");
  if (!entitlementId) {
    return;
  }

  cancelSubscription(entitlementId, button);
}

async function cancelSubscription(entitlementId, button) {
  const originalText = button.textContent;
  button.textContent = "Canceling...";
  button.disabled = true;

  try {
    await api.cancelStripeSubscription(entitlementId);
    showNotice(els.subscriptionsError, "Subscription canceled.", false);
    await loadEntitlements();
  } catch (error) {
    if (isSessionError(error)) {
      clearSessionToken();
      window.location.href = "../login.html";
      return;
    }

    showNotice(els.subscriptionsError, readableError(error));
    button.textContent = originalText;
    button.disabled = false;
  }
}

function formatDate(isoString) {
  if (!isoString) {
    return "—";
  }

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatStoreLabel(store) {
  return String(store || "Unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatStatusLabel(status) {
  return String(status || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

init();
