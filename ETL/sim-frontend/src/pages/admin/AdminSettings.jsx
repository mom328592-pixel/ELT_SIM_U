import { useState } from "react";
import Profile from "./Profile";
import SystemSettings from "./SystemSettings";
import AuditLogs from "./AuditLogs";

function AdminSettings() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const roleId = Number(user?.id_role ?? user?.role_id);
  const tabs = [
    { id: "profile", label: "My Profile", show: [1, 2, 3].includes(roleId) },
    { id: "system", label: "System", show: roleId === 1 },
    { id: "audit", label: "Audit Logs", show: roleId === 1 },
  ].filter((tab) => tab.show);

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "profile");

  return (
    <div className="page-container compact-module">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Profile, system master data and security activity.</p>
        </div>
      </div>

      <div className="module-tabs" role="tablist" aria-label="Settings">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`module-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && <Profile user={user} />}
      {activeTab === "system" && roleId === 1 && <SystemSettings />}
      {activeTab === "audit" && roleId === 1 && <AuditLogs />}
    </div>
  );
}

export default AdminSettings;
