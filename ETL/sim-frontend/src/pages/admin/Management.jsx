import { useState } from "react";

import Users from "./Users";
import Agents from "./Agents";
import Customers from "./Customers";

function Management() {
    const user =
        JSON.parse(
            localStorage.getItem(
                "user"
            ) || "null"
        );

    const roleId =
        Number(
            user?.id_role ??
                user?.role_id
        );

    const tabs = [];

    // Admin
    if (
        roleId === 1
    ) {
        tabs.push({
            id: "users",
            label: "Users",
        });
    }

    // Admin + Staff
    if (
        [1, 2].includes(
            roleId
        )
    ) {
        tabs.push({
            id: "agents",
            label: "Agents",
        });

        tabs.push({
            id: "customers",
            label: "Customers",
        });
    }

    const [
        activeTab,
        setActiveTab,
    ] = useState(
        tabs[0]?.id ||
            ""
    );

    return (
        <div className="page-container compact-module">

            <div className="page-header">
                <div>
                    <h1>
                        People & Access
                    </h1>

                    <p>
                        Manage users,
                        agents and
                        customers.
                    </p>
                </div>
            </div>

            <div
                className="module-tabs"
                role="tablist"
            >
                {tabs.map(
                    (tab) => (
                        <button
                            key={
                                tab.id
                            }
                            type="button"
                            className={`module-tab ${
                                activeTab ===
                                tab.id
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                setActiveTab(
                                    tab.id
                                )
                            }
                        >
                            {
                                tab.label
                            }
                        </button>
                    )
                )}
            </div>

            {activeTab ===
                "users" &&
                roleId === 1 && (
                    <Users />
                )}

            {activeTab ===
                "agents" &&
                [1, 2].includes(
                    roleId
                ) && (
                    <Agents />
                )}

            {activeTab ===
                "customers" &&
                [1, 2].includes(
                    roleId
                ) && (
                    <Customers />
                )}

        </div>
    );
}

export default Management;