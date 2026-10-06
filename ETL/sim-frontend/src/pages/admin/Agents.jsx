import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";

function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);

  const [form, setForm] = useState({
    agent_name: "",
    contact_phone: "",
    contact_email: "",
    address: "",
  });

  const currentUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  // =========================
  // GET AGENTS
  // =========================
  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/agents");

      setAgents(response.data || []);
    } catch (err) {
      console.error("GET AGENTS ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Reset to page 1 when search keyword changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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
  // OPEN ADD MODAL
  // =========================
  const openAddModal = () => {
    setEditingAgent(null);

    setForm({
      agent_name: "",
      contact_phone: "",
      contact_email: "",
      address: "",
    });

    setShowModal(true);
  };

  // =========================
  // OPEN EDIT MODAL
  // =========================
  const openEditModal = (agent) => {
    setEditingAgent(agent);

    setForm({
      agent_name: agent.agent_name || "",
      contact_phone: agent.contact_phone || "",
      contact_email: agent.contact_email || "",
      address: agent.address || "",
    });

    setShowModal(true);
  };

  // =========================
  // CLOSE MODAL
  // =========================
  const closeModal = () => {
    setShowModal(false);
    setEditingAgent(null);
  };

  // =========================
  // ADD / EDIT
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!form.agent_name.trim()) {
        alert("Agent name is required");
        return;
      }

      if (editingAgent) {
        await apiFetch(`/agents/${editingAgent.id_agent}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });

        alert("Agent updated successfully");
      } else {
        await apiFetch("/agents", {
          method: "POST",
          body: JSON.stringify({
            ...form,
            created_by: currentUser?.id_user || null,
          }),
        });

        alert("Agent created successfully");
      }

      closeModal();
      loadAgents();
    } catch (err) {
      console.error("SAVE AGENT ERROR:", err);

      alert(err.message || "Failed to save agent");
    }
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this agent?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiFetch(`/agents/${id}`, {
        method: "DELETE",
      });

      alert("Agent deleted successfully");

      loadAgents();
    } catch (err) {
      console.error("DELETE AGENT ERROR:", err);

      alert(err.message || "Failed to delete agent");
    }
  };

  // =========================
  // SEARCH
  // =========================
  const filteredAgents = agents.filter((agent) => {
    const keyword = search.toLowerCase().trim();

    return (
      agent.agent_name?.toLowerCase().includes(keyword) ||
      agent.contact_phone?.toLowerCase().includes(keyword) ||
      agent.contact_email?.toLowerCase().includes(keyword) ||
      agent.address?.toLowerCase().includes(keyword)
    );
  });

  // =========================
  // PAGINATION LOGIC
  // =========================
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAgents.length / pageSize)
  );

  const startIndex = (currentPage - 1) * pageSize;

  const paginatedAgents = filteredAgents.slice(
    startIndex,
    startIndex + pageSize
  );

  return (
    <div className="page-container">
      {/* =========================
          HEADER
      ========================= */}
      <div className="page-header">
        <div>
          <h1>Agent Management</h1>
          <p>Manage SIM agents and distributors</p>
        </div>

        <button className="primary-button" onClick={openAddModal}>
          + Add Agent
        </button>
      </div>

      {/* =========================
          TOOLBAR
      ========================= */}
      <div className="panel agent-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search agent..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="agent-count">
          Total: <strong>{filteredAgents.length}</strong>
        </div>
      </div>

      {/* =========================
          ERROR
      ========================= */}
      {error && <div className="dashboard-error">{error}</div>}

      {/* =========================
          TABLE
      ========================= */}
      <div className="panel">
        {loading ? (
          <div className="loading-box">Loading agents...</div>
        ) : (
          <div className="table-wrapper">
            <table className="agent-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Agent Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Created By</th>
                  <th>Actions</th>
                  <th>Public Link</th>
                  <th>Registrations</th>
                </tr>
              </thead>

              <tbody>
                {paginatedAgents.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty-row">
                      No agents found
                    </td>
                  </tr>
                ) : (
                  paginatedAgents.map((agent) => (
                    <tr key={agent.id_agent}>
                      <td>#{agent.id_agent}</td>

                      <td>
                        <div className="agent-name-cell">
                          <div className="agent-avatar">
                            {agent.agent_name?.charAt(0).toUpperCase()}
                          </div>

                          <strong>{agent.agent_name}</strong>
                        </div>
                      </td>

                      <td>{agent.contact_phone || "-"}</td>

                      <td>{agent.contact_email || "-"}</td>

                      <td>{agent.address || "-"}</td>

                      <td>{agent.created_by_username || "-"}</td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="edit-button"
                            onClick={() => openEditModal(agent)}
                          >
                            Edit
                          </button>

                          <button
                            className="delete-button"
                            onClick={() => handleDelete(agent.id_agent)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>

                      <td>
                        {agent.public_url ? (
                          <div>
                            <a
                              href={agent.public_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open Link
                            </a>

                            <button
                              type="button"
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  agent.public_url
                                )
                              }
                            >
                              Copy
                            </button>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td>
                        <div>
                          Total: {agent.total_registrations || 0}
                        </div>

                        <div>
                          Pending: {agent.pending_registrations || 0}
                        </div>

                        <div>
                          Approved: {agent.approved_registrations || 0}
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
                  Page {currentPage} of {totalPages} ({filteredAgents.length} items)
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

      {/* =========================
          MODAL
      ========================= */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>{editingAgent ? "Edit Agent" : "Add Agent"}</h2>
                <p>
                  {editingAgent
                    ? "Update agent information"
                    : "Create a new agent"}
                </p>
              </div>

              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Agent Name *</label>
                <input
                  type="text"
                  name="agent_name"
                  value={form.agent_name}
                  onChange={handleChange}
                  placeholder="Enter agent name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contact Phone</label>
                <input
                  type="text"
                  name="contact_phone"
                  value={form.contact_phone}
                  onChange={handleChange}
                  placeholder="020xxxxxxxx"
                />
              </div>

              <div className="form-group">
                <label>Contact Email</label>
                <input
                  type="email"
                  name="contact_email"
                  value={form.contact_email}
                  onChange={handleChange}
                  placeholder="agent@example.com"
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter address"
                  rows="3"
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
                  {editingAgent ? "Update Agent" : "Create Agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Agents;