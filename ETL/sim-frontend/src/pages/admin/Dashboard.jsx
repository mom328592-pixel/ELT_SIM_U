import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { apiFetch } from "../../api";

function Dashboard() {
  const [report, setReport] = useState(null);
  const [registrations, setRegistrations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [reportResponse, registrationResponse] =
        await Promise.all([
          apiFetch("/reports/dashboard"),
          apiFetch("/registrations"),
        ]);

      setReport(reportResponse.data);
      setRegistrations(
        registrationResponse.data || []
      );
    } catch (err) {
      console.error("DASHBOARD ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="panel loading-box">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>
              SIM Registration Management System
            </p>
          </div>
        </div>

        <div className="dashboard-error">
          {error}
        </div>
      </div>
    );
  }

  const simChartData = [
    {
      name: "Available",
      value: report?.sim?.available || 0,
    },
    {
      name: "Registered",
      value: report?.sim?.registered || 0,
    },
    {
      name: "Blocked",
      value: report?.sim?.blocked || 0,
    },
  ];

  const registrationChartData = [
    {
      name: "Pending",
      value:
        report?.registrations?.pending || 0,
    },
    {
      name: "Approved",
      value:
        report?.registrations?.approved || 0,
    },
    {
      name: "Rejected",
      value:
        report?.registrations?.rejected || 0,
    },
  ];

  const recentRegistrations =
    registrations.slice(0, 5);

  return (
    <div className="page-container">

      {/* HEADER */}
      <div className="page-header dashboard-page-header">
        <div>
          <h1>Dashboard</h1>

          <p>
            Overview of SIM registration activities
          </p>
        </div>

        <button
          className="primary-button"
          onClick={loadDashboard}
        >
          Refresh
        </button>
      </div>


      {/* STATISTICS */}
      <section className="stats-grid dashboard-stats">

        <div className="stat-card">
          <span>Total SIM</span>

          <strong>
            {report?.sim?.total || 0}
          </strong>

          <small>
            All SIM cards
          </small>
        </div>


        <div className="stat-card">
          <span>Available SIM</span>

          <strong>
            {report?.sim?.available || 0}
          </strong>

          <small>
            Ready for registration
          </small>
        </div>


        <div className="stat-card">
          <span>Registered SIM</span>

          <strong>
            {report?.sim?.registered || 0}
          </strong>

          <small>
            Successfully registered
          </small>
        </div>


        <div className="stat-card">
          <span>Pending</span>

          <strong>
            {report?.registrations?.pending || 0}
          </strong>

          <small>
            Waiting for review
          </small>
        </div>

      </section>


      {/* SECONDARY STATISTICS */}
      <section className="mini-stats-grid">

        <div className="mini-stat-card">
          <span>Customers</span>
          <strong>
            {report?.customers?.total || 0}
          </strong>
        </div>

        <div className="mini-stat-card">
          <span>Agents</span>
          <strong>
            {report?.agents?.total || 0}
          </strong>
        </div>

        <div className="mini-stat-card">
          <span>Users</span>
          <strong>
            {report?.users?.total || 0}
          </strong>
        </div>

        <div className="mini-stat-card">
          <span>Registrations</span>
          <strong>
            {report?.registrations?.total || 0}
          </strong>
        </div>

      </section>


      {/* CHARTS */}
      <section className="dashboard-charts">

        {/* SIM CHART */}
        <div className="panel chart-panel">

          <div className="panel-header">
            <div>
              <h2>SIM Status</h2>

              <p className="panel-description">
                Current SIM inventory status
              </p>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <BarChart
                data={simChartData}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis dataKey="name" />

                <YAxis allowDecimals={false} />

                <Tooltip />

                <Bar dataKey="value">
                  <Cell />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>


        {/* REGISTRATION CHART */}
        <div className="panel chart-panel">

          <div className="panel-header">
            <div>
              <h2>
                Registration Status
              </h2>

              <p className="panel-description">
                Registration request overview
              </p>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <PieChart>

                <Pie
                  data={registrationChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  label
                >
                  {registrationChartData.map(
                    (_, index) => (
                      <Cell key={index} />
                    )
                  )}
                </Pie>

                <Tooltip />

                <Legend />

              </PieChart>
            </ResponsiveContainer>
          </div>

        </div>

      </section>


      {/* RECENT REGISTRATIONS */}
      <div className="panel">

        <div className="panel-header">
          <div>
            <h2>
              Recent Registrations
            </h2>

            <p className="panel-description">
              Latest SIM registration requests
            </p>
          </div>
        </div>

        <div className="table-wrapper">

          <table className="agent-table">

            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>SIM</th>
                <th>Agent</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {recentRegistrations.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="empty-row"
                  >
                    No registration data
                  </td>
                </tr>
              ) : (
                recentRegistrations.map(
                  (item) => (
                    <tr
                      key={
                        item.id_registration
                      }
                    >
                      <td>
                        #{item.id_registration}
                      </td>

                      <td>
                        {item.customer_name || "-"}
                      </td>

                      <td>
                        {item.phone_number || "-"}
                      </td>

                      <td>
                        {item.iccid || "-"}
                      </td>

                      <td>
                        {item.agent_name || "-"}
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            item.registration_status ===
                            "Approved"
                              ? "status-success"
                              : item.registration_status ===
                                "Pending"
                              ? "status-info"
                              : item.registration_status ===
                                "Rejected"
                              ? "status-danger"
                              : "status-default"
                          }`}
                        >
                          {
                            item.registration_status
                          }
                        </span>
                      </td>
                    </tr>
                  )
                )
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;