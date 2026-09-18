import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/audit-logs");

      setLogs(response.data || []);
    } catch (err) {
      console.error("AUDIT LOG ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = logs.filter((log) => {
    const keyword = search.toLowerCase();

    return (
      log.username?.toLowerCase().includes(keyword) ||
      log.fullname?.toLowerCase().includes(keyword) ||
      log.action?.toLowerCase().includes(keyword) ||
      log.target_entity?.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="page-container">

      <div className="page-header">
        <div>
          <h1>Audit Logs</h1>
          <p>
            Monitor system activities and user actions
          </p>
        </div>
      </div>

      <div className="panel agent-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search user, action, entity..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <div className="agent-count">
          Total: <strong>{filteredLogs.length}</strong>
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      <div className="panel">

        {loading ? (
          <div className="loading-box">
            Loading audit logs...
          </div>
        ) : (
          <div className="table-wrapper">

            <table className="agent-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Target ID</th>
                  <th>IP Address</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>

                {filteredLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="empty-row"
                    >
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id_audit_log}
                    >
                      <td>
                        #{log.id_audit_log}
                      </td>

                      <td>
                        {log.fullname ||
                          log.username ||
                          "-"}
                      </td>

                      <td>
                        <span className="status-badge status-info">
                          {log.action}
                        </span>
                      </td>

                      <td>
                        {log.target_entity || "-"}
                      </td>

                      <td>
                        {log.target_id || "-"}
                      </td>

                      <td>
                        {log.ip_address || "-"}
                      </td>

                      <td>
                        {log.created_at
                          ? new Date(
                              log.created_at
                            ).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>
    </div>
  );
}

export default AuditLogs;