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

export function applyCustomStylesheets(stylesheets) {
  if (!Array.isArray(stylesheets) || stylesheets.length === 0) {
    return;
  }

  const loaded = window.__llCustomStylesheetRegistry || new Set();
  window.__llCustomStylesheetRegistry = loaded;

  for (const item of stylesheets) {
    const href = typeof item === "string" ? item.trim() : "";
    if (!href || loaded.has(href)) {
      continue;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.llCustomStylesheet = href;
    document.head.appendChild(link);
    loaded.add(href);
  }
}

export function applyCustomScripts(scripts) {
  if (!Array.isArray(scripts) || scripts.length === 0) {
    return;
  }

  const loaded = window.__llCustomScriptRegistry || new Set();
  window.__llCustomScriptRegistry = loaded;

  for (const item of scripts) {
    const src = typeof item === "string" ? item.trim() : "";
    if (!src || loaded.has(src)) {
      continue;
    }

    const script = document.createElement("script");
    script.src = src;
    script.dataset.llCustomScript = src;
    document.head.appendChild(script);
    loaded.add(src);
  }
}

export function hasRequiredConfig(config) {
  if (!config || typeof config !== "object") {
    return false;
  }

  const required = [config.apiBase, config.gameKey, config.domainKey];
  const invalidValues = new Set(["", "YOUR_GAME_KEY", "YOUR_DOMAIN_KEY"]);

  return required.every((value) => {
    const normalized = String(value || "").trim();
    return normalized && !invalidValues.has(normalized);
  });
}

export function renderMissingConfigPage() {
  const snippet = `copy paste this into scripts/custom.js and set your values from your lootlocker game on console\n\nwindow.LootLockerProfileConfig = {\n  apiBase: "https://api.lootlocker.com",\n  gameKey: "YOUR_GAME_KEY",\n  domainKey: "YOUR_DOMAIN_KEY",\n};`;

  document.body.innerHTML = `
    <main style="max-width: 820px; margin: 40px auto; padding: 0 16px; font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; color: #e7edf5;">
      <section style="background:#111927; border:1px solid #28364a; border-radius:12px; padding:20px;">
        <h1 style="margin:0 0 10px; font-size:20px; color:#fbbf24;">Missing LootLocker Config</h1>
        <p style="margin:0 0 14px; color:#a8b3c2;">Required values are missing: <strong>apiBase</strong>, <strong>gameKey</strong>, or <strong>domainKey</strong>.</p>
        <pre style="margin:0; padding:14px; border-radius:10px; overflow:auto; background:#0b1118; border:1px solid #28364a; color:#e7edf5;"><code>${escapeHtml(snippet)}</code></pre>
      </section>
    </main>
  `;
}

export function ensureRequiredConfigOrRenderError(config) {
  if (hasRequiredConfig(config)) {
    return true;
  }

  renderMissingConfigPage();
  return false;
}
