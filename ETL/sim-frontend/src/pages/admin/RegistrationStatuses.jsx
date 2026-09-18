import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";
import ConfirmModal from "../../components/ConfirmModal";

function RegistrationStatuses() {
  const [statuses, setStatuses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [editingStatus, setEditingStatus] =
    useState(null);

  const [deleteId, setDeleteId] =
    useState(null);

  const [deleting, setDeleting] =
    useState(false);

  const [form, setForm] = useState({
    status_name: "",
    description: "",
  });

  // =========================
  // GET
  // =========================
  const loadStatuses = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await apiFetch(
            "/registration-status"
          );

        setStatuses(
          response.data || []
        );
      } catch (err) {
        console.error(
          "LOAD REGISTRATION STATUS ERROR:",
          err
        );

        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  // =========================
  // ADD
  // =========================
  const openAddModal = () => {
    setEditingStatus(null);

    setForm({
      status_name: "",
      description: "",
    });

    setShowModal(true);
  };

  // =========================
  // EDIT
  // =========================
  const openEditModal = (item) => {
    setEditingStatus(item);

    setForm({
      status_name:
        item.status_name || "",
      description:
        item.description || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStatus(null);
  };

  // =========================
  // CHANGE
  // =========================
  const handleChange = (e) => {
    const {
      name,
      value
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================
  // SAVE
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!form.status_name.trim()) {
        alert("Status name is required");
        return;
      }

      if (editingStatus) {
        await apiFetch(
          `/registration-status/${editingStatus.id_registration_status}`,
          {
            method: "PUT",
            body: JSON.stringify(form),
          }
        );
      } else {
        await apiFetch(
          "/registration-status",
          {
            method: "POST",
            body: JSON.stringify(form),
          }
        );
      }

      closeModal();
      await loadStatuses();

    } catch (err) {
      console.error(
        "SAVE REGISTRATION STATUS ERROR:",
        err
      );

      alert(
        err.message ||
        "Failed to save registration status"
      );
    }
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = async () => {
    if (!deleteId) {
      return;
    }

    try {
      setDeleting(true);

      await apiFetch(
        `/registration-status/${deleteId}`,
        {
          method: "DELETE",
        }
      );

      setDeleteId(null);

      await loadStatuses();

    } catch (err) {
      console.error(
        "DELETE REGISTRATION STATUS ERROR:",
        err
      );

      alert(
        err.message ||
        "Failed to delete registration status"
      );
    } finally {
      setDeleting(false);
    }
  };

  // =========================
  // SEARCH
  // =========================
  const filteredStatuses =
    statuses.filter((item) => {
      const keyword =
        search.toLowerCase().trim();

      return (
        item.status_name
          ?.toLowerCase()
          .includes(keyword) ||
        item.description
          ?.toLowerCase()
          .includes(keyword)
      );
    });

  return (
    <div className="page-container">

      <div className="page-header">

        <div>
          <h1>
            Registration Status
          </h1>

          <p>
            Manage registration workflow statuses
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openAddModal}
        >
          + Add Status
        </button>

      </div>

      <div className="panel agent-toolbar">

        <input
          type="text"
          className="search-input"
          placeholder="Search status..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <div className="agent-count">
          Total:{" "}
          <strong>
            {filteredStatuses.length}
          </strong>
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
            Loading registration statuses...
          </div>
        ) : (
          <div className="table-wrapper">

            <table className="agent-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredStatuses.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="empty-row"
                    >
                      No registration statuses found
                    </td>
                  </tr>
                ) : (
                  filteredStatuses.map(
                    (item) => (
                      <tr
                        key={
                          item.id_registration_status
                        }
                      >

                        <td>
                          #
                          {
                            item.id_registration_status
                          }
                        </td>

                        <td>
                          <span className="status-badge status-info">
                            {
                              item.status_name
                            }
                          </span>
                        </td>

                        <td>
                          {
                            item.description ||
                            "-"
                          }
                        </td>

                        <td>
                          {item.created_at
                            ? new Date(
                                item.created_at
                              ).toLocaleString()
                            : "-"}
                        </td>

                        <td>

                          <div className="action-buttons">

                            <button
                              className="edit-button"
                              onClick={() =>
                                openEditModal(
                                  item
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="delete-button"
                              onClick={() =>
                                setDeleteId(
                                  item.id_registration_status
                                )
                              }
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>
                    )
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* ADD / EDIT */}
      {showModal && (
        <div className="modal-overlay">

          <div className="modal-card">

            <div className="modal-header">

              <div>
                <h2>
                  {editingStatus
                    ? "Edit Registration Status"
                    : "Add Registration Status"}
                </h2>

                <p>
                  Manage registration workflow
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-group">

                <label>
                  Status Name *
                </label>

                <input
                  type="text"
                  name="status_name"
                  value={form.status_name}
                  onChange={handleChange}
                  placeholder="Pending"
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Description
                </label>

                <textarea
                  name="description"
                  value={
                    form.description
                  }
                  onChange={handleChange}
                  rows="4"
                  placeholder="Waiting for review"
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

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingStatus
                    ? "Update"
                    : "Create"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      <ConfirmModal
        open={deleteId !== null}
        title="Delete Registration Status"
        message="Are you sure you want to delete this registration status?"
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        loading={deleting}
        onCancel={() =>
          setDeleteId(null)
        }
        onConfirm={handleDelete}
      />

    </div>
  );
}

export default RegistrationStatuses;