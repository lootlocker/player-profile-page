import { CONFIG } from "../config.js";
import { deleteCookie, getCookie, setCookie } from "../utils.js";

const SESSION_COOKIE_NAME = "ll_profile_session";
const EMAIL_COOKIE_NAME = "ll_email";

export function getSessionToken() {
  return getCookie(SESSION_COOKIE_NAME);
}

export function getAccountEmail() {
  return getCookie(EMAIL_COOKIE_NAME);
}

export function saveSessionToken(token, remember) {
  if (!token) {
    return;
  }

  const secure = window.location.protocol === "https:";
  const maxAge = remember ? CONFIG.rememberDays * 24 * 60 * 60 : undefined;

  setCookie(SESSION_COOKIE_NAME, token, {
    maxAge,
    sameSite: "Lax",
    secure,
  });
}

export function saveAccountEmail(email, remember) {
  const normalizedEmail = String(email || "").trim();
  if (!normalizedEmail) {
    return;
  }

  const secure = window.location.protocol === "https:";
  const maxAge = remember ? CONFIG.rememberDays * 24 * 60 * 60 : undefined;

  setCookie(EMAIL_COOKIE_NAME, normalizedEmail, {
    maxAge,
    sameSite: "Lax",
    secure,
  });
}

export function clearSessionToken() {
  deleteCookie(SESSION_COOKIE_NAME);
  deleteCookie(EMAIL_COOKIE_NAME);
}
