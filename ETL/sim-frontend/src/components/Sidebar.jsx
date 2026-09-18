import { NavLink } from "react-router-dom";

function Sidebar({ user, onLogout, collapsed, onToggle }) {
  const roleId = Number(user?.id_role ?? user?.role_id);
  const canSee = (...roles) => roles.includes(roleId);

  const itemClass = ({ isActive }) => `menu-item ${isActive ? "active" : ""}`;

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="brand">
        <div className="brand-logo">SIM</div>
        {!collapsed && (
          <div>
            <h2>ELT SIM</h2>
            <span>Registration System</span>
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggle} title="Toggle sidebar" type="button">
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="sidebar-menu">
        <NavLink to="/dashboard" className={itemClass}>
          <span className="menu-icon">⌂</span>
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        {canSee(1, 2, 3) && (
          <NavLink to="/registrations" className={itemClass}>
            <span className="menu-icon">R</span>
            {!collapsed && <span>Registrations</span>}
          </NavLink>
        )}

        {canSee(1, 2) && (
          <NavLink to="/sim-center" className={itemClass}>
            <span className="menu-icon">S</span>
            {!collapsed && <span>SIM Center</span>}
          </NavLink>
        )}

        {canSee(1, 2, 3) && (
          <NavLink to="/management" className={itemClass}>
            <span className="menu-icon">P</span>
            {!collapsed && <span>People & Access</span>}
          </NavLink>
        )}

        {canSee(1) && (
          <NavLink to="/reports" className={itemClass}>
            <span className="menu-icon">▥</span>
            {!collapsed && <span>Reports</span>}
          </NavLink>
        )}

        {canSee(1, 2, 3) && (
          <NavLink to="/settings" className={itemClass}>
            <span className="menu-icon">⚙</span>
            {!collapsed && <span>Settings</span>}
          </NavLink>
        )}
      </nav>

      <div className="sidebar-bottom">
        {!collapsed && (
          <div className="sidebar-user">
            <strong>{user?.fullname || user?.username}</strong>
            <span>{user?.role_name || "User"}</span>
          </div>
        )}

        <button className="logout-button" onClick={onLogout} type="button">
          <span>↪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
