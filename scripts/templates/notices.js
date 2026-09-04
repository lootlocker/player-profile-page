// ---------------------------------------------------------------------------
// Shared notice/error templates
// ---------------------------------------------------------------------------

/**
 * Replaces <global-error-placeholder> with the standard #globalError element.
 * Call this early in page init, before any code references
 * `document.getElementById("globalError")`.
 */
export function injectGlobalError() {
  const placeholder = document.querySelector("global-error-placeholder");
  if (!placeholder) return;
  placeholder.insertAdjacentHTML(
    "afterend",
    '<section id="globalError" class="notice notice--error hidden" role="alert"></section>',
  );
  placeholder.remove();
}
