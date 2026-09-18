function ConfirmModal({
  open,
  title = "Confirm Action",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="confirm-modal">

        <div className="confirm-icon">
          {danger ? "!" : "?"}
        </div>

        <h2>{title}</h2>

        <p>{message}</p>

        <div className="modal-actions">

          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={
              danger
                ? "confirm-danger-button"
                : "primary-button"
            }
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : confirmText}
          </button>

        </div>

      </div>
    </div>
  );
}

export default ConfirmModal;