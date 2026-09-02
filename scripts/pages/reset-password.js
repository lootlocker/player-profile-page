import { createApiClient } from "../api/client.js";
import { CONFIG } from "../config.js";
import { getSessionToken } from "../api/session.js";
import {
  applyCustomBranding,
  applyCustomScripts,
  applyCustomStylesheets,
  clearNotice,
  ensureRequiredConfigOrRenderError,
  getCookie,
  readableError,
  resolveLogoByTheme,
  showNotice,
} from "../utils.js";

const THEME_ROOT_CLASS = "theme-dark";
const THEME_QUERY = window.matchMedia("(prefers-color-scheme: dark)");
const THEME_COOKIE_NAME = "ll_theme";
const AUTH_LOGO_BY_THEME = resolveLogoByTheme(
  window.LootLockerProfileConfig,
  "styles/assets/custom/logo-lightmode.png",
  "styles/assets/custom/logo-lightmode.png",
);

const api = createApiClient(CONFIG, () => getSessionToken());

const els = {
  resetForm: document.getElementById("resetForm"),
  resetSubmit: document.getElementById("resetSubmit"),
  emailInput: document.getElementById("emailInput"),
  authError: document.getElementById("authError"),
  authSuccess: document.getElementById("authSuccess"),
  globalError: document.getElementById("globalError"),
  authLogo: document.getElementById("authLogo"),
  authFormDescription: document.getElementById("authFormDescription"),
};

async function init() {
  if (!ensureRequiredConfigOrRenderError(CONFIG)) {
    return;
  }

  applyCustomScripts(CONFIG.customScripts);
  applyCustomStylesheets(CONFIG.customStylesheets);
  applyCustomBranding(CONFIG);

  const publisherName = String(CONFIG.publisherName || "Publisher");
  document.title = `${publisherName} Forgot Password`;
  if (els.authFormDescription) {
    els.authFormDescription.textContent = `Enter the email address for your ${publisherName} account and we'll send you a reset link.`;
  }

  syncTheme(resolveInitialTheme());
  THEME_QUERY.addEventListener("change", handleThemeChange);

  els.resetForm.addEventListener("submit", handleSubmit);
}

function handleThemeChange(event) {
  if (getSavedTheme()) {
    return;
  }

  syncTheme(event.matches);
}

function syncTheme(isDark) {
  document.documentElement.classList.toggle(THEME_ROOT_CLASS, isDark);

  if (els.authLogo) {
    els.authLogo.src = isDark
      ? AUTH_LOGO_BY_THEME.dark
      : AUTH_LOGO_BY_THEME.light;
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

async function handleSubmit(event) {
  event.preventDefault();
  clearNotice(els.authError);
  clearNotice(els.authSuccess);
  clearNotice(els.globalError);

  const email = els.emailInput.value.trim();

  if (!email) {
    showNotice(els.authError, "Email is required.");
    return;
  }

  try {
    setBusy(true);
    await api.requestPasswordReset(email);
    els.resetForm.querySelector("#emailField").classList.add("hidden");
    els.resetSubmit.classList.add("hidden");
    showNotice(
      els.authSuccess,
      "If an account exists for that email, you'll receive a reset link shortly.",
    );
  } catch (error) {
    showNotice(els.authError, readableError(error));
  } finally {
    setBusy(false);
  }
}

function setBusy(isBusy) {
  els.resetSubmit.disabled = isBusy;
  els.resetSubmit.textContent = isBusy ? "Sending..." : "Send reset link";
}

init();
