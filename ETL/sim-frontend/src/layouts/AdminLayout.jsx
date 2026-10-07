import {
    useState,
} from "react";

import Sidebar from "../components/Sidebar";

function AdminLayout({
    user,
    onLogout,
    children,
}) {

    const [
        sidebarCollapsed,
        setSidebarCollapsed,
    ] = useState(false);

    const [
        mobileSidebarOpen,
        setMobileSidebarOpen,
    ] = useState(false);

    return (
        <div
            className={`app-layout ${
                sidebarCollapsed
                    ? "sidebar-collapsed"
                    : ""
            }`}
        >

            {/* ========================================
                SIDEBAR
            ========================================= */}

            <Sidebar
                user={user}
                onLogout={onLogout}
                collapsed={
                    sidebarCollapsed
                }
                onToggle={() =>
                    setSidebarCollapsed(
                        (
                            prev
                        ) =>
                            !prev
                    )
                }
                mobileOpen={
                    mobileSidebarOpen
                }
                onClose={() =>
                    setMobileSidebarOpen(
                        false
                    )
                }
            />

            {/* ========================================
                MOBILE OVERLAY
            ========================================= */}

            {mobileSidebarOpen && (
                <button
                    type="button"
                    className="sidebar-overlay"
                    aria-label="Close navigation"
                    onClick={() =>
                        setMobileSidebarOpen(
                            false
                        )
                    }
                />
            )}

            {/* ========================================
                MAIN
            ========================================= */}

            <main className="main-content">

                {/* MOBILE HEADER */}

                <div className="mobile-header">

                    <button
                        type="button"
                        className="mobile-menu-button"
                        onClick={() =>
                            setMobileSidebarOpen(
                                true
                            )
                        }
                        aria-label="Open navigation"
                    >
                        ☰
                    </button>

                    <div className="mobile-header-title">

                        <strong>
                            ELT SIM
                        </strong>

                        <span>
                            {
                                user?.role_name ||
                                "Management Dashboard"
                            }
                        </span>

                    </div>

                </div>

                {/* TOPBAR */}

                <header className="topbar-main">

                    <div className="topbar-title">

                        <h2>
                            SIM Registration System
                        </h2>

                        <span>
                            {
                                Number(
                                    user?.id_role ??
                                        user?.role_id
                                ) === 3
                                    ? "Agent Dashboard"
                                    : "Management Dashboard"
                            }
                        </span>

                    </div>

                    <div className="topbar-right">

                        <div className="topbar-user">

                            <div className="topbar-avatar">

                                {(
                                    user?.fullname ||
                                    user?.username ||
                                    "U"
                                )
                                    .charAt(
                                        0
                                    )
                                    .toUpperCase()}

                            </div>

                            <div>

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

                        </div>

                    </div>

                </header>

                {/* PAGE */}

                <section className="page-content">
                    {children}
                </section>

            </main>

        </div>
    );
}

export default AdminLayout;