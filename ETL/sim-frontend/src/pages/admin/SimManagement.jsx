import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";

function SimManagement() {
  const [sims, setSims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Dynamic Options State
  const [simTypes, setSimTypes] = useState([]);
  const [simStatuses, setSimStatuses] = useState([]);
  const [packages, setPackages] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [editingSim, setEditingSim] = useState(null);

  const [form, setForm] = useState({
    iccid: "",
    imsi: "",
    qr_code: "",
    id_package: "",
    phone_number: "",
    id_sim_type: 2,
    id_sim_status: 1,
    imported_by: "",
    id_file: "",
    link_url: "",
  });

  const currentUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  // =========================
  // EXPORT EXCEL
  // =========================
  const handleExport = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch("https://eltsimu.onrender.com/export/sims", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sim_cards.xlsx";

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("EXPORT SIM ERROR:", error);
      alert(error.message || "Failed to export SIM cards");
    }
  };

  // =========================
  // FETCH ALL DATA (SIMS, TYPES, STATUSES)
  // =========================
  const loadSims = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
    simsResponse,
    simTypesResponse,
    simStatusesResponse,
    packagesResponse
] = await Promise.all([
    apiFetch("/sims"),
    apiFetch("/sim-types"),
    apiFetch("/sim-status"),
    apiFetch("/packages?active=1")
]);

      setSims(simsResponse.data || []);
