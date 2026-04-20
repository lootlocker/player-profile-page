export function setCookie(name, value, options = {}) {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/`;

  if (typeof options.maxAge === "number") {
    cookie += `; max-age=${Math.floor(options.maxAge)}`;
  }

  if (options.sameSite) {
    cookie += `; samesite=${options.sameSite}`;
  }

  if (options.secure) {
    cookie += "; secure";
  }

  document.cookie = cookie;
}

export function getCookie(name) {
  const encodedName = encodeURIComponent(name);
  const entries = document.cookie ? document.cookie.split(";") : [];

  for (const entry of entries) {
    const [rawKey, ...rawValue] = entry.trim().split("=");
    if (rawKey === encodedName) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

export function deleteCookie(name) {
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0`;
}

export function showNotice(element, text) {
  element.textContent = text;
  element.classList.remove("hidden");
}

export function clearNotice(element) {
  element.textContent = "";
  element.classList.add("hidden");
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getInitials(value) {
  const cleaned = String(value || "").trim();
  if (!cleaned) {
    return "--";
  }

  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export function isSessionError(error) {
  return error?.status === 401 || error?.status === 403;
}

export function readableError(error) {
  if (!error) {
    return "Something went wrong.";
  }

  if (typeof error === "string") {
    return error;
  }

  return error.message || "Request failed.";
}
