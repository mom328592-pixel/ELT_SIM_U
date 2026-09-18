import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";
import ConfirmModal from "../../components/ConfirmModal";

function SimStatuses() {
  const [statuses, setStatuses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingStatus, setEditingStatus] =
    useState(null);

  const [deleteId, setDeleteId] =
    useState(null);

  const [deleting, setDeleting] =
    useState(false);

  const [form, setForm] = useState({
    sim_status: "",
    description: "",
  });


  // =========================
  // GET
  // =========================
  const loadStatuses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await apiFetch("/sim-status");

      setStatuses(response.data || []);

    } catch (err) {
      console.error(
        "LOAD SIM STATUS ERROR:",
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


  // =========================
  // ADD
  // =========================
  const openAddModal = () => {
    setEditingStatus(null);

    setForm({
      sim_status: "",
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
      sim_status: item.sim_status || "",
      description: item.description || "",
    });

    setShowModal(true);
  };


  const closeModal = () => {
    setShowModal(false);
    setEditingStatus(null);
  };


  // =========================
  // FORM
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

      if (!form.sim_status.trim()) {
        alert("SIM status is required");
        return;
      }

      if (editingStatus) {

        await apiFetch(
          `/sim-status/${editingStatus.id_sim_status}`,
          {
            method: "PUT",
            body: JSON.stringify(form),
          }
        );

      } else {

        await apiFetch(
          "/sim-status",
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
        "SAVE SIM STATUS ERROR:",
        err
      );

      alert(
        err.message ||
        "Failed to save SIM status"
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
        `/sim-status/${deleteId}`,
        {
          method: "DELETE",
        }
      );

      setDeleteId(null);

      await loadStatuses();

    } catch (err) {

      console.error(
        "DELETE SIM STATUS ERROR:",
        err
      );

      alert(
        err.message ||
        "Failed to delete SIM status"
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
        search
          .toLowerCase()
          .trim();

      return (
        item.sim_status
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
          <h1>SIM Status</h1>

          <p>
            Manage SIM card statuses
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openAddModal}
        >
          + Add SIM Status
        </button>

      </div>


      <div className="panel agent-toolbar">

        <input
          type="text"
          className="search-input"
          placeholder="Search SIM status..."
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
            Loading SIM statuses...
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
                      No SIM statuses found
                    </td>
                  </tr>

                ) : (

                  filteredStatuses.map(
                    (item) => (

                      <tr
                        key={
                          item.id_sim_status
                        }
                      >

                        <td>
                          #
                          {
                            item.id_sim_status
                          }
                        </td>

                        <td>
                          <span className="status-badge status-info">
                            {item.sim_status}
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
                                  item.id_sim_status
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


      {/* =========================
          ADD / EDIT MODAL
      ========================= */}
      {showModal && (

        <div className="modal-overlay">

          <div className="modal-card">

            <div className="modal-header">

              <div>
                <h2>
                  {editingStatus
                    ? "Edit SIM Status"
                    : "Add SIM Status"}
                </h2>

                <p>
                  Manage SIM status information
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
                  SIM Status *
                </label>

                <input
                  type="text"
                  name="sim_status"
                  value={form.sim_status}
                  onChange={handleChange}
                  placeholder="Available"
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
                  placeholder="SIM is ready for registration"
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
        title="Delete SIM Status"
        message="Are you sure you want to delete this SIM status?"
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

export default SimStatuses;