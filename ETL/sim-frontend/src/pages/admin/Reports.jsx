import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";

function Reports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/reports/dashboard");

      setReport(response.data);
    } catch (err) {
      console.error("REPORT ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="panel loading-box">
          Loading reports...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>Reports</h1>
            <p>System statistics and reports</p>
          </div>
        </div>

        <div className="dashboard-error">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>System statistics and reports</p>
        </div>

        <button
          className="primary-button"
          onClick={loadReport}
        >
          Refresh
        </button>
      </div>

      {/* SIM REPORT */}
      <section className="report-section">
        <h2>SIM Statistics</h2>

        <div className="stats-grid">
          <div className="stat-card">
            <span>Total SIM</span>
            <strong>{report?.sim?.total ?? 0}</strong>
            <small>All SIM cards</small>
          </div>

          <div className="stat-card">
            <span>Available</span>
            <strong>{report?.sim?.available ?? 0}</strong>
            <small>Ready for registration</small>
          </div>

          <div className="stat-card">
            <span>Registered</span>
            <strong>{report?.sim?.registered ?? 0}</strong>
            <small>Registered SIM</small>
          </div>

          <div className="stat-card">
            <span>Blocked</span>
            <strong>{report?.sim?.blocked ?? 0}</strong>
            <small>Blocked SIM</small>
          </div>
        </div>
      </section>

      {/* REGISTRATION REPORT */}
      <section className="report-section">
        <h2>Registration Statistics</h2>

        <div className="stats-grid">
          <div className="stat-card">
            <span>Total</span>
            <strong>
              {report?.registrations?.total ?? 0}
            </strong>
          </div>

          <div className="stat-card">
            <span>Pending</span>
            <strong>
              {report?.registrations?.pending ?? 0}
            </strong>
          </div>

          <div className="stat-card">
            <span>Approved</span>
            <strong>
              {report?.registrations?.approved ?? 0}
            </strong>
          </div>

          <div className="stat-card">
            <span>Rejected</span>
            <strong>
              {report?.registrations?.rejected ?? 0}
            </strong>
          </div>
        </div>
      </section>

      {/* SYSTEM SUMMARY */}
      <section className="report-section">
        <h2>System Summary</h2>

        <div className="dashboard-content">
          <div className="panel">
            <div className="status-list">
              <div>
                <span>Total Customers</span>
                <strong>
                  {report?.customers?.total ?? 0}
                </strong>
              </div>

              <div>
                <span>Total Agents</span>
                <strong>
                  {report?.agents?.total ?? 0}
                </strong>
              </div>

              <div>
                <span>Total Users</span>
                <strong>
                  {report?.users?.total ?? 0}
                </strong>
              </div>

              <div>
                <span>Total Registrations</span>
                <strong>
                  {report?.registrations?.total ?? 0}
                </strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <h3>Registration Status</h3>

            <div className="report-bars">
              <div className="report-bar-row">
                <span>Pending</span>
                <div className="report-bar">
                  <div
                    className="report-bar-fill pending"
                    style={{
                      width: `${getPercent(
                        report?.registrations?.pending,
                        report?.registrations?.total
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="report-bar-row">
                <span>Approved</span>
                <div className="report-bar">
                  <div
                    className="report-bar-fill approved"
                    style={{
                      width: `${getPercent(
                        report?.registrations?.approved,
                        report?.registrations?.total
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="report-bar-row">
                <span>Rejected</span>
                <div className="report-bar">
                  <div
                    className="report-bar-fill rejected"
                    style={{
                      width: `${getPercent(
                        report?.registrations?.rejected,
                        report?.registrations?.total
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function getPercent(value = 0, total = 0) {
  if (!total) return 0;

  return Math.min(
    100,
    Math.round((value / total) * 100)
  );
}

export default Reports;