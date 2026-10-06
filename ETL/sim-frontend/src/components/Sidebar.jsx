import { NavLink } from "react-router-dom";

function Sidebar({
  user,
  onLogout,
  collapsed,
  onToggle,
}) {
  const roleId = Number(
    user?.id_role ??
      user?.role_id
  );

  const canSee = (
    ...roles
  ) =>
    roles.includes(
      roleId
    );

  const itemClass = ({
    isActive,
  }) =>
    `menu-item ${
      isActive
        ? "active"
        : ""
    }`;

  return (
    <aside
      className={`sidebar ${
        collapsed
          ? "collapsed"
          : ""
      }`}
    >

      {/* ================= BRAND ================= */}

      <div className="brand">

        <div className="brand-logo">
          SIM
        </div>

        {!collapsed && (
          <div>
            <h2>
              ELT SIM
            </h2>

            <span>
              Registration System
            </span>
          </div>
        )}

        <button
          className="sidebar-toggle"
          onClick={
            onToggle
          }
          title="Toggle sidebar"
          type="button"
        >
          {collapsed
            ? "»"
            : "«"}
        </button>

      </div>

      {/* ================= MENU ================= */}

      <nav className="sidebar-menu">

        {/* Dashboard */}

        <NavLink
          to="/dashboard"
          className={
            itemClass
          }
        >
          <span className="menu-icon">
            ⌂
          </span>

          {!collapsed && (
            <span>
              Dashboard
            </span>
          )}
        </NavLink>

        {/* Registrations */}

        {canSee(
          1,
          2,
          3
        ) && (
          <NavLink
            to="/registrations"
            className={
              itemClass
            }
          >
            <span className="menu-icon">
              R
            </span>

            {!collapsed && (
              <span>
                Registrations
              </span>
            )}
          </NavLink>
        )}

        {/* SIM Center */}

        {canSee(
          1,
          2
        ) && (
          <NavLink
            to="/sim-center"
            className={
              itemClass
            }
          >
            <span className="menu-icon">
              S
            </span>

            {!collapsed && (
              <span>
                SIM Center
              </span>
            )}
          </NavLink>
        )}

        {/* People & Access */}

        {canSee(
          1,
          2,
          3
        ) && (
          <NavLink
            to="/management"
            className={
              itemClass
            }
          >
            <span className="menu-icon">
              P
            </span>

            {!collapsed && (
              <span>
                People & Access
              </span>
            )}
          </NavLink>
        )}

        {/* REPORTS
            FIX:
            Role 1 + Role 2
        */}

        {canSee(
          1,
          2
        ) && (
          <NavLink
            to="/reports"
            className={
              itemClass
            }
          >
            <span className="menu-icon">
              ▥
            </span>

            {!collapsed && (
              <span>
                Reports
              </span>
            )}
          </NavLink>
        )}

        {/* Settings */}

        {canSee(
          1,
          2,
          3
        ) && (
          <NavLink
            to="/settings"
            className={
              itemClass
            }
          >
            <span className="menu-icon">
              ⚙
            </span>

            {!collapsed && (
              <span>
                Settings
              </span>
            )}
          </NavLink>
        )}

      </nav>

      {/* ================= USER ================= */}

      <div className="sidebar-bottom">

        {!collapsed && (
          <div className="sidebar-user">

            <strong>
              {
                user?.fullname ||
                user?.username ||
                "User"
              }
            </strong>

            <span>
              {
                user?.role_name ||
                "User"
              }
            </span>

          </div>
        )}

        <button
          className="logout-button"
          onClick={
            onLogout
          }
          type="button"
        >
          <span>
            ↪
          </span>

          {!collapsed && (
            <span>
              Logout
            </span>
          )}
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;