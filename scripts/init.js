// ---------------------------------------------------------------------------
// init.js — synchronous pre-init checks shared by all pages
// Must be loaded as a plain <script> (not type="module") in <head> so the
// theme class is applied before first paint (prevents FOUC).
// ---------------------------------------------------------------------------

// 1. Apply saved or system theme immediately (before paint)
(function () {
  var match = document.cookie.match(/(?:^|;\s*)ll_theme=(light|dark)(?:;|$)/);
  var saved = match ? match[1] : null;
  var isDark =
    saved === "dark" ||
    (!saved &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (isDark) {
    document.documentElement.classList.add("theme-dark");
  }
})();

// 2. Warn when loaded via file:// (deferred until DOM is ready)
document.addEventListener("DOMContentLoaded", function () {
  if (window.location.protocol !== "file:") return;
  var globalError = document.getElementById("globalError");
  if (!globalError) return;
  globalError.textContent =
    "You are running this page from file://. Use a local web server (for example: python3 -m http.server 8080) so modules, cookies, and API calls work reliably.";
  globalError.classList.remove("hidden");
});
