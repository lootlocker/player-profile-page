import { CONFIG } from "../core/config.js";
import { deleteCookie, getCookie, setCookie } from "../core/utils.js";

export function getSessionToken() {
  return getCookie(CONFIG.sessionCookieName);
}

export function saveSessionToken(token, remember) {
  if (!token) {
    return;
  }

  const secure = window.location.protocol === "https:";
  const maxAge = remember ? CONFIG.rememberDays * 24 * 60 * 60 : undefined;

  setCookie(CONFIG.sessionCookieName, token, {
    maxAge,
    sameSite: "Lax",
    secure,
  });
}

export function clearSessionToken() {
  deleteCookie(CONFIG.sessionCookieName);
}
