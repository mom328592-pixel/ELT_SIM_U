import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";
import ConfirmModal from "../../components/ConfirmModal";

function FileHistory() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/sim-files/history");
      setFiles(response.data || []);
    } catch (err) {
      console.error("FILE HISTORY ERROR:", err);
      setError(err.message || "Failed to load file history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDelete = async () => {
  if (!deleteId) return;

  try {
    setDeleting(true);

    await apiFetch(
      `/sim-files/history/${deleteId}`,
      {
        method: "DELETE",
      }
    );

    setDeleteId(null);

    await loadFiles();

  } catch (err) {
    console.error(
      "DELETE FILE HISTORY ERROR:",
      err
    );

    setError(
      err.message ||
      "Failed to delete file history"
    );
  } finally {
    setDeleting(false);
  }
};

  const viewFile = async (id) => {
    try {
      setLoadingDetails(true);
      setError("");
      
      const response = await apiFetch(`/sim-files/history/${id}`);
      setSelectedFile(response.data || null);
      setShowDetails(true);
    } catch (err) {
      console.error("VIEW FILE ERROR:", err);
      setError(err.message || "Failed to load SIM file details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedFile(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>SIM File History</h1>
          <p>View imported SIM files and their associated SIM records</p>
        </div>
        <ConfirmModal
  open={deleteId !== null}
  title="Delete Imported File"
  message="Deleting this file will remove the file history and hide all SIM records imported from this file. Continue?"
  confirmText="Delete"
  cancelText="Cancel"
  danger={true}
  loading={deleting}
  onCancel={() =>
    setDeleteId(null)
  }
  onConfirm={handleDelete}
/>

        <button className="secondary-button" onClick={loadFiles} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      <div className="panel">
        {loading ? (
          <div className="loading-box">Loading file history...</div>
        ) : (
          <div className="table-wrapper">
            <table className="agent-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>File Name</th>
                  <th>Agent</th>
                  <th>Total SIM</th>
                  <th>Imported At</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {files.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-row">
                      No file history found
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr key={file.id_file}>
                      <td>#{file.id_file}</td>
                      <td>
                        <strong>{file.file_name}</strong>
                      </td>
                      <td>{file.agent_name || "-"}</td>
                      <td>{file.total_sim ?? 0}</td>
                      <td>
                        {file.created_at
                          ? new Date(file.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td>
  <div className="action-buttons">

    <button
      className="view-button"
      onClick={() =>
        viewFile(file.id_file)
      }
    >
      View SIMs
    </button>

    <button
      className="delete-button"
      onClick={() =>
        setDeleteId(file.id_file)
      }
    >
      Delete
    </button>

  </div>
</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILS MODAL */}
      {showDetails && selectedFile && (
        <div className="modal-overlay">
          <div className="modal-card sim-modal">
            <div className="modal-header">
              <div>
                <h2>{selectedFile.file_name}</h2>
                <p>Agent: {selectedFile.agent_name || "-"}</p>
              </div>

              <button className="modal-close" onClick={closeDetails}>
                ×
              </button>
            </div>

            <div className="table-wrapper">
              <table className="agent-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>ICCID</th>
                    <th>IMSI</th>
                    <th>Phone</th>
                    <th>Package</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {!selectedFile.sims || selectedFile.sims.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-row">
                        No SIMs found in this file
                      </td>
                    </tr>
                  ) : (
                    selectedFile.sims.map((sim) => (
                      <tr key={sim.id_sim}>
                        <td>#{sim.id_sim}</td>
                        <td>{sim.iccid || "-"}</td>
                        <td>{sim.imsi || "-"}</td>
                        <td>{sim.phone_number || "-"}</td>
                        <td>{sim.package || "-"}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              sim.sim_status_name === "Available" || sim.id_sim_status === 1
                                ? "status-success"
                                : sim.sim_status_name === "Assigned" || sim.id_sim_status === 2
                                ? "status-info"
                                : "status-default"
                            }`}
                          >
                            {sim.sim_status_name || `Status #${sim.id_sim_status}`}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeDetails}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FileHistory;