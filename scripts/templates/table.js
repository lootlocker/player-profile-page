// ---------------------------------------------------------------------------
// Shared platform table template helpers
// ---------------------------------------------------------------------------

/**
 * Creates a platform-table element and returns references to its key parts.
 * The table is returned as a string — insert it into your page with innerHTML
 * or insertAdjacentHTML.
 *
 * @param {Object} options
 * @param {string} options.tableId - Unique ID for the table div
 * @param {string} options.ariaLabel - Accessible label for the table
 * @param {string[]} options.columns - Array of column header labels
 * @param {string} [options.bodyId] - ID for the table body div (defaults to tableId + "Body")
 * @param {string} [options.extraTableClass] - Additional CSS class for the table (e.g. "social-table--friends")
 * @param {string} [options.loadingText="Loading..."] - Text shown while data loads
 * @returns {string} HTML string for the table
 */
export function platformTableTemplate({
  tableId,
  ariaLabel,
  columns,
  bodyId,
  extraTableClass = "",
  loadingText = "Loading...",
}) {
  const bodyDivId = bodyId || `${tableId}Body`;
  const tableClass = ["platform-table", extraTableClass]
    .filter(Boolean)
    .join(" ");

  const headerCells = columns
    .map((col, i) => {
      const isLast = i === columns.length - 1;
      const actionClass = isLast ? " platform-cell--action" : "";
      return `<div class="platform-cell platform-cell--header${actionClass}">${col}</div>`;
    })
    .join("");

  return `
    <div class="platform-table-wrap">
      <div id="${tableId}" class="${tableClass}" aria-label="${ariaLabel}">
        <div class="platform-table-header" role="row">
          ${headerCells}
        </div>
        <div id="${bodyDivId}" class="platform-table-body">
          <div class="platform-row">
            <div class="platform-cell table-empty muted">${loadingText}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
