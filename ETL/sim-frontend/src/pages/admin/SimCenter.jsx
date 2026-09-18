import { useState } from "react";
import SimManagement from "./SimManagement";
import SimImport from "./SimImport";
import FileHistory from "./FileHistory";

function SimCenter() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const roleId = Number(user?.id_role ?? user?.role_id);
  const [activeTab, setActiveTab] = useState("sim");

  const tabs = [
    { id: "sim", label: "SIM Management" },
    { id: "import", label: "Import SIM" },
    { id: "history", label: "File History" },
  ];

  return (
    <div className="page-container compact-module">
      <div className="page-header">
        <div>
          <h1>SIM Center</h1>
          <p>Manage SIM inventory, imports and file history from one workspace.</p>
        </div>
      </div>

      <div className="module-tabs" role="tablist" aria-label="SIM management">
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

      {activeTab === "sim" && <SimManagement />}
      {activeTab === "import" && [1, 2].includes(roleId) && <SimImport />}
      {activeTab === "history" && [1, 2].includes(roleId) && <FileHistory />}
    </div>
  );
}

export default SimCenter;
