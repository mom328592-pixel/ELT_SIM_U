import { useState } from "react";
import SimTypes from "./SimTypes";
import SimStatuses from "./SimStatuses";
import RegistrationStatuses from "./RegistrationStatuses";
import UserStatuses from "./UserStatuses";

function SystemSettings() {
  const [activeTab, setActiveTab] = useState(
    "sim-types"
  );

  const tabs = [
    {
      id: "sim-types",
      label: "SIM Types",
    },
    {
      id: "sim-status",
      label: "SIM Status",
    },
    {
      id: "registration-status",
      label: "Registration Status",
    },
    {
      id: "user-status",
      label: "User Status",
    },
  ];

  return (
    <div className="page-container">

      <div className="page-header">
        <div>
          <h1>System Settings</h1>
          <p>
            Manage system master data
          </p>
        </div>
      </div>

      <div className="settings-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={
              activeTab === tab.id
                ? "settings-tab active"
                : "settings-tab"
            }
            onClick={() =>
              setActiveTab(tab.id)
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-content">

        {activeTab === "sim-types" && (
  <div className="settings-tab-content">
    <SimTypes />
  </div>
)}

{activeTab === "sim-status" && (
  <div className="settings-tab-content">
    <SimStatuses />
  </div>
)}

{activeTab === "registration-status" && (
  <div className="settings-tab-content">
    <RegistrationStatuses />
  </div>
)}

{activeTab === "user-status" && (
  <div className="settings-tab-content">
    <UserStatuses />
  </div>
)}

      </div>

    </div>
  );
}

export default SystemSettings;