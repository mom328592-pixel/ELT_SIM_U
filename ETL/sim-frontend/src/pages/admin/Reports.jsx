import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { apiFetch } from "../../api";

function Reports() {
  const [
    report,
    setReport,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  // ===================================================
  // LOAD REPORT
  // ===================================================

  const loadReport =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await apiFetch(
            "/reports/dashboard"
          );

        setReport(
          response.data || null
        );
      } catch (err) {
        console.error(
          "REPORT ERROR:",
          err
        );

        setError(
          err.message ||
            "Unable to load reports"
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div className="page-container">

        <div className="panel loading-box">
          Loading reports...
        </div>

      </div>
    );
  }

  // ===================================================
  // ERROR
  // ===================================================

  if (error) {
    return (
      <div className="page-container">

        <div className="page-header">

          <div>
            <h1>
              Reports
            </h1>

            <p>
              Registration and SIM reports
            </p>
          </div>

          <button
            className="primary-button"
            onClick={
              loadReport
            }
          >
            Retry
          </button>

        </div>

        <div className="dashboard-error">
          {error}
        </div>

      </div>
    );
  }

  return (
    <div className="page-container">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="page-header">

        <div>

          <h1>
            Reports
          </h1>

          <p>
            SIM registration reports
          </p>

        </div>

        <button
          className="primary-button"
          onClick={
            loadReport
          }
        >
          Refresh
        </button>

      </div>

      {/* =================================================
          REGISTRATION SUMMARY
      ================================================= */}

      <section className="report-section">

        <h2>
          Registration Summary
        </h2>

        <div className="stats-grid">

          <div className="stat-card">

            <span>
              Today
            </span>

            <strong>
              {
                report?.periods?.today ||
                0
              }
            </strong>

            <small>
              Daily registration
            </small>

          </div>

          <div className="stat-card">

            <span>
              This Week
            </span>

            <strong>
              {
                report?.periods
                  ?.this_week ||
                0
              }
            </strong>

            <small>
              Weekly registration
            </small>

          </div>

          <div className="stat-card">

            <span>
              This Month
            </span>

            <strong>
              {
                report?.periods
                  ?.this_month ||
                0
              }
            </strong>

            <small>
              Monthly registration
            </small>

          </div>

          <div className="stat-card">

            <span>
              Total
            </span>

            <strong>
              {
                report?.registrations
                  ?.total ||
                0
              }
            </strong>

            <small>
              All registrations
            </small>

          </div>

        </div>

      </section>

      {/* =================================================
          REGISTRATION STATUS
      ================================================= */}

      <section className="report-section">

        <h2>
          Registration Status
        </h2>

        <div className="stats-grid">

          <div className="stat-card">

            <span>
              Pending
            </span>

            <strong>
              {
                report?.registrations
                  ?.pending ||
                0
              }
            </strong>

          </div>

          <div className="stat-card">

            <span>
              Approved
            </span>

            <strong>
              {
                report?.registrations
                  ?.approved ||
                0
              }
            </strong>

          </div>

          <div className="stat-card">

            <span>
              Rejected
            </span>

            <strong>
              {
                report?.registrations
                  ?.rejected ||
                0
              }
            </strong>

          </div>

        </div>

      </section>

      {/* =================================================
          SIM SUMMARY
      ================================================= */}

      <section className="report-section">

        <h2>
          SIM / IMSI Status
        </h2>

        <div className="stats-grid">

          <div className="stat-card">

            <span>
              Total SIM
            </span>

            <strong>
              {
                report?.sim?.total ||
                0
              }
            </strong>

          </div>

          <div className="stat-card">

            <span>
              Available
            </span>

            <strong>
              {
                report?.sim?.available ||
                0
              }
            </strong>

          </div>

          <div className="stat-card">

            <span>
              Registered
            </span>

            <strong>
              {
                report?.sim?.registered ||
                0
              }
            </strong>

          </div>

          <div className="stat-card">

            <span>
              Reserved
            </span>

            <strong>
              {
                report?.sim?.reserved ||
                0
              }
            </strong>

          </div>

          <div className="stat-card">

            <span>
              Blocked
            </span>

            <strong>
              {
                report?.sim?.blocked ||
                0
              }
            </strong>

          </div>

        </div>

      </section>

      {/* =================================================
          DAILY
      ================================================= */}

      <section className="report-section">

        <h2>
          Daily Registrations
        </h2>

        <ReportTable
          columns={[
            "Date",
            "Registrations",
          ]}
          rows={
            report?.daily?.map(
              (item) => [
                item.date,
                item.total,
              ]
            ) || []
          }
        />

      </section>

      {/* =================================================
          WEEKLY
      ================================================= */}

      <section className="report-section">

        <h2>
          Weekly Registrations
        </h2>

        <ReportTable
          columns={[
            "Week",
            "Week Start",
            "Registrations",
          ]}
          rows={
            report?.weekly?.map(
              (item) => [
                item.week,
                item.week_start,
                item.total,
              ]
            ) || []
          }
        />

      </section>

      {/* =================================================
          MONTHLY
      ================================================= */}

      <section className="report-section">

        <h2>
          Monthly Registrations
        </h2>

        <ReportTable
          columns={[
            "Month",
            "Registrations",
          ]}
          rows={
            report?.monthly?.map(
              (item) => [
                item.month,
                item.total,
              ]
            ) || []
          }
        />

      </section>

      {/* =================================================
          BY SIM TYPE
      ================================================= */}

      <section className="report-section">

        <h2>
          Registration by SIM Type
        </h2>

        <ReportTable
          columns={[
            "SIM Type",
            "Registrations",
          ]}
          rows={
            report?.by_sim_type?.map(
              (item) => [
                item.sim_type,
                item.registrations,
              ]
            ) || []
          }
        />

      </section>

      {/* =================================================
          BY AGENT
      ================================================= */}

      <section className="report-section">

        <h2>
          Registration by Agent
        </h2>

        <ReportTable
          columns={[
            "Agent",
            "Registrations",
          ]}
          rows={
            report?.by_agent?.map(
              (item) => [
                item.agent_name,
                item.registrations,
              ]
            ) || []
          }
        />

      </section>

      {/* =================================================
          REMAINING SIM
      ================================================= */}

      <section className="report-section">

        <h2>
          Remaining SIM / IMSI
        </h2>

        <ReportTable
          columns={[
            "SIM Type",
            "Available",
            "Registered",
            "Total",
          ]}
          rows={
            report?.remaining
              ?.by_sim_type
              ?.map(
                (item) => [
                  item.sim_type,
                  item.available,
                  item.registered,
                  item.total,
                ]
              ) || []
          }
        />

      </section>

      {/* =================================================
          REMAINING BY STATUS
      ================================================= */}

      <section className="report-section">

        <h2>
          SIM by Status
        </h2>

        <ReportTable
          columns={[
            "Status",
            "Total",
          ]}
          rows={
            report?.remaining
              ?.by_status
              ?.map(
                (item) => [
                  item.status,
                  item.total,
                ]
              ) || []
          }
        />

      </section>

      {/* =================================================
          SYSTEM SUMMARY
      ================================================= */}

      <section className="report-section">

        <h2>
          System Summary
        </h2>

        <div className="stats-grid">

          <div className="stat-card">

            <span>
              Customers
            </span>

            <strong>
              {
                report?.customers
                  ?.total ||
                0
              }
            </strong>

          </div>

          <div className="stat-card">

            <span>
              Agents
            </span>

            <strong>
              {
                report?.agents
                  ?.total ||
                0
              }
            </strong>

          </div>

          <div className="stat-card">

            <span>
              Users
            </span>

            <strong>
              {
                report?.users
                  ?.total ||
                0
              }
            </strong>

          </div>

        </div>

      </section>

    </div>
  );
}

// =====================================================
// REPORT TABLE
// =====================================================

function ReportTable({
  columns,
  rows,
}) {
  return (
    <div className="panel">

      <div className="table-wrapper">

        <table>

          <thead>

            <tr>

              {columns.map(
                (column) => (
                  <th
                    key={
                      column
                    }
                  >
                    {column}
                  </th>
                )
              )}

            </tr>

          </thead>

          <tbody>

            {!rows.length ? (
              <tr>

                <td
                  colSpan={
                    columns.length
                  }
                >
                  No data
                </td>

              </tr>
            ) : (
              rows.map(
                (
                  row,
                  index
                ) => (
                  <tr
                    key={
                      index
                    }
                  >

                    {row.map(
                      (
                        value,
                        cellIndex
                      ) => (
                        <td
                          key={
                            cellIndex
                          }
                        >
                          {
                            value ??
                            "-"
                          }
                        </td>
                      )
                    )}

                  </tr>
                )
              )
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default Reports;