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

                <button
                    type="button"
                    className="sidebar-toggle"
                    onClick={onToggle}
                    title="Toggle sidebar"
                >
                    {collapsed ? "»" : "«"}
                </button>

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

            <nav className="sidebar-menu">
                <NavLink
                    to="/dashboard"
                    className={itemClass}
                    onClick={closeMobile}
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

                {canSee(1, 2) && (
                    <NavLink
                        to="/registrations"
                        className={itemClass}
                        onClick={closeMobile}
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

                {canSee(1, 2) && (
                    <NavLink
                        to="/sim-center"
                        className={itemClass}
                        onClick={closeMobile}
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

                {canSee(1, 2) && (
                    <NavLink
                        to="/management"
                        className={itemClass}
                        onClick={closeMobile}
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

                {canSee(1, 2) && (
                    <NavLink
                        to="/reports"
                        className={itemClass}
                        onClick={closeMobile}
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

                <NavLink
                    to="/settings"
                    className={itemClass}
                    onClick={closeMobile}
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
            </nav>

            <div className="sidebar-bottom">
                {!collapsed && (
                    <div className="sidebar-user">
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
                )}

                <button
                    type="button"
                    className="logout-button"
                    onClick={onLogout}
                >
                    <span>↪</span>

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