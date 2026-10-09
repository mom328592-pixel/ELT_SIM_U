import { NavLink } from "react-router-dom";

function Sidebar({
    user,
    onLogout,
    collapsed,
    onToggle,
    mobileOpen,
    onClose,
}) {
    const roleId = Number(
        user?.id_role ?? user?.role_id
    );

    const canSee = (...roles) =>
        roles.includes(roleId);

    const itemClass = ({ isActive }) =>
        `menu-item ${isActive ? "active" : ""}`;

    const closeMobile = () => {
        if (mobileOpen) {
            onClose?.();
        }
    };

    return (
        <aside
            className={`sidebar ${
                collapsed ? "collapsed" : ""
            } ${mobileOpen ? "open" : ""}`}
        >
            {/* Brand */}
            <div className="brand">
                <div className="brand-logo">
                    SIM
                </div>

                {!collapsed && (
                    <div>
                        <h2>ELT SIM</h2>
                        <span>
                            Registration System
                        </span>
                    </div>
                )}

                {!mobileOpen && (
                    <button
                        type="button"
                        className="sidebar-toggle"
                        onClick={onToggle}
                        title="Toggle sidebar"
                        aria-label="Toggle sidebar"
                    >
                        {collapsed ? "»" : "«"}
                    </button>
                )}

                {mobileOpen && (
                    <button
                        type="button"
                        className="sidebar-mobile-close"
                        onClick={closeMobile}
                        aria-label="Close navigation"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav
                className="sidebar-menu"
                aria-label="Main navigation"
            >
                <NavLink
                    to="/dashboard"
                    className={itemClass}
                    onClick={closeMobile}
                >
                    <span className="menu-icon">
                        ⌂
                    </span>
                    <span>Dashboard</span>
                </NavLink>

                {canSee(1, 2) && (
                    <NavLink
                        to="/registrations"
                        className={itemClass}
                        onClick={closeMobile}
                    >
                        <span className="menu-icon">
                            ✓
                        </span>
                        <span>Registrations</span>
                    </NavLink>
                )}

                {canSee(1, 2) && (
                    <NavLink
                        to="/sim-center"
                        className={itemClass}
                        onClick={closeMobile}
                    >
                        <span className="menu-icon">
                            S
                        </span>
                        <span>SIM Center</span>
                    </NavLink>
                )}

                {canSee(1, 2) && (
                    <NavLink
                        to="/management"
                        className={itemClass}
                        onClick={closeMobile}
                    >
                        <span className="menu-icon">
                            P
                        </span>
                        <span>People & Access</span>
                    </NavLink>
                )}

                {canSee(1, 2) && (
                    <NavLink
                        to="/reports"
                        className={itemClass}
                        onClick={closeMobile}
                    >
                        <span className="menu-icon">
                            ▥
                        </span>
                        <span>Reports</span>
                    </NavLink>
                )}

                {canSee(1, 2) && (
                    <NavLink
                        to="/settings"
                        className={itemClass}
                        onClick={closeMobile}
                    >
                        <span className="menu-icon">
                            ⚙
                        </span>
                        <span>Settings</span>
                    </NavLink>
                )}
            </nav>

            {/* User information and logout */}
            <div className="sidebar-bottom">
                {!collapsed && (
                    <div className="sidebar-user">
                        <strong>
                            {user?.fullname ||
                                user?.username ||
                                "User"}
                        </strong>

                        <span>
                            {user?.role_name || "User"}
                        </span>
                    </div>
                )}

                <button
                    type="button"
                    className="logout-button"
                    onClick={onLogout}
                >
                    <span>↪</span>
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;