import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter States
  const [nationalityFilter, setNationalityFilter] = useState("All");
  const [search, setSearch] = useState("");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    passport_number: "",
    nationality: "",
    date_of_birth: "",
    selfie_photo: "",
    passport_photo: "",
  });

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch("http://localhost:3000/export/customers", {
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
      link.download = "customers.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("EXPORT CUSTOMER ERROR:", error);
      alert(error.message || "Failed to export customers");
    }
  };

  // Unique Nationalities Dropdown Options
  const nationalities = [
    ...new Set(
      customers
        .map((customer) => customer.nationality)
        .filter(Boolean)
    ),
  ];

  // =========================
  // GET CUSTOMERS
  // =========================
  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/customers");
      setCustomers(response.data || []);
    } catch (err) {
      console.error("GET CUSTOMERS ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Reset pagination when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, nationalityFilter]);

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
  // ADD
  // =========================
  const openAddModal = () => {
    setEditingCustomer(null);
    setForm({
      first_name: "",
      last_name: "",
      passport_number: "",
      nationality: "",
      date_of_birth: "",
      selfie_photo: "",
      passport_photo: "",
    });
    setShowModal(true);
  };

  // =========================
  // EDIT
  // =========================
  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setForm({
      first_name: customer.first_name || "",
      last_name: customer.last_name || "",
      passport_number: customer.passport_number || "",
      nationality: customer.nationality || "",
      date_of_birth: customer.date_of_birth
        ? customer.date_of_birth.substring(0, 10)
        : "",
      selfie_photo: customer.selfie_photo || "",
      passport_photo: customer.passport_photo || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  // =========================
  // CREATE / UPDATE
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!form.first_name.trim()) {
        alert("First name is required");
        return;
      }

      if (editingCustomer) {
        await apiFetch(`/customers/${editingCustomer.id_customer}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        alert("Customer updated successfully");
      } else {
        await apiFetch("/customers", {
          method: "POST",
          body: JSON.stringify(form),
        });
        alert("Customer created successfully");
      }

      closeModal();
      loadCustomers();
    } catch (err) {
      console.error("SAVE CUSTOMER ERROR:", err);
      alert(err.message || "Failed to save customer");
    }
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this customer?"
    );

    if (!confirmed) return;

    try {
      await apiFetch(`/customers/${id}`, {
        method: "DELETE",
      });

      alert("Customer deleted successfully");
      loadCustomers();
    } catch (err) {
      console.error("DELETE CUSTOMER ERROR:", err);
      alert(err.message || "Failed to delete customer");
    }
  };

  // =========================
  // SEARCH & FILTER LOGIC
  // =========================
  const filteredCustomers = customers.filter((customer) => {
    const keyword = search.toLowerCase().trim();

    const matchesSearch =
      !keyword ||
      `${customer.first_name || ""} ${customer.last_name || ""}`
        .toLowerCase()
        .includes(keyword) ||
      customer.passport_number?.toLowerCase().includes(keyword);

    const matchesNationality =
      nationalityFilter === "All" ||
      customer.nationality === nationalityFilter;

    return matchesSearch && matchesNationality;
  });

  // =========================
  // PAGINATION LOGIC
  // =========================
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / pageSize)
  );

  const startIndex = (currentPage - 1) * pageSize;

  const paginatedCustomers = filteredCustomers.slice(
    startIndex,
    startIndex + pageSize
  );

  return (
    <div className="customers-container">
      <div className="page-header">
        <div>
          <h1>Customer Management</h1>
          <p>Manage registered customers</p>
        </div>

        <div className="header-actions">
          <button className="secondary-button" onClick={handleExport}>
            Export Excel
          </button>
          <button className="primary-button" onClick={openAddModal}>
            + Add Customer
          </button>
        </div>
      </div>

      <div
        className="panel agent-toolbar"
        style={{ display: "flex", gap: "1rem", alignItems: "center" }}
      >
        <input
          type="text"
          className="search-input"
          placeholder="Search customer by name or passport..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Filter Nationality Dropdown */}
        <select
          className="select-input"
          value={nationalityFilter}
          onChange={(e) => setNationalityFilter(e.target.value)}
        >
          <option value="All">All Nationalities</option>
          {nationalities.map((nat) => (
            <option key={nat} value={nat}>
              {nat}
            </option>
          ))}
        </select>

        <div className="agent-count">
          Total: <strong>{filteredCustomers.length}</strong>
        </div>
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      <div className="panel">
        {loading ? (
          <div className="loading-box">Loading customers...</div>
        ) : (
          <div className="table-wrapper">
            <table className="agent-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Passport</th>
                  <th>Nationality</th>
                  <th>Date of Birth</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-row">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <tr key={customer.id_customer}>
                      <td>#{customer.id_customer}</td>

                      <td>
                        <div className="agent-name-cell">
                          <div className="agent-avatar">
                            {customer.first_name?.charAt(0).toUpperCase()}
                          </div>
                          <strong>
                            {customer.first_name} {customer.last_name || ""}
                          </strong>
                        </div>
                      </td>

                      <td>{customer.passport_number || "-"}</td>
                      <td>{customer.nationality || "-"}</td>

                      <td>
                        {customer.date_of_birth
                          ? new Date(customer.date_of_birth).toLocaleDateString()
                          : "-"}
                      </td>

                      <td>{customer.phone_number || "-"}</td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="edit-button"
                            onClick={() => openEditModal(customer)}
                          >
                            Edit
                          </button>
                          <button
                            className="delete-button"
                            onClick={() => handleDelete(customer.id_customer)}
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

            {/* Pagination Control Bar */}
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
                  Page {currentPage} of {totalPages} ({filteredCustomers.length} items)
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

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>{editingCustomer ? "Edit Customer" : "Add Customer"}</h2>
                <p>
                  {editingCustomer
                    ? "Update customer information"
                    : "Create a new customer"}
                </p>
              </div>

              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Passport Number</label>
                  <input
                    type="text"
                    name="passport_number"
                    value={form.passport_number}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Nationality</label>
                  <input
                    type="text"
                    name="nationality"
                    value={form.nationality}
                    onChange={handleChange}
                    placeholder="Lao"
                  />
                </div>

                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={form.date_of_birth}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Selfie Photo</label>
                  <input
                    type="text"
                    name="selfie_photo"
                    value={form.selfie_photo}
                    onChange={handleChange}
                    placeholder="uploads/selfie/..."
                  />
                </div>

                <div className="form-group">
                  <label>Passport Photo</label>
                  <input
                    type="text"
                    name="passport_photo"
                    value={form.passport_photo}
                    onChange={handleChange}
                    placeholder="uploads/passport/..."
                  />
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
                  {editingCustomer ? "Update Customer" : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;