import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] =
    useState([]);

  const wrapperRef = useRef(null);

  const unreadCount =
    notifications.filter(
      (item) => Number(item.is_read) === 0
    ).length;

  const loadNotifications =
    useCallback(async () => {
      try {
        const response =
          await apiFetch("/notifications");

        setNotifications(
          response.data || []
        );
      } catch (error) {
        console.error(
          "NOTIFICATIONS ERROR:",
          error
        );
      }
    }, []);

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(
      loadNotifications,
      30000
    );

    return () => {
      clearInterval(interval);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside =
      (event) => {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(
            event.target
          )
        ) {
          setOpen(false);
        }
      };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const markAsRead = async (id) => {
    try {
      await apiFetch(
        `/notifications/${id}/read`,
        {
          method: "PUT"
        }
      );

      setNotifications((prev) =>
        prev.map((item) =>
          item.id_notification === id
            ? {
                ...item,
                is_read: 1
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "MARK READ ERROR:",
        error
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiFetch(
        "/notifications/read-all",
        {
          method: "PUT"
        }
      );

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: 1
        }))
      );
    } catch (error) {
      console.error(
        "MARK ALL READ ERROR:",
        error
      );
    }
  };

  const deleteNotification =
    async (id) => {
      try {
        await apiFetch(
          `/notifications/${id}`,
          {
            method: "DELETE"
          }
        );

        setNotifications((prev) =>
          prev.filter(
            (item) =>
              item.id_notification !== id
          )
        );
      } catch (error) {
        console.error(
          "DELETE NOTIFICATION ERROR:",
          error
        );
      }
    };

  return (
    <div
      className="notification-wrapper"
      ref={wrapperRef}
    >

      <button
        className="notification-button"
        onClick={() =>
          setOpen((prev) => !prev)
        }
      >
        🔔

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">

          <div className="notification-header">

            <div>
              <h3>
                Notifications
              </h3>

              <span>
                {unreadCount} unread
              </span>
            </div>

            {unreadCount > 0 && (
              <button
                className="notification-link"
                onClick={
                  markAllAsRead
                }
              >
                Mark all read
              </button>
            )}

          </div>

          <div className="notification-list">

            {notifications.length === 0 ? (
              <div className="notification-empty">
                <div>🔔</div>
                <p>
                  No notifications
                </p>
              </div>
            ) : (
              notifications.map(
                (notification) => (
                  <div
                    key={
                      notification.id_notification
                    }
                    className={`notification-item ${
                      Number(
                        notification.is_read
                      ) === 0
                        ? "unread"
                        : ""
                    }`}
                  >

                    <div className="notification-icon">
                      {notification.type ===
                      "success"
                        ? "✓"
                        : notification.type ===
                          "error"
                        ? "!"
                        : "R"}
                    </div>

                    <div className="notification-text">

                      <strong>
                        {notification.title}
                      </strong>

                      <p>
                        {notification.message}
                      </p>

                      <span>
                        {new Date(
                          notification.created_at
                        ).toLocaleString()}
                      </span>

                      <div className="notification-actions">

                        {Number(
                          notification.is_read
                        ) === 0 && (
                          <button
                            onClick={() =>
                              markAsRead(
                                notification.id_notification
                              )
                            }
                          >
                            Mark read
                          </button>
                        )}

                        <button
                          onClick={() =>
                            deleteNotification(
                              notification.id_notification
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                  </div>
                )
              )
            )}

          </div>

        </div>
      )}

    </div>
  );
}

export default NotificationBell;