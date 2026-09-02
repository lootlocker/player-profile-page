// ---------------------------------------------------------------------------
// Shared modal template helpers
// ---------------------------------------------------------------------------

/**
 * Creates a modal element and appends it to the document body.
 * Returns references to the modal's key elements for event binding.
 *
 * @param {Object} options
 * @param {string} options.id - Unique ID for the modal section
 * @param {string} options.title - Modal heading text
 * @param {string} [options.message] - Optional body message
 * @param {string} [options.confirmLabel="Confirm"] - Confirm button text
 * @param {string} [options.confirmClass="button--danger"] - Additional class for confirm button
 * @param {string} [options.closeLabel="Close action modal"] - aria-label for close button
 * @returns {{ modal, closeButton, titleEl, messageEl, statusEl, cancelButton, confirmButton }}
 */
export function createModal({
  id,
  title,
  message = "",
  confirmLabel = "Confirm",
  confirmClass = "button--danger",
  closeLabel = "Close action modal",
}) {
  const html = `
    <section
      id="${id}"
      class="modal hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="${id}Title"
    >
      <div class="modal__card">
        <button
          id="${id}CloseButton"
          class="modal__close button button--ghost button--small"
          type="button"
          aria-label="${closeLabel}"
        >
          ×
        </button>
        <h3 id="${id}Title">${title}</h3>
        <p id="${id}Message" class="muted">${message}</p>
        <p
          id="${id}Status"
          class="notice notice--error hidden"
          role="alert"
        ></p>
        <div class="modal__actions">
          <button
            id="${id}CancelButton"
            class="button button--ghost button--small"
            type="button"
          >
            Cancel
          </button>
          <button
            id="${id}ConfirmButton"
            class="button button--small ${confirmClass}"
            type="button"
          >
            ${confirmLabel}
          </button>
        </div>
      </div>
    </section>
  `;

  document.body.insertAdjacentHTML("beforeend", html);

  const modal = document.getElementById(id);
  const closeButton = document.getElementById(`${id}CloseButton`);
  const titleEl = document.getElementById(`${id}Title`);
  const messageEl = document.getElementById(`${id}Message`);
  const statusEl = document.getElementById(`${id}Status`);
  const cancelButton = document.getElementById(`${id}CancelButton`);
  const confirmButton = document.getElementById(`${id}ConfirmButton`);

  // Click outside to close
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal(modal);
    }
  });

  return {
    modal,
    closeButton,
    titleEl,
    messageEl,
    statusEl,
    cancelButton,
    confirmButton,
  };
}

/**
 * Opens a modal by removing the "hidden" class.
 */
export function openModal(modal) {
  if (modal) modal.classList.remove("hidden");
}

/**
 * Closes a modal by adding the "hidden" class.
 */
export function closeModal(modal) {
  if (modal) modal.classList.add("hidden");
}
