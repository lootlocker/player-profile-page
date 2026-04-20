import { createApiClient } from "../api/client.js";
import {
  createSessionFromCredentials,
  signUpAndCreateSession,
  validateConfig,
} from "../api/auth.js";
import { CONFIG } from "../core/config.js";
import {
  clearSessionToken,
  getSessionToken,
  saveSessionToken,
} from "../api/session.js";
import {
  clearNotice,
  getCookie,
  readableError,
  showNotice,
} from "../core/utils.js";

const mode = document.body.dataset.authMode === "signup" ? "signup" : "login";
const isSignUp = mode === "signup";
const THEME_ROOT_CLASS = "theme-dark";
const THEME_QUERY = window.matchMedia("(prefers-color-scheme: dark)");
const THEME_COOKIE_NAME = "ll_theme";
const AUTH_LOGO_BY_THEME = {
  light: "styles/logo-lightmode.svg",
  dark: "styles/logo-darkmode.svg",
};

const api = createApiClient(CONFIG, () => getSessionToken());

const els = {
  authForm: document.getElementById("authForm"),
  authSubmit: document.getElementById("authSubmit"),
  emailInput: document.getElementById("emailInput"),
  passwordInput: document.getElementById("passwordInput"),
  confirmPasswordInput: document.getElementById("confirmPasswordInput"),
  rememberInput: document.getElementById("rememberInput"),
  authError: document.getElementById("authError"),
  globalError: document.getElementById("globalError"),
  authLogo: document.getElementById("authLogo"),
};

async function init() {
  syncTheme(resolveInitialTheme());
  THEME_QUERY.addEventListener("change", handleThemeChange);

  const token = getSessionToken();
  if (token) {
    try {
      await api.getInfoFromSession();
      window.location.href = "profile.html";
      return;
    } catch (_error) {
      clearSessionToken();
    }
  }

  els.authForm.addEventListener("submit", handleSubmit);
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
  clearNotice(els.globalError);

  if (!validateConfig()) {
    showNotice(
      els.authError,
      "Set gameKey and domainKey in scripts/core/config.js.",
    );
    return;
  }

  const email = els.emailInput.value.trim();
  const password = els.passwordInput.value;
  const confirmPassword = els.confirmPasswordInput?.value || "";
  const remember = els.rememberInput.checked;

  if (!email || !password) {
    showNotice(els.authError, "Email and password are required.");
    return;
  }

  if (isSignUp && !confirmPassword) {
    showNotice(els.authError, "Please confirm your password.");
    return;
  }

  if (isSignUp && password !== confirmPassword) {
    showNotice(els.authError, "Passwords do not match.");
    return;
  }

  try {
    setBusy(true);
    const sessionToken = isSignUp
      ? await signUpAndCreateSession(api, email, password, remember)
      : await createSessionFromCredentials(api, email, password, remember);

    saveSessionToken(sessionToken, remember);
    window.location.href = "profile.html";
  } catch (error) {
    showNotice(els.authError, readableError(error));
  } finally {
    setBusy(false);
  }
}

function setBusy(isBusy) {
  els.authSubmit.disabled = isBusy;

  if (isSignUp) {
    els.authSubmit.textContent = isBusy
      ? "Creating account..."
      : "Create account";
    return;
  }

  els.authSubmit.textContent = isBusy ? "Signing in..." : "Sign in";
}

init();
