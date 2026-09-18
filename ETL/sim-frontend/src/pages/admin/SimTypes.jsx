import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";
import ConfirmModal from "../../components/ConfirmModal";

function SimTypes() {
  const [simTypes, setSimTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);

  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    sim_type: "",
    description: "",
  });

  const loadTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await apiFetch("/sim-types");

      setSimTypes(response.data || []);
    } catch (err) {
      console.error("LOAD SIM TYPES ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  const openAddModal = () => {
    setEditingType(null);

    setForm({
      sim_type: "",
      description: "",
    });

    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingType(item);

    setForm({
      sim_type: item.sim_type || "",
      description: item.description || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingType(null);
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
      if (!form.sim_type.trim()) {
        alert("SIM type name is required");
        return;
      }

      if (editingType) {
        await apiFetch(
          `/sim-types/${editingType.id_sim_type}`,
          {
            method: "PUT",
            body: JSON.stringify(form),
          }
        );
      } else {
        await apiFetch("/sim-types", {
          method: "POST",
          body: JSON.stringify(form),
        });
      }

      closeModal();
      await loadTypes();

    } catch (err) {
      console.error(
        "SAVE SIM TYPE ERROR:",
        err
      );

      alert(
        err.message ||
        "Failed to save SIM type"
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);

      await apiFetch(
        `/sim-types/${deleteId}`,
        {
          method: "DELETE",
        }
      );

      setDeleteId(null);

      await loadTypes();

    } catch (err) {
      console.error(
        "DELETE SIM TYPE ERROR:",
        err
      );

      alert(
        err.message ||
        "Failed to delete SIM type"
      );
    } finally {
      setDeleting(false);
    }
  };

  const filteredTypes = simTypes.filter(
    (item) => {
      const keyword =
        search.toLowerCase().trim();

      return (
        item.sim_type
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
          <h1>SIM Types</h1>
          <p>
            Manage SIM card types
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openAddModal}
        >
          + Add SIM Type
        </button>
      </div>

      <div className="panel agent-toolbar">

        <input
          type="text"
          className="search-input"
          placeholder="Search SIM type..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <div className="agent-count">
          Total:{" "}
          <strong>
            {filteredTypes.length}
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
            Loading SIM types...
          </div>
        ) : (
          <div className="table-wrapper">

            <table className="agent-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type Name</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredTypes.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="empty-row"
                    >
                      No SIM types found
                    </td>
                  </tr>
                ) : (
                  filteredTypes.map(
                    (item) => (
                      <tr
                        key={
                          item.id_sim_type
                        }
                      >
                        <td>
                          #
                          {item.id_sim_type}
                        </td>

                        <td>
                          <strong>
                            {item.sim_type}
                          </strong>
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
                                  item.id_sim_type
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
                  {editingType
                    ? "Edit SIM Type"
                    : "Add SIM Type"}
                </h2>

                <p>
                  Manage SIM type information
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
                  Type Name *
                </label>

                <input
                  type="text"
                  name="sim_type"
                  value={form.sim_type}
                  onChange={handleChange}
                  placeholder="Physical SIM"
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
                  {editingType
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
        title="Delete SIM Type"
        message="Are you sure you want to delete this SIM type?"
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

export default SimTypes;