setSimTypes(simTypesResponse.data || []);
setSimStatuses(simStatusesResponse.data || []);
setPackages(packagesResponse.data || []);
    } catch (err) {
      console.error("GET SIM DATA ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSims();
  }, [loadSims]);

  // Reset pagination to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // =========================
  // FORM CHANGE
  // =========================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================
  // OPEN MODALS
  // =========================
  const openAddModal = () => {
    setEditingSim(null);

    setForm({
    iccid: "",
    imsi: "",
    qr_code: "",
    activation_code: "",
    id_package: packages[0]?.id_package || "",
    phone_number: "",
    id_sim_type: simTypes[0]?.id_sim_type || "",
    id_sim_status: simStatuses[0]?.id_sim_status || "",
    imported_by: currentUser?.id_user || "",
    id_file: ""
});

    setShowModal(true);
  };

  const openEditModal = (sim) => {
    setEditingSim(sim);

    setForm({
    iccid: sim.iccid || "",
    imsi: sim.imsi || "",
    qr_code: sim.qr_code || "",
    activation_code: sim.activation_code || "",
    id_package: sim.id_package || "",
    phone_number: sim.phone_number || "",
    id_sim_type: sim.id_sim_type || "",
    id_sim_status: sim.id_sim_status || "",
    imported_by: sim.imported_by || "",
    id_file: sim.id_file || ""
});

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSim(null);
  };

  // =========================
  // CREATE / UPDATE
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!form.iccid.trim() || !form.imsi.trim()) {
        alert("ICCID and IMSI are required");
        return;
      }

      const payload = {
    ...form,
    id_sim_type: Number(form.id_sim_type),
    id_sim_status: Number(form.id_sim_status),
    id_package: form.id_package
        ? Number(form.id_package)
        : null,
    imported_by: form.imported_by
        ? Number(form.imported_by)
        : null,
    id_file: form.id_file
        ? Number(form.id_file)
        : null
};
      if (editingSim) {
        await apiFetch(`/sims/${editingSim.id_sim}`, {
    method: "PUT",
    body: JSON.stringify(payload)
});

        alert("SIM updated successfully");
      } else {
        await apiFetch("/sims", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        alert("SIM created successfully");
      }

      closeModal();
      loadSims();
    } catch (err) {
      console.error("SAVE SIM ERROR:", err);
      alert(err.message || "Failed to save SIM");
    }
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this SIM?"
    );

    if (!confirmed) return;

    try {
      await apiFetch(`/sims/${id}`, {
    method: "DELETE"
});

      alert("SIM deleted successfully");
      loadSims();
    } catch (err) {
      console.error("DELETE SIM ERROR:", err);
      alert(err.message || "Failed to delete SIM");
    }
  };

  // =========================
  // FILTER & PAGINATION LOGIC
  // =========================
  const filteredSims = sims.filter((sim) => {
    const keyword = search.toLowerCase().trim();

    const matchesSearch =
      !keyword ||
      sim.iccid?.toLowerCase().includes(keyword) ||
      sim.imsi?.toLowerCase().includes(keyword) ||
      sim.phone_number?.toLowerCase().includes(keyword);

    const matchesStatus =
      statusFilter === "All" || sim.sim_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredSims.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSims = filteredSims.slice(startIndex, startIndex + pageSize);

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>SIM Management</h1>
          <p>Manage SIM cards and SIM inventory</p>
        </div>

        <div className="header-actions">
          <button className="secondary-button" onClick={handleExport}>
            Export Excel
          </button>
          <button className="primary-button" onClick={openAddModal}>
            + Add SIM
          </button>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="panel agent-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search ICCID, IMSI, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Status</option>
          {simStatuses.map((status) => (
            <option key={status.id_sim_status} value={status.sim_status}>
              {status.sim_status}
            </option>
          ))}
        </select>

        <div className="agent-count">
          Total: <strong>{filteredSims.length}</strong>
        </div>
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      {/* Table Section */}
      <div className="panel">
        {loading ? (
          <div className="loading-box">Loading SIM cards...</div>
        ) : (
          <div className="table-wrapper">
            <table className="agent-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ICCID</th>
                  <th>IMSI</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Package</th>
                  <th>File</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedSims.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty-row">
                      No SIM cards found
                    </td>
                  </tr>
                ) : (
                  paginatedSims.map((sim) => (
                    <tr key={sim.id_sim}>
                      <td>#{sim.id_sim}</td>
                      <td>{sim.iccid || "-"}</td>
                      <td>{sim.imsi || "-"}</td>
                      <td>{sim.phone_number || "-"}</td>
                      <td>{sim.sim_type || "-"}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            sim.sim_status === "Registered"
                              ? "status-success"
                              : sim.sim_status === "Available"
                              ? "status-info"
                              : "status-default"
                          }`}
                        >
                          {sim.sim_status || "-"}
                        </span>
                      </td>
                      <td>
    {sim.package_name ? (
        <div>
            <strong>
                {sim.package_name}
            </strong>

            <small>
                {sim.package_data_gb}GB /
                {sim.package_duration_days} Days
            </small>
        </div>
    ) : (
        "-"
    )}
</td>
                      <td>{sim.file_name || "-"}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="edit-button"
                            onClick={() => openEditModal(sim)}
                          >
                            Edit
                          </button>
                          <button
                            className="delete-button"
                            onClick={() => handleDelete(sim.id_sim)}
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                className="pagination-bar"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem 0",
                }}
              >
                <span>
                  Page {currentPage} of {totalPages} ({filteredSims.length} items)
                </span>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="secondary-button"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="secondary-button"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Section */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card sim-modal">
            <div className="modal-header">
              <div>
                <h2>{editingSim ? "Edit SIM" : "Add SIM"}</h2>
                <p>
                  {editingSim
                    ? "Update SIM information"
                    : "Create a new SIM card"}
                </p>
              </div>

              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>ICCID *</label>
                  <input
                    type="text"
                    name="iccid"
                    value={form.iccid}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>IMSI *</label>
                  <input
                    type="text"
                    name="imsi"
                    value={form.imsi}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleChange}
                    placeholder="020xxxxxxxx"
                  />
                </div>

                <div className="form-group">
    <label>Package</label>

    <select
        name="id_package"
        value={form.id_package}
        onChange={handleChange}
        required
    >
        <option value="">
            Select Package
        </option>

        {packages.map((pkg) => (
            <option
                key={pkg.id_package}
                value={pkg.id_package}
            >
                {pkg.package_name}
                {" - "}
                {pkg.data_gb}GB /
                {pkg.duration_days} Days
            </option>
        ))}
    </select>
</div>

                <div className="form-group">
                  <label>SIM Type</label>
                  <select
                    name="id_sim_type"
                    value={form.id_sim_type}
                    onChange={handleChange}
                  >
                    <option value="">Select SIM type</option>
                    {simTypes.map((type) => (
                      <option
                        key={type.id_sim_type}
                        value={type.id_sim_type}
                      >
                        {type.sim_type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>SIM Status</label>
                  <select
                    name="id_sim_status"
                    value={form.id_sim_status}
                    onChange={handleChange}
                  >
                    <option value="">Select SIM status</option>
                    {simStatuses.map((status) => (
                      <option
                        key={status.id_sim_status}
                        value={status.id_sim_status}
                      >
                        {status.sim_status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>File ID</label>
                  <input
                    type="number"
                    name="id_file"
                    value={form.id_file}
                    onChange={handleChange}
                    placeholder="2"
                  />
                </div>

                <div className="form-group">
                  <label>QR Code</label>
                  <input
                    type="text"
                    name="qr_code"
                    value={form.qr_code}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Link URL</label>
                <input
                  type="text"
                  name="link_url"
                  value={form.link_url}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-button">
                  {editingSim ? "Update SIM" : "Create SIM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SimManagement;