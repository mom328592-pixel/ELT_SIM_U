import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { apiFetch } from "../../api";

function Agents() {
  const [
    agents,
    setAgents,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    pageSize,
    setPageSize,
  ] = useState(10);

  const [
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    editingAgent,
    setEditingAgent,
  ] = useState(null);

  const [
    copiedId,
    setCopiedId,
  ] = useState(null);

  const [
    form,
    setForm,
  ] = useState({
    agent_name: "",
    contact_phone: "",
    contact_email: "",
    address: "",
  });

  // ===================================================
  // CURRENT USER
  // ===================================================

  const currentUser =
    (() => {
      try {
        return JSON.parse(
          localStorage.getItem(
            "user"
          ) || "null"
        );
      } catch {
        return null;
      }
    })();

  // ===================================================
  // LOAD AGENTS
  // ===================================================

  const loadAgents =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await apiFetch(
            "/agents"
          );

        setAgents(
          response.data || []
        );
      } catch (err) {
        console.error(
          "GET AGENTS ERROR:",
          err
        );

        setError(
          err.message ||
            "Failed to load agents"
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // ===================================================
  // FORM CHANGE
  // ===================================================

  const handleChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setForm(
        (prev) => ({
          ...prev,
          [name]:
            value,
        })
      );
    };

  // ===================================================
  // ADD
  // ===================================================

  const openAddModal =
    () => {
      setEditingAgent(
        null
      );

      setForm({
        agent_name: "",
        contact_phone: "",
        contact_email: "",
        address: "",
      });

      setShowModal(
        true
      );
    };

  // ===================================================
  // EDIT
  // ===================================================

  const openEditModal =
    (agent) => {
      setEditingAgent(
        agent
      );

      setForm({
        agent_name:
          agent.agent_name ||
          "",

        contact_phone:
          agent.contact_phone ||
          "",

        contact_email:
          agent.contact_email ||
          "",

        address:
          agent.address ||
          "",
      });

      setShowModal(
        true
      );
    };

  // ===================================================
  // CLOSE
  // ===================================================

  const closeModal =
    () => {
      setShowModal(
        false
      );

      setEditingAgent(
        null
      );
    };

  // ===================================================
  // SAVE
  // ===================================================

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      try {
        if (
          !form.agent_name.trim()
        ) {
          alert(
            "Agent name is required"
          );

          return;
        }

        const payload =
          {
            agent_name:
              form.agent_name.trim(),

            contact_phone:
              form.contact_phone.trim() ||
              null,

            contact_email:
              form.contact_email.trim() ||
              null,

            address:
              form.address.trim() ||
              null,
          };

        if (
          editingAgent
        ) {
          await apiFetch(
            `/agents/${editingAgent.id_agent}`,
            {
              method:
                "PUT",

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

          alert(
            "Agent updated successfully"
          );
        } else {
          await apiFetch(
            "/agents",
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  ...payload,

                  created_by:
                    currentUser?.id_user ||
                    null,
                }),
            }
          );

          alert(
            "Agent created successfully"
          );
        }

        closeModal();

        await loadAgents();
      } catch (err) {
        console.error(
          "SAVE AGENT ERROR:",
          err
        );

        alert(
          err.message ||
            "Failed to save agent"
        );
      }
    };

  // ===================================================
  // DELETE
  // ===================================================

  const handleDelete =
    async (id) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to delete this agent?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await apiFetch(
          `/agents/${id}`,
          {
            method:
              "DELETE",
          }
        );

        alert(
          "Agent deleted successfully"
        );

        await loadAgents();
      } catch (err) {
        console.error(
          "DELETE AGENT ERROR:",
          err
        );

        alert(
          err.message ||
            "Failed to delete agent"
        );
      }
    };

  // ===================================================
  // COPY PUBLIC LINK
  // ===================================================

  const copyPublicLink =
    async (
      agent
    ) => {
      if (
        !agent.public_url
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          agent.public_url
        );

        setCopiedId(
          agent.id_agent
        );

        setTimeout(
          () =>
            setCopiedId(
              null
            ),
          1500
        );
      } catch (error) {
        console.error(
          "COPY LINK ERROR:",
          error
        );

        window.prompt(
          "Copy this Agent registration link:",
          agent.public_url
        );
      }
    };

  // ===================================================
  // FILTER
  // ===================================================

  const filteredAgents =
    agents.filter(
      (agent) => {
        const keyword =
          search
            .toLowerCase()
            .trim();

        return (
          agent.agent_name
            ?.toLowerCase()
            .includes(
              keyword
            ) ||
          agent.contact_phone
            ?.toLowerCase()
            .includes(
              keyword
            ) ||
          agent.contact_email
            ?.toLowerCase()
            .includes(
              keyword
            ) ||
          agent.address
            ?.toLowerCase()
            .includes(
              keyword
            )
        );
      }
    );

  // ===================================================
  // PAGINATION
  // ===================================================

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredAgents.length /
          pageSize
      )
    );

  const startIndex =
    (currentPage - 1) *
    pageSize;

  const paginatedAgents =
    filteredAgents.slice(
      startIndex,
      startIndex +
        pageSize
    );

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="page-container">

      {/* HEADER */}

      <div className="page-header">

        <div>
          <h1>
            Agent Management
          </h1>

          <p>
            Manage SIM agents and distributors
          </p>
        </div>

        <button
          className="primary-button"
          onClick={
            openAddModal
          }
        >
          + Add Agent
        </button>

      </div>

      {/* SEARCH */}

      <div className="panel agent-toolbar">

        <input
          type="text"
          className="search-input"
          placeholder="Search agent..."
          value={
            search
          }
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
        />

        <div className="agent-count">
          Total:{" "}
          <strong>
            {
              filteredAgents.length
            }
          </strong>
        </div>

      </div>

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      {/* TABLE */}

      <div className="panel">

        {loading ? (
          <div className="loading-box">
            Loading agents...
          </div>
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

                {paginatedAgents.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="empty-row"
                    >
                      No agents found
                    </td>
                  </tr>
                ) : (
                  paginatedAgents.map(
                    (agent) => (
                      <tr
                        key={
                          agent.id_agent
                        }
                      >

                        <td>
                          #
                          {
                            agent.id_agent
                          }
                        </td>

                        <td>

                          <div className="agent-name-cell">

                            <div className="agent-avatar">

                              {(
                                agent.agent_name ||
                                "A"
                              )
                                .charAt(
                                  0
                                )
                                .toUpperCase()}

                            </div>

                            <strong>
                              {
                                agent.agent_name
                              }
                            </strong>

                          </div>

                        </td>

                        <td>
                          {
                            agent.contact_phone ||
                            "-"
                          }
                        </td>

                        <td>
                          {
                            agent.contact_email ||
                            "-"
                          }
                        </td>

                        <td>
                          {
                            agent.address ||
                            "-"
                          }
                        </td>

                        <td>
                          {
                            agent.created_by_username ||
                            "-"
                          }
                        </td>

                        <td>

                          <div className="action-buttons">

                            <button
                              className="edit-button"
                              onClick={() =>
                                openEditModal(
                                  agent
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="delete-button"
                              onClick={() =>
                                handleDelete(
                                  agent.id_agent
                                )
                              }
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                        <td>

                          {agent.public_url ? (
                            <div
                              style={{
                                display:
                                  "flex",
                                flexDirection:
                                  "column",
                                gap:
                                  "0.4rem",
                              }}
                            >

                              <a
                                href={
                                  agent.public_url
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open Link
                              </a>

                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() =>
                                  copyPublicLink(
                                    agent
                                  )
                                }
                              >
                                {copiedId ===
                                agent.id_agent
                                  ? "Copied!"
                                  : "Copy Link"}
                              </button>

                            </div>
                          ) : (
                            "-"
                          )}

                        </td>

                        <td>

                          <div>
                            Total:{" "}
                            <strong>
                              {
                                agent.total_registrations ||
                                0
                              }
                            </strong>
                          </div>

                          <div>
                            Pending:{" "}
                            {
                              agent.pending_registrations ||
                              0
                            }
                          </div>

                          <div>
                            Approved:{" "}
                            {
                              agent.approved_registrations ||
                              0
                            }
                          </div>

                          <div>
                            Rejected:{" "}
                            {
                              agent.rejected_registrations ||
                              0
                            }
                          </div>

                        </td>

                      </tr>
                    )
                  )
                )}

              </tbody>

            </table>

            {/* PAGINATION */}

            <div
              className="pagination-bar"
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                padding:
                  "1rem 0",
              }}
            >

              <div>

                Page{" "}
                {
                  currentPage
                }{" "}
                of{" "}
                {
                  totalPages
                }

                {" "}

                (
                {
                  filteredAgents.length
                }{" "}
                items)

              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap:
                    "0.5rem",
                }}
              >

                <button
                  className="secondary-button"
                  disabled={
                    currentPage ===
                    1
                  }
                  onClick={() =>
                    setCurrentPage(
                      (
                        prev
                      ) =>
                        prev -
                        1
                    )
                  }
                >
                  Previous
                </button>

                <select
                  value={
                    pageSize
                  }
                  onChange={(
                    event
                  ) => {
                    setPageSize(
                      Number(
                        event.target.value
                      )
                    );

                    setCurrentPage(
                      1
                    );
                  }}
                >
                  <option value="10">
                    10
                  </option>
                  <option value="20">
                    20
                  </option>
                  <option value="50">
                    50
                  </option>
                </select>

                <button
                  className="secondary-button"
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      (
                        prev
                      ) =>
                        prev +
                        1
                    )
                  }
                >
                  Next
                </button>

              </div>

            </div>

          </div>
        )}

      </div>

      {/* MODAL */}

      {showModal && (
        <div className="modal-overlay">

          <div className="modal-card">

            <div className="modal-header">

              <div>

                <h2>
                  {editingAgent
                    ? "Edit Agent"
                    : "Add Agent"}
                </h2>

                <p>
                  {editingAgent
                    ? "Update agent information"
                    : "Create a new agent"}
                </p>

              </div>

              <button
                className="modal-close"
                onClick={
                  closeModal
                }
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >

              <div className="form-group">

                <label>
                  Agent Name *
                </label>

                <input
                  type="text"
                  name="agent_name"
                  value={
                    form.agent_name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter agent name"
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Contact Phone
                </label>

                <input
                  type="text"
                  name="contact_phone"
                  value={
                    form.contact_phone
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="020xxxxxxxx"
                />

              </div>

              <div className="form-group">

                <label>
                  Contact Email
                </label>

                <input
                  type="email"
                  name="contact_email"
                  value={
                    form.contact_email
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="agent@example.com"
                />

              </div>

              <div className="form-group">

                <label>
                  Address
                </label>

                <textarea
                  name="address"
                  value={
                    form.address
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter address"
                  rows="3"
                />

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingAgent
                    ? "Update Agent"
                    : "Create Agent"}
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