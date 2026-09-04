// scripts/header.js
// Shared header module — injects the topbar + profile-summary HTML and provides
// shared functions for theme toggle, copy UID, sign out, and profile rendering.
// All authenticated pages use this instead of duplicating the code.

import { CONFIG } from "./config.js";
import { clearSessionToken } from "./api/session.js";
import { getCookie, getInitials, setCookie } from "./utils.js";
import { html } from "./template.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEME_ROOT_CLASS = "theme-dark";
const THEME_QUERY = window.matchMedia("(prefers-color-scheme: dark)");
const THEME_COOKIE_NAME = "ll_theme";
const THEME_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _basePath = "";
let _player = null;

const _state = {
  copyUidStatusTimerId: null,
  copyUidButtonTimerId: null,
};

// ---------------------------------------------------------------------------
// Logo resolution
// ---------------------------------------------------------------------------

function resolveLogoPaths(basePath) {
  const cfg = window.LootLockerProfileConfig || {};
  const prefix = basePath ? `${basePath}/` : "";
  const lightDefault = `${prefix}styles/assets/logo-lightmode.svg`;
  const darkDefault = `${prefix}styles/assets/logo-darkmode.svg`;
  return {
    light: cfg.customLogoLightmode || lightDefault,
    dark: cfg.customLogoDarkmode || darkDefault,
  };
}

// ---------------------------------------------------------------------------
// Header HTML injection
// ---------------------------------------------------------------------------

export function injectHeader(basePath) {
  _basePath = basePath || "";

  const placeholder = document.querySelector("header-placeholder");
  if (!placeholder) return;

  const logo = resolveLogoPaths(_basePath);
  const backHref = _basePath ? `${_basePath}/profile.html` : "";
  const publisher = CONFIG.publisherName || "LootLocker";

  placeholder.outerHTML = html`
    <p
      id="copyUidStatus"
      class="notice top-toast hidden"
      role="status"
      aria-live="polite"
    ></p>
    <header class="topbar">
      <div class="brand">
        <a href="${backHref}" aria-label="${backHref ? "Back to profile" : ""}">
          <img
            id="brandLogo"
            src="${logo.light}"
            class="profile-logo"
            alt="${publisher}"
          />
        </a>
      </div>
      <div class="topbar-actions">
        <button
          id="themeToggleButton"
          class="theme-toggle"
          aria-label="Enable dark mode"
          type="button"
        >
          <span class="ui-icon ui-icon--moon" aria-hidden="true"></span>
        </button>
        <button id="logoutButton" class="button button--ghost" type="button">
          Sign out
        </button>
      </div>
    </header>
    <section class="profile-summary" aria-label="Player summary">
      <div class="profile-head">
        <div id="avatar" class="avatar">--</div>
        <div class="profile-identity">
          <h2 id="playerName">Player</h2>
          <div class="profile-uid-row">
            <p id="playerUid" class="muted">UID</p>
            <button
              id="copyUidButton"
              class="copy-uid-button"
              aria-label="Copy Public UID"
              title="Copy Public UID"
              type="button"
            >
              <span class="ui-icon ui-icon--copy" aria-hidden="true"></span>
            </button>
          </div>
        </div>
      </div>
    </section>
  `.trim();
}

// ---------------------------------------------------------------------------
// Player reference (set by page modules after fetching)
// ---------------------------------------------------------------------------

