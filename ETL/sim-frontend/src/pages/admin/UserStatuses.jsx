import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";
import ConfirmModal from "../../components/ConfirmModal";

function UserStatuses() {
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

  const loadStatuses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await apiFetch("/user-status");

      setStatuses(response.data || []);

    } catch (err) {
      console.error(
        "LOAD USER STATUS ERROR:",
        err
      );

      setError(err.message);

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  const openAddModal = () => {
    setEditingStatus(null);

    setForm({
      status_name: "",
      description: "",
    });

    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingStatus(item);

    setForm({
      status_name: item.status_name || "",
      description: item.description || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStatus(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!form.status_name.trim()) {
        alert("Status name is required");
        return;
      }

      if (editingStatus) {
        await apiFetch(
          `/user-status/${editingStatus.id_status_user}`,
          {
            method: "PUT",
            body: JSON.stringify(form),
          }
        );
      } else {
        await apiFetch("/user-status", {
          method: "POST",
          body: JSON.stringify(form),
        });
      }

      closeModal();
      await loadStatuses();

    } catch (err) {
      console.error(
        "SAVE USER STATUS ERROR:",
        err
      );

      alert(
        err.message ||
        "Failed to save user status"
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);

      await apiFetch(
        `/user-status/${deleteId}`,
        {
          method: "DELETE",
        }
      );

      setDeleteId(null);
      await loadStatuses();

    } catch (err) {
      console.error(
        "DELETE USER STATUS ERROR:",
        err
      );

      alert(
        err.message ||
        "Failed to delete user status"
      );

    } finally {
      setDeleting(false);
    }
  };

  const filteredStatuses = statuses.filter(
    (item) => {
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
    }
  );

  return (
    <div className="page-container">

      <div className="page-header">
        <div>
          <h1>User Status</h1>
          <p>
            Manage user account statuses
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openAddModal}
        >
          + Add User Status
        </button>
      </div>

      <div className="panel agent-toolbar">

        <input
          type="text"
          className="search-input"
          placeholder="Search user status..."
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
            Loading user statuses...
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

                {filteredStatuses.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="empty-row"
                    >
                      No user statuses found
                    </td>
                  </tr>
                ) : (
                  filteredStatuses.map(
                    (item) => (
                      <tr
                        key={
                          item.id_status_user
                        }
                      >

                        <td>
                          #{item.id_status_user}
                        </td>

                        <td>
                          <span className="status-badge status-info">
                            {item.status_name}
                          </span>
                        </td>

                        <td>
                          {item.description ||
                            "-"}
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
                                  item.id_status_user
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

      {showModal && (
        <div className="modal-overlay">

          <div className="modal-card">

            <div className="modal-header">

              <div>
                <h2>
                  {editingStatus
                    ? "Edit User Status"
                    : "Add User Status"}
                </h2>

                <p>
                  Manage user account status
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
                  placeholder="Active"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="4"
                  placeholder="User can login and use the system"
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
        title="Delete User Status"
        message="Are you sure you want to delete this user status?"
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

export default UserStatuses;