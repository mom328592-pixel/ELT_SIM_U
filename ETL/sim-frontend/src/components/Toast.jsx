import { useEffect } from "react";

function Toast({
  message,
  type = "success",
  onClose,
}) {
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      onClose();
    }, 3500);

    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`toast toast-${type}`}>

      <div className="toast-content">
        <strong>
          {type === "success"
            ? "Success"
            : type === "error"
            ? "Error"
            : "Notice"}
        </strong>

        <span>{message}</span>
      </div>

      <button onClick={onClose}>
        ×
      </button>

    </div>
  );
}

export default Toast;