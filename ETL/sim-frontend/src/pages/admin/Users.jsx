import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";
import Pagination from "../../components/Pagination";
import ConfirmModal from "../../components/ConfirmModal";

function Users() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    fullname: "",
    phone_number: "",
    id_role: "",
    id_status_user: "",
  });

  // =========================
  // LOAD DATA
  // =========================
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [usersResponse, rolesResponse, statusResponse] =
        await Promise.all([
          apiFetch("/users"),
          apiFetch("/roles"),
          apiFetch("/user-status"),
        ]);

      setUsers(usersResponse.data || []);
      setRoles(rolesResponse.data || []);
      setStatuses(statusResponse.data || []);
    } catch (err) {
      console.error("LOAD USERS ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // =========================
  // DELETE LOGIC
  // =========================
  const openDeleteConfirm = (id) => {
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);

      await apiFetch(`/users/${deleteId}`, {
        method: "DELETE",
      });

      setDeleteId(null);
      alert("User deleted successfully");
      await loadData();
    } catch (err) {
      console.error("DELETE USER ERROR:", err);
      alert(err.message || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  // =========================
  // UNLOCK LOGIC
  // =========================
  const handleUnlock = async (id) => {
    const confirmed = window.confirm("Unlock this user account?");

    if (!confirmed) {
      return;
    }

    try {
      await apiFetch(`/users/${id}/unlock`, {
        method: "PUT",
      });

      alert("User account unlocked successfully");
      await loadData();
    } catch (error) {
      console.error("UNLOCK USER ERROR:", error);
      alert(error.message || "Failed to unlock user");
    }
  };

  // =========================
  // FILTER & PAGINATION
  // =========================
  const filteredUsers = users.filter((user) => {
    const keyword = search.toLowerCase();

    return (
      user.username?.toLowerCase().includes(keyword) ||
      user.email?.toLowerCase().includes(keyword) ||
      user.fullname?.toLowerCase().includes(keyword) ||
      user.role_name?.toLowerCase().includes(keyword) ||
      user.status_name?.toLowerCase().includes(keyword)
    );
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / pageSize)
  );

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + pageSize
  );

  // =========================
  // FORM HANDLERS & VALIDATION
  // =========================
  const validatePassword = (password) => {
    if (!password) {
      return "Password is required";
    }

    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }

    if (!/[A-Z]/.test(password)) {
      return "Password must contain an uppercase letter";
    }

    if (!/[a-z]/.test(password)) {
      return "Password must contain a lowercase letter";
    }

    if (!/[0-9]/.test(password)) {
      return "Password must contain a number";
    }

    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openAddModal = () => {
    setEditingUser(null);

    setForm({
      username: "",
      email: "",
      password: "",
      fullname: "",
      phone_number: "",
      id_role: roles[0]?.id_role || "",
      id_status_user: statuses[0]?.id_status_user || "",
    });

    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);

    setForm({
      username: user.username || "",
      email: user.email || "",
      password: "",
      fullname: user.fullname || "",
      phone_number: user.phone_number || "",
      id_role: user.id_role || "",
      id_status_user: user.id_status_user || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!form.username.trim() || !form.email.trim()) {
        alert("Username and email are required");
        return;
      }

      if (!editingUser) {
        const passwordError = validatePassword(form.password);
        if (passwordError) {
          alert(passwordError);
          return;
        }
      }

      const payload = {
        username: form.username,
        email: form.email,
        fullname: form.fullname || null,
        phone_number: form.phone_number || null,
        id_role: form.id_role ? Number(form.id_role) : null,
        id_status_user: form.id_status_user
          ? Number(form.id_status_user)
          : null,
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      if (editingUser) {
        await apiFetch(`/users/${editingUser.id_user}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        alert("User updated successfully");
      } else {
        await apiFetch("/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        alert("User created successfully");
      }

      closeModal();
      loadData();
    } catch (err) {
      console.error("SAVE USER ERROR:", err);
      alert(err.message || "Failed to save user");
    }
  };

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Manage system users, roles and statuses</p>
        </div>

        <button className="primary-button" onClick={openAddModal}>
          + Add User
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="panel agent-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search username, email, name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="agent-count">
          Total: <strong>{filteredUsers.length}</strong>
        </div>
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      {/* TABLE */}
      <div className="panel">
        {loading ? (
          <div className="loading-box">Loading users...</div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="agent-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                    <th>Security</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-row">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => {
                      const isLocked =
                        user.locked_until &&
                        new Date(user.locked_until) > new Date();

                      return (
                        <tr key={user.id_user}>
                          <td>#{user.id_user}</td>

                          <td>
                            <div className="agent-name-cell">
                              <div className="agent-avatar">
                                {(
                                  user.fullname ||
                                  user.username ||
                                  "U"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {user.fullname || user.username}
                                </strong>

                                <div className="muted-text">
                                  @{user.username}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>{user.email || "-"}</td>
                          <td>{user.phone_number || "-"}</td>

                          <td>
                            <span className="status-badge status-info">
                              {user.role_name || "-"}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`status-badge ${
                                user.status_name === "Active"
                                  ? "status-success"
                                  : "status-danger"
                              }`}
                            >
                              {user.status_name || "-"}
                            </span>
                          </td>

                          <td>
                            <div className="action-buttons">
                              <button
                                className="edit-button"
                                onClick={() => openEditModal(user)}
                              >
                                Edit
                              </button>

                              <button
                                className="delete-button"
                                onClick={() =>
                                  openDeleteConfirm(user.id_user)
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>

                          <td>
                            <div className="security-cell">
                              <span>
                                Attempts: {user.failed_login_attempts || 0}
                              </span>

                              {isLocked ? (
                                <>
                                  <span className="status-badge status-danger">
                                    Locked
                                  </span>
                                  <button
                                    className="approve-button"
                                    onClick={() => handleUnlock(user.id_user)}
                                  >
                                    Unlock
                                  </button>
                                </>
                              ) : (
                                <span className="status-badge status-success">
                                  Normal
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Component */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>{editingUser ? "Edit User" : "Add User"}</h2>
                <p>
                  {editingUser
                    ? "Update user information"
                    : "Create a new system user"}
                </p>
              </div>

              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Password {editingUser ? "(optional)" : "*"}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={
                      editingUser
                        ? "Leave blank to keep current"
                        : "Enter password"
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="fullname"
                    value={form.fullname}
                    onChange={handleChange}
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
                  <label>Role</label>
                  <select
                    name="id_role"
                    value={form.id_role}
                    onChange={handleChange}
                  >
                    <option value="">Select role</option>
                    {roles.map((role) => (
                      <option key={role.id_role} value={role.id_role}>
                        {role.role_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="id_status_user"
                    value={form.id_status_user}
                    onChange={handleChange}
                  >
                    <option value="">Select status</option>
                    {statuses.map((status) => (
                      <option
                        key={status.id_status_user}
                        value={status.id_status_user}
                      >
                        {status.status_name}
                      </option>
                    ))}
                  </select>
                </div>
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
                  {editingUser ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        open={deleteId !== null}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        loading={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default Users;