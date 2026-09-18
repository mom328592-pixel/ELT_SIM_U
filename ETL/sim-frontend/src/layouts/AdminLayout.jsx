import { useState } from "react";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";

function AdminLayout({
  user,
  onLogout,
  children,
}) {
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  return (
    <div
      className={`app-layout ${
        sidebarCollapsed ? "sidebar-collapsed" : ""
      }`}
    >

      {/* =========================
          SIDEBAR
      ========================= */}
      <Sidebar
        user={user}
        onLogout={onLogout}
        collapsed={sidebarCollapsed}
        onToggle={() =>
          setSidebarCollapsed(
            (prev) => !prev
          )
        }
      />

      {/* =========================
          MAIN CONTENT
      ========================= */}
      <main className="main-content">

        {/* =========================
            TOPBAR
        ========================= */}
        <header className="topbar-main">

          <div className="topbar-title">
            <h2>
              SIM Registration System
            </h2>

            <span>
              Management Dashboard
            </span>
          </div>

          <div className="topbar-right">

            {/* Notification */}
            <NotificationBell />

            {/* User */}
            <div className="topbar-user">

              <div className="topbar-avatar">
                {(user?.fullname ||
                  user?.username ||
                  "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {user?.fullname ||
                    user?.username ||
                    "User"}
                </strong>

                <span>
                  {user?.role_name ||
                    "User"}
                </span>
              </div>

            </div>

          </div>

        </header>

        {/* =========================
            PAGE
        ========================= */}
        <section className="page-content">
          {children}
        </section>

      </main>

    </div>
  );
}

export default AdminLayout;