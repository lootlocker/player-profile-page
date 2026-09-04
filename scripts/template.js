// scripts/template.js
// Tiny tagged template helper for HTML interpolation.
// Usage: html`<div>${variable}</div>` — escapes values.
//        raw`<div>${htmlString}</div>` — no escaping (for HTML strings).

export function html(strings, ...values) {
  return strings.reduce((result, str, i) => {
    const value = i < values.length ? values[i] : "";
    return result + str + escapeHtml(value);
  }, "");
}

export function raw(strings, ...values) {
  return strings.reduce((result, str, i) => {
    const value = i < values.length ? values[i] : "";
    return result + str + String(value);
  }, "");
}

function escapeHtml(value) {
  const s = String(value ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
