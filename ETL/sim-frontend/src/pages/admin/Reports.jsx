import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch } from "../../api";

const REPORT_FILTERS = [
  { id: "all", label: "All reports" },
  { id: "time", label: "By time" },
  { id: "registration", label: "Registrations" },
  { id: "inventory", label: "SIM stock" },
];

const numberText = (value) =>
  Number(value ?? 0).toLocaleString();

function makeRows(items, fields) {
  if (!Array.isArray(items)) return [];

  return items.map((item) =>
    fields.map((field) => item?.[field] ?? "-"),
  );
}

function Reports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/reports/dashboard");

      setReport(response?.data || null);
    } catch (err) {
      console.error("REPORT ERROR:", err);
      setError(err?.message || "Unable to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const sections = useMemo(
    () => [
      {
        id: "daily",
        category: "time",
        title: "Daily registrations",
        description: "Registration totals grouped by date.",
        columns: ["Date", "Registrations"],
        rows: makeRows(report?.daily, ["date", "total"]),
      },
      {
        id: "weekly",
        category: "time",
        title: "Weekly registrations",
        description: "Compare totals by week and week-start date.",
        columns: ["Week", "Week start", "Registrations"],
        rows: makeRows(report?.weekly, [
          "week",
          "week_start",
          "total",
        ]),
      },
      {
        id: "monthly",
        category: "time",
        title: "Monthly registrations",
        description: "Registration totals grouped by month.",
        columns: ["Month", "Registrations"],
        rows: makeRows(report?.monthly, ["month", "total"]),
      },
      {
        id: "by-sim-type",
        category: "registration",
        title: "Registrations by SIM type",
        description: "See which SIM types are most frequently registered.",
        columns: ["SIM type", "Registrations"],
        rows: makeRows(report?.by_sim_type, [
          "sim_type",
          "registrations",
        ]),
      },
      {
        id: "by-agent",
        category: "registration",
        title: "Registrations by agent",
        description: "Compare registration totals by referral agent.",
        columns: ["Agent", "Registrations"],
        rows: makeRows(report?.by_agent, [
          "agent_name",
          "registrations",
        ]),
      },
      {
        id: "remaining-by-type",
        category: "inventory",
        title: "Remaining SIM by type",
        description: "Check available and registered SIM quantities.",
        columns: ["SIM type", "Available", "Registered", "Total"],
        rows: makeRows(report?.remaining?.by_sim_type, [
          "sim_type",
          "available",
          "registered",
          "total",
        ]),
      },
      {
        id: "by-status",
        category: "inventory",
        title: "SIM stock by status",
        description: "Review the number of SIM cards in each status.",
        columns: ["Status", "Total"],
        rows: makeRows(report?.remaining?.by_status, [
          "status",
          "total",
        ]),
      },
    ],
    [report],
  );

  const visibleSections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return sections
      .filter(
        (section) =>
          activeFilter === "all" ||
          section.category === activeFilter,
      )
      .map((section) => {
        const rows = query
          ? section.rows.filter((row) =>
              [section.title, ...section.columns, ...row]
                .join(" ")
                .toLocaleLowerCase()
                .includes(query),
            )
          : section.rows;

        return {
          ...section,
          rows,
          originalRowCount: section.rows.length,
        };
      })
      .filter((section) => !query || section.rows.length > 0);
  }, [sections, search, activeFilter]);

  const visibleRowCount = visibleSections.reduce(
    (total, section) => total + section.rows.length,
    0,
  );

  const exportCsv = useCallback(() => {
    const csvRows = [
      ["ETL SIM registration report"],
      ["Exported at", new Date().toLocaleString()],
      [
        "Filter",
        REPORT_FILTERS.find((item) => item.id === activeFilter)
          ?.label || "All reports",
      ],
      ["Search", search.trim() || "(none)"],
      [],
    ];

    visibleSections.forEach((section) => {
      csvRows.push([section.title]);
      csvRows.push(section.columns);

      section.rows.forEach((row) => {
        csvRows.push(row);
      });

      csvRows.push([]);
    });

    const csvText =
      "\uFEFF" +
      csvRows
        .map((row) =>
          row
            .map((value) => {
              const safe = String(value ?? "").replace(/"/g, '""');
              return `"${safe}"`;
            })
            .join(","),
        )
        .join("\r\n");

    const blob = new Blob([csvText], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `sim-reports-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [visibleSections, activeFilter, search]);

  if (loading && !report) {
    return (
      <div className="page-container report-page">
        <div className="page-header">
          <div>
            <h1>Reports</h1>
            <p>
              Registration performance and SIM inventory at a glance.
            </p>
          </div>
        </div>

        <div className="panel loading-box" role="status">
          Loading reports…
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="page-container report-page">
        <div className="page-header">
          <div>
            <h1>Reports</h1>
            <p>
              Registration performance and SIM inventory at a glance.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={loadReport}
            disabled={loading}
          >
            {loading ? "Retrying…" : "Try again"}
          </button>
        </div>

        <div className="dashboard-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  const registrationSummary = [
    {
      label: "Pending",
      value: report?.registrations?.pending,
      tone: "neutral",
    },
    {
      label: "Approved",
      value: report?.registrations?.approved,
      tone: "success",
    },
    {
      label: "Rejected",
      value: report?.registrations?.rejected,
      tone: "danger",
    },
  ];

  const simSummary = [
    { label: "Total SIM", value: report?.sim?.total },
    {
      label: "Available",
      value: report?.sim?.available,
      tone: "success",
    },
    {
      label: "Registered",
      value: report?.sim?.registered,
    },
    {
      label: "Reserved",
      value: report?.sim?.reserved,
      tone: "warning",
    },
    {
      label: "Blocked",
      value: report?.sim?.blocked,
      tone: "danger",
    },
  ];

  const systemSummary = [
    { label: "Customers", value: report?.customers?.total },
    { label: "Agents", value: report?.agents?.total },
    { label: "Users", value: report?.users?.total },
  ];

  return (
    <div className="page-container report-page">
      <div className="page-header report-page-header">
        <div>
          <span className="report-eyebrow">
            ANALYTICS &amp; OVERVIEW
          </span>

          <h1>Reports</h1>

          <p>
            Track registrations, compare performance, and check SIM stock.
          </p>
        </div>

        <div className="report-header-actions">
          <span className="report-updated" aria-live="polite">
            {loading ? "Updating data…" : "Latest available data"}
          </span>

          <button
            type="button"
            className="secondary-button"
            onClick={loadReport}
            disabled={loading}
          >
            <span aria-hidden="true">↻</span>{" "}
            {loading ? "Refreshing…" : "Refresh"}
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={exportCsv}
            disabled={!visibleSections.length}
          >
            <span aria-hidden="true">↓</span> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="dashboard-error" role="alert">
          Could not refresh data: {error}. Showing the last loaded report.
        </div>
      )}

      <section
        className="report-kpi-grid"
        aria-label="Registration overview"
      >
        <MetricCard
          label="Today"
          value={report?.periods?.today}
          note="Registrations today"
          accent="slate"
        />

        <MetricCard
          label="This week"
          value={report?.periods?.this_week}
          note="Current week"
          accent="blue"
        />

        <MetricCard
          label="This month"
          value={report?.periods?.this_month}
          note="Current month"
          accent="teal"
        />

        <MetricCard
          label="All registrations"
          value={report?.registrations?.total}
          note="Total recorded"
          accent="neutral"
        />
      </section>

      <div className="report-overview-grid">
        <section className="panel report-overview-panel">
          <div className="report-panel-heading">
            <div>
              <h2>Registration status</h2>
              <p>Current review progress</p>
            </div>
          </div>

          <div className="report-compact-stats report-three-stats">
            {registrationSummary.map((item) => (
              <CompactMetric key={item.label} {...item} />
            ))}
          </div>
        </section>

        <section className="panel report-overview-panel">
          <div className="report-panel-heading">
            <div>
              <h2>SIM inventory</h2>
              <p>Current SIM card quantities</p>
            </div>
          </div>

          <div className="report-compact-stats report-five-stats">
            {simSummary.map((item) => (
              <CompactMetric key={item.label} {...item} />
            ))}
          </div>
        </section>
      </div>

      <section
        className="report-browser panel"
        aria-label="Filter reports"
      >
        <div className="report-browser-heading">
          <div>
            <h2>Explore reports</h2>
            <p>
              Filter a category or search for a date, SIM type, agent, or
              status.
            </p>
          </div>

          <span className="report-result-count">
            {numberText(visibleRowCount)} rows
          </span>
        </div>

        <div className="report-toolbar">
          <label className="report-search-wrap">
            <span className="report-search-icon" aria-hidden="true">
              ⌕
            </span>

            <span className="visually-hidden">Search reports</span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search date, SIM type, agent, status…"
              className="report-search"
            />

            {search && (
              <button
                type="button"
                className="report-clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>

          <div
            className="report-filter-tabs"
            role="group"
            aria-label="Report category"
          >
            {REPORT_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`report-filter-tab${
                  activeFilter === filter.id ? " active" : ""
                }`}
                aria-pressed={activeFilter === filter.id}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="report-tables-list">
        {!visibleSections.length ? (
          <div className="panel report-empty-state">
            <span className="report-empty-icon" aria-hidden="true">
              ⌕
            </span>

            <h2>No matching report rows</h2>

            <p>
              Try another search term or choose a different report category.
            </p>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSearch("");
                setActiveFilter("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          visibleSections.map((section) => (
            <ReportTable
              key={section.id}
              section={section}
              searchActive={Boolean(search.trim())}
            />
          ))
        )}
      </div>

      <section className="panel report-system-summary">
        <div className="report-panel-heading">
          <div>
            <h2>System summary</h2>
            <p>Overall records currently available in the system.</p>
          </div>
        </div>

        <div className="report-compact-stats report-three-stats">
          {systemSummary.map((item) => (
            <CompactMetric key={item.label} {...item} />
          ))}
        </div>
      </section>

      <p className="report-footnote">
        Report values are based on the latest data returned by the system. Use
        Refresh to request the latest summary.
      </p>
    </div>
  );
}

function MetricCard({ label, value, note, accent }) {
  return (
    <div className={`report-metric-card accent-${accent}`}>
      <span className="report-metric-label">{label}</span>
      <strong>{numberText(value)}</strong>
      <small>{note}</small>
    </div>
  );
}

function CompactMetric({ label, value, tone = "neutral" }) {
  return (
    <div className={`report-compact-metric tone-${tone}`}>
      <span>{label}</span>
      <strong>{numberText(value)}</strong>
    </div>
  );
}

function ReportTable({ section, searchActive }) {
  return (
    <section
      className="report-table-section"
      id={`report-${section.id}`}
    >
      <div className="report-section-heading">
        <div>
          <h2>{section.title}</h2>
          <p>{section.description}</p>
        </div>

        <span className="report-table-count">
          {numberText(section.rows.length)}{" "}
          {section.rows.length === 1 ? "record" : "records"}
        </span>
      </div>

      <div className="panel report-table-panel">
        <div className="table-wrapper report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                {section.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!section.rows.length ? (
                <tr>
                  <td
                    className="report-no-data"
                    colSpan={section.columns.length}
                  >
                    {searchActive
                      ? "No rows match this search."
                      : "No data available for this report yet."}
                  </td>
                </tr>
              ) : (
                section.rows.map((row, rowIndex) => (
                  <tr key={`${section.id}-${rowIndex}`}>
                    {row.map((value, cellIndex) => (
                      <td key={`${section.id}-${rowIndex}-${cellIndex}`}>
                        {value == null || value === "" ? "—" : value}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default Reports;