export function setHeaderPlayer(player) {
  _player = player;
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export function syncTheme(isDark) {
  document.documentElement.classList.toggle(THEME_ROOT_CLASS, isDark);

  const toggleBtn = document.getElementById("themeToggleButton");
  if (toggleBtn) {
    const nextLabel = isDark ? "Enable light mode" : "Enable dark mode";
    const icon = isDark ? "moon" : "sun";
    toggleBtn.innerHTML = `<span class="ui-icon ui-icon--${icon}" aria-hidden="true"></span>`;
    toggleBtn.setAttribute("aria-label", nextLabel);
    toggleBtn.setAttribute("title", nextLabel);
  }

  const logo = document.getElementById("brandLogo");
  if (logo) {
    const paths = resolveLogoPaths(_basePath);
    logo.src = isDark ? paths.dark : paths.light;
  }

  updateCopyUidButtonIconForTheme();

  // Notify page modules that need to re-render on theme change
  if (typeof _onThemeChange === "function") {
    _onThemeChange(isDark);
  }
}

export function resolveInitialTheme() {
  const saved = getSavedTheme();
  if (saved === "dark") return true;
  if (saved === "light") return false;
  return THEME_QUERY.matches;
}

export function getSavedTheme() {
  const value = getCookie(THEME_COOKIE_NAME);
  if (value === "light" || value === "dark") return value;
  return null;
}

export function toggleThemePreference() {
  const isDark = document.documentElement.classList.contains(THEME_ROOT_CLASS);
  const next = isDark ? "light" : "dark";

  setCookie(THEME_COOKIE_NAME, next, {
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: "Lax",
    secure: window.location.protocol === "https:",
  });

  syncTheme(next === "dark");
}

export function getThemeMode() {
  return document.documentElement.classList.contains(THEME_ROOT_CLASS)
    ? "dark"
    : "light";
}

// --- Theme-change hook (for page modules that re-render on theme change) ---

let _onThemeChange = null;

export function setOnThemeChange(callback) {
  _onThemeChange = callback;
}

function handleThemeChange(event) {
  if (getSavedTheme()) return;
  syncTheme(event.matches);
}

// ---------------------------------------------------------------------------
// Copy UID
// ---------------------------------------------------------------------------

export function handleCopyUid() {
  const uid = _player?.public_uid;
  if (!uid) {
    showCopyUidStatus("No Public UID available to copy.", true);
    return;
  }

  copyText(uid)
    .then(() => {
      showCopiedButtonState();
      showCopyUidStatus("Public UID copied.", false);
    })
    .catch(() => {
      resetCopyUidButtonIcon();
      showCopyUidStatus("Unable to copy UID on this browser.", true);
    });
}

export function showCopiedButtonState() {
  const btn = document.getElementById("copyUidButton");
  if (!btn) return;

  clearTimeout(_state.copyUidButtonTimerId);
  _state.copyUidButtonTimerId = null;

  btn.innerHTML =
    '<span class="ui-icon ui-icon--check" aria-hidden="true"></span>';

  _state.copyUidButtonTimerId = setTimeout(() => {
    _state.copyUidButtonTimerId = null;
    resetCopyUidButtonIcon();
  }, 2200);
}

export function resetCopyUidButtonIcon() {
  const btn = document.getElementById("copyUidButton");
  if (!btn) return;

  clearTimeout(_state.copyUidButtonTimerId);
  _state.copyUidButtonTimerId = null;

  btn.innerHTML =
    '<span class="ui-icon ui-icon--copy" aria-hidden="true"></span>';
}

function updateCopyUidButtonIconForTheme() {
  const btn = document.getElementById("copyUidButton");
  if (!btn) return;

  const icon = _state.copyUidButtonTimerId ? "check" : "copy";
  btn.innerHTML = `<span class="ui-icon ui-icon--${icon}" aria-hidden="true"></span>`;
}

function showCopyUidStatus(text, isError) {
  const el = document.getElementById("copyUidStatus");
  if (!el) return;

  clearTimeout(_state.copyUidStatusTimerId);
  _state.copyUidStatusTimerId = null;

  el.textContent = text;
  el.classList.remove("hidden");
  el.classList.toggle("notice--error", isError);
  el.classList.toggle("notice--success", !isError);

  _state.copyUidStatusTimerId = setTimeout(
    clearCopyUidStatus,
    isError ? 3200 : 2200,
  );
}

function clearCopyUidStatus() {
  const el = document.getElementById("copyUidStatus");
  if (!el) return;

  clearTimeout(_state.copyUidStatusTimerId);
  _state.copyUidStatusTimerId = null;

  el.textContent = "";
  el.classList.add("hidden");
  el.classList.remove("notice--error", "notice--success");
}

function copyText(value) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }

  return new Promise((resolve, reject) => {
    try {
      const input = document.createElement("textarea");
      input.value = value;
      input.setAttribute("readonly", "");
      input.style.position = "absolute";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      resolve();
    } catch {
      reject(new Error("copy failed"));
    }
  });
}

// ---------------------------------------------------------------------------
// Profile rendering
// ---------------------------------------------------------------------------

export function renderProfile(player, displayNameOverride) {
  const displayName =
    displayNameOverride || player?.name || player?.public_uid || "Player";
  const uid = player?.public_uid || "No public UID";

  const nameEl = document.getElementById("playerName");
  const uidEl = document.getElementById("playerUid");
  const avatarEl = document.getElementById("avatar");
  const copyBtn = document.getElementById("copyUidButton");

  if (nameEl) nameEl.textContent = displayName;
  if (uidEl) uidEl.textContent = uid;
  if (avatarEl) avatarEl.textContent = getInitials(displayName);
  if (copyBtn) copyBtn.disabled = !player?.public_uid;

  resetCopyUidButtonIcon();
  clearCopyUidStatus();
}

export function showHeaderLoadingState() {
  const nameEl = document.getElementById("playerName");
  const uidEl = document.getElementById("playerUid");
  const avatarEl = document.getElementById("avatar");
  const copyBtn = document.getElementById("copyUidButton");

  if (nameEl) nameEl.textContent = "Loading profile...";
  if (uidEl) uidEl.textContent = "Please wait";
  if (avatarEl) avatarEl.textContent = "..";
  if (copyBtn) copyBtn.disabled = true;

  resetCopyUidButtonIcon();
  clearCopyUidStatus();
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export function signOut(loginPath) {
  clearSessionToken();
  window.location.href = loginPath;
}

// ---------------------------------------------------------------------------
// Bind header events (call from page modules)
// ---------------------------------------------------------------------------

export function bindHeaderEvents(loginPath) {
  document
    .getElementById("logoutButton")
    ?.addEventListener("click", () => signOut(loginPath));

  document
    .getElementById("themeToggleButton")
    ?.addEventListener("click", toggleThemePreference);

  document
    .getElementById("copyUidButton")
    ?.addEventListener("click", handleCopyUid);

  THEME_QUERY.addEventListener("change", handleThemeChange);
}
