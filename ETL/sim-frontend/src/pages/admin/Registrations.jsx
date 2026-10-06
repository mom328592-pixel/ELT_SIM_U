import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch } from "../../api";

function Registrations() {
  const [registrations, setRegistrations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sims, setSims] = useState([]);
  const [agents, setAgents] = useState([]);
  const [registrationStatuses, setRegistrationStatuses] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [agentFilter, setAgentFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [editingRegistration, setEditingRegistration] =
    useState(null);

  const [selectedRegistration, setSelectedRegistration] =
    useState(null);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("user") || "null"
      );
    } catch {
      return null;
    }
  }, []);

  const currentRoleId = Number(
    currentUser?.id_role ?? currentUser?.role_id
  );

  const isAdmin = currentRoleId === 1;

  const normalizeStatus = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const pendingStatus = useMemo(
    () =>
      registrationStatuses.find(
        (status) =>
          normalizeStatus(status.status_name) ===
          "pending"
      ),
    [registrationStatuses]
  );

  const approvedStatus = useMemo(
    () =>
      registrationStatuses.find(
        (status) =>
          normalizeStatus(status.status_name) ===
          "approved"
      ),
    [registrationStatuses]
  );

  const rejectedStatus = useMemo(
    () =>
      registrationStatuses.find(
        (status) =>
          normalizeStatus(status.status_name) ===
          "rejected"
      ),
    [registrationStatuses]
  );

  // ===================================================
  // LOAD DATA
  // ===================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        registrationResponse,
        customerResponse,
        simResponse,
        agentResponse,
        statusResponse,
      ] = await Promise.all([
        apiFetch("/registrations"),
        apiFetch("/customers"),
        apiFetch("/sims"),
        apiFetch("/agents"),
        apiFetch("/registration-status"),
      ]);

      setRegistrations(
        registrationResponse.data || []
      );

      setCustomers(
        customerResponse.data || []
      );

      setSims(
        simResponse.data || []
      );

      setAgents(
        agentResponse.data || []
      );

      setRegistrationStatuses(
        statusResponse.data || []
      );
    } catch (err) {
      console.error(
        "REGISTRATION LOAD ERROR:",
        err
      );

      setError(
        err.message ||
          "Failed to load registrations"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===================================================
  // FORM
  // ===================================================

  const [form, setForm] = useState({
    id_registration_status: "",
    id_customer: "",
    id_sim: "",
    id_agent: "",
    notes: "",
  });

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openAddModal = () => {
    setEditingRegistration(null);

    setForm({
      id_registration_status:
        pendingStatus?.id_registration_status || "",
      id_customer: "",
      id_sim: "",
      id_agent: "",
      notes: "",
    });

    setShowModal(true);
  };

  const openEditModal = (registration) => {
    if (
      normalizeStatus(
        registration.registration_status
      ) !== "pending"
    ) {
      alert(
        "Only Pending registrations can be edited."
      );
      return;
    }

    setEditingRegistration(
      registration
    );

    setForm({
      id_registration_status:
        pendingStatus?.id_registration_status ||
        registration.id_registration_status ||
        "",
      id_customer:
        registration.id_customer || "",
      id_sim:
        registration.id_sim || "",
      id_agent:
        registration.id_agent || "",
      notes:
        registration.notes || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRegistration(null);
  };

  const openDetails = (registration) => {
    setSelectedRegistration(
      registration
    );

    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedRegistration(null);
  };

  // ===================================================
  // CREATE / UPDATE
  // ===================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (
        !form.id_customer ||
        !form.id_sim ||
        !form.id_agent
      ) {
        alert(
          "Customer, SIM, and Agent are required"
        );

        return;
      }

      if (!pendingStatus) {
        alert(
          "Pending registration status is not configured."
        );

        return;
      }

      const payload = {
        id_registration_status:
          Number(
            pendingStatus.id_registration_status
          ),

        id_customer:
          Number(form.id_customer),

        id_sim:
          Number(form.id_sim),

        id_agent:
          Number(form.id_agent),

        notes:
          form.notes?.trim() || null,
      };

      if (editingRegistration) {
        await apiFetch(
          `/registrations/${editingRegistration.id_registration}`,
          {
            method: "PUT",
            body: JSON.stringify(
              payload
            ),
          }
        );

        alert(
          "Registration updated successfully"
        );
      } else {
        await apiFetch(
          "/registrations",
          {
            method: "POST",
            body: JSON.stringify(
              payload
            ),
          }
        );

        alert(
          "Registration created successfully"
        );
      }

      closeModal();

      await loadData();
    } catch (err) {
      console.error(
        "SAVE REGISTRATION ERROR:",
        err
      );

      alert(
        err.message ||
          "Failed to save registration"
      );
    }
  };

  // ===================================================
  // DELETE
  // ===================================================

  const handleDelete = async (id) => {
    if (!isAdmin) {
      alert(
        "Only Admin can delete registrations."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete registration #${id}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await apiFetch(
        `/registrations/${id}`,
        {
          method: "DELETE",
        }
      );

      alert(
        "Registration deleted successfully"
      );

      await loadData();
    } catch (err) {
      console.error(
        "DELETE REGISTRATION ERROR:",
        err
      );

      alert(
        err.message ||
          "Failed to delete registration"
      );
    }
  };

  // ===================================================
  // APPROVE
  // ===================================================

  const approveRegistration = async (
    registration
  ) => {
    if (!isAdmin) {
      alert(
        "Only Admin can approve registrations."
      );

      return;
    }

    if (!approvedStatus) {
      alert(
        "Approved registration status is not configured."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Approve registration #${registration.id_registration}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await apiFetch(
        `/registrations/${registration.id_registration}/approve`,
        {
          method: "PUT",
          body: JSON.stringify({
            notes:
              registration.notes ||
              null,
          }),
        }
      );

      alert(
        "Registration approved successfully"
      );

      await loadData();
    } catch (err) {
      console.error(
        "APPROVE REGISTRATION ERROR:",
        err
      );

      alert(
        err.message ||
          "Failed to approve registration"
      );
    }
  };

  // ===================================================
  // REJECT
  // ===================================================

  const rejectRegistration = async (
    registration
  ) => {
    if (!isAdmin) {
      alert(
        "Only Admin can reject registrations."
      );

      return;
    }

    if (!rejectedStatus) {
      alert(
        "Rejected registration status is not configured."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Reject registration #${registration.id_registration}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await apiFetch(
        `/registrations/${registration.id_registration}/reject`,
        {
          method: "PUT",
          body: JSON.stringify({
            notes:
              registration.notes ||
              null,
          }),
        }
      );

      alert(
        "Registration rejected successfully"
      );

      await loadData();
    } catch (err) {
      console.error(
        "REJECT REGISTRATION ERROR:",
        err
      );

      alert(
        err.message ||
          "Failed to reject registration"
      );
    }
  };

  // ===================================================
  // EXPORT
  // ===================================================

  const handleExport = async () => {
    try {
      const token =
        localStorage.getItem(
          "access_token"
        );

      const params =
        new URLSearchParams();

      if (search.trim()) {
        params.append(
          "search",
          search.trim()
        );
      }

      if (
        statusFilter !==
        "All"
      ) {
        params.append(
          "status",
          statusFilter
        );
      }

      if (
        agentFilter !==
        "All"
      ) {
        params.append(
          "id_agent",
          agentFilter
        );
      }

      if (dateFrom) {
        params.append(
          "date_from",
          dateFrom
        );
      }

      if (dateTo) {
        params.append(
          "date_to",
          dateTo
        );
      }

      const query =
        params.toString();

      const url = query
        ? `https://eltsimu.onrender.com/export/registrations?${query}`
        : "https://eltsimu.onrender.com/export/registrations";

      const response =
        await fetch(url, {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        });

      if (!response.ok) {
        let message =
          "Export failed";

        try {
          const data =
            await response.json();

          message =
            data.message ||
            message;
        } catch {}

        throw new Error(
          message
        );
      }

      const blob =
        await response.blob();

      const downloadUrl =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href =
        downloadUrl;

      link.download =
        "registrations_filtered.xlsx";

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        downloadUrl
      );
    } catch (error) {
      console.error(
        "EXPORT ERROR:",
        error
      );

      alert(
        error.message ||
          "Failed to export registrations"
      );
    }
  };

  // ===================================================
  // FILTER
  // ===================================================

  const filteredRegistrations =
    useMemo(() => {
      const keyword =
        search
          .toLowerCase()
          .trim();

      return registrations.filter(
        (item) => {
          const matchesSearch =
            !keyword ||
            String(
              item.customer_name ||
              ""
            )
              .toLowerCase()
              .includes(
                keyword
              ) ||
            String(
              item.passport_number ||
              ""
            )
              .toLowerCase()
              .includes(
                keyword
              ) ||
            String(
              item.phone_number ||
              ""
            )
              .toLowerCase()
              .includes(
                keyword
              ) ||
            String(
              item.iccid ||
              ""
            )
              .toLowerCase()
              .includes(
                keyword
              ) ||
            String(
              item.imsi ||
              ""
            )
              .toLowerCase()
              .includes(
                keyword
              );

          const matchesStatus =
            statusFilter ===
              "All" ||
            normalizeStatus(
              item.registration_status
            ) ===
              normalizeStatus(
                statusFilter
              );

          const matchesAgent =
            agentFilter ===
              "All" ||
            String(
              item.id_agent
            ) ===
              String(
                agentFilter
              );

          let matchesDateFrom =
            true;

          let matchesDateTo =
            true;

          const itemDate =
            item.created_at ||
            item.registered_at;

          if (
            dateFrom &&
            itemDate
          ) {
            matchesDateFrom =
              String(
                itemDate
              ).substring(
                0,
                10
              ) >= dateFrom;
          }

          if (
            dateTo &&
            itemDate
          ) {
            matchesDateTo =
              String(
                itemDate
              ).substring(
                0,
                10
              ) <= dateTo;
          }

          return (
            matchesSearch &&
            matchesStatus &&
            matchesAgent &&
            matchesDateFrom &&
            matchesDateTo
          );
        }
      );
    }, [
      registrations,
      search,
      statusFilter,
      agentFilter,
      dateFrom,
      dateTo,
    ]);

  // ===================================================
  // AVAILABLE SIMS
  // ===================================================

  const availableSims =
    useMemo(() => {
      return sims.filter(
        (sim) => {
          const status =
            normalizeStatus(
              sim.sim_status
            );

          return (
            [
              "available",
              "ready for sale",
              "ready_to_sale",
              "ready-to-sale",
              "ວ່າງ",
              "ພ້ອມຂາຍ",
            ].includes(status) ||
            String(
              sim.id_sim
            ) ===
              String(
                form.id_sim
              )
          );
        }
      );
    }, [
      sims,
      form.id_sim,
    ]);

  return (
    <div className="page-container">

      {/* ================= HEADER ================= */}

      <div className="header-actions">
        <button
          className="secondary-button"
          onClick={handleExport}
        >
          Export Filtered Excel
        </button>

        <button
          className="primary-button"
          onClick={openAddModal}
        >
          + New Registration
        </button>
      </div>

      {/* ================= FILTER BAR ================= */}

      <div className="panel registration-toolbar">

        <input
          type="text"
          className="search-input"
          placeholder="Search customer, passport, ICCID..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />

        <select
          className="status-filter"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value
            )
          }
        >
          <option value="All">
            All Status
          </option>

          {registrationStatuses.map(
            (status) => (
              <option
                key={
                  status.id_registration_status
                }
                value={
                  status.status_name
                }
              >
                {
                  status.status_name
                }
              </option>
            )
          )}
        </select>

        <select
          className="status-filter"
          value={agentFilter}
          onChange={(e) =>
            setAgentFilter(
              e.target.value
            )
          }
        >
          <option value="All">
            All Agents
          </option>

          {agents.map(
            (agent) => (
              <option
                key={
                  agent.id_agent
                }
                value={
                  agent.id_agent
                }
              >
                {
                  agent.agent_name
                }
              </option>
            )
          )}
        </select>

        <input
          type="date"
          className="date-filter"
          value={dateFrom}
          onChange={(e) =>
            setDateFrom(
              e.target.value
            )
          }
        />

        <input
          type="date"
          className="date-filter"
          value={dateTo}
          onChange={(e) =>
            setDateTo(
              e.target.value
            )
          }
        />

      </div>

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      {/* ================= TABLE ================= */}

      <div className="panel">

        {loading ? (
          <div className="loading-box">
            Loading registrations...
          </div>
        ) : (
          <div className="table-wrapper">

            <table className="agent-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>SIM</th>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredRegistrations.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="empty-row"
                    >
                      No registrations found
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map(
                    (item) => {
                      const status =
                        normalizeStatus(
                          item.registration_status
                        );

                      const isPending =
                        status ===
                        "pending";

                      return (
                        <tr
                          key={
                            item.id_registration
                          }
                        >

                          <td>
                            #
                            {
                              item.id_registration
                            }
                          </td>

                          <td>
                            <div className="agent-name-cell">

                              <div className="agent-avatar">
                                {(
                                  item.customer_name ||
                                  "C"
                                )
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {
                                    item.customer_name ||
                                    "-"
                                  }
                                </strong>

                                <div className="muted-text">
                                  {
                                    item.passport_number ||
                                    "-"
                                  }
                                </div>
                              </div>

                            </div>
                          </td>

                          <td>
                            {
                              item.phone_number ||
                              "-"
                            }
                          </td>

                          <td>
                            <div>
                              {
                                item.iccid ||
                                "-"
                              }
                            </div>

                            <div className="muted-text">
                              IMSI:{" "}
                              {
                                item.imsi ||
                                "-"
                              }
                            </div>
                          </td>

                          <td>
                            {
                              item.agent_name ||
                              "-"
                            }
                          </td>

                          <td>

                            <span
                              className={`status-badge ${
                                status ===
                                "approved"
                                  ? "status-success"
                                  : status ===
                                    "pending"
                                  ? "status-info"
                                  : status ===
                                    "rejected"
                                  ? "status-danger"
                                  : "status-default"
                              }`}
                            >
                              {
                                item.registration_status ||
                                "-"
                              }
                            </span>

                          </td>

                          <td>
                            {
                              item.registered_at
                                ? new Date(
                                    item.registered_at
                                  ).toLocaleString()
                                : "-"
                            }
                          </td>

                          <td>

                            <div className="action-buttons">

                              <button
                                className="view-button"
                                onClick={() =>
                                  openDetails(
                                    item
                                  )
                                }
                              >
                                View
                              </button>

                              {isPending &&
                                isAdmin && (
                                  <>
                                    <button
                                      className="approve-button"
                                      onClick={() =>
                                        approveRegistration(
                                          item
                                        )
                                      }
                                    >
                                      Approve
                                    </button>

                                    <button
                                      className="delete-button"
                                      onClick={() =>
                                        rejectRegistration(
                                          item
                                        )
                                      }
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}

                              {isPending && (
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
                              )}

                              {isAdmin && (
                                <button
                                  className="delete-button"
                                  onClick={() =>
                                    handleDelete(
                                      item.id_registration
                                    )
                                  }
                                >
                                  Delete
                                </button>
                              )}

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )
                )}

              </tbody>
            </table>

          </div>
        )}

      </div>

      {/* ================= ADD / EDIT MODAL ================= */}

      {showModal && (
        <div className="modal-overlay">

          <div className="modal-card">

            <div className="modal-header">

              <div>
                <h2>
                  {editingRegistration
                    ? "Edit Registration"
                    : "New Registration"}
                </h2>

                <p>
                  {editingRegistration
                    ? "Update Pending registration"
                    : "Create a new Pending registration"}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >

              <div className="form-grid">

                <div className="form-group">
                  <label>
                    Customer *
                  </label>

                  <select
                    name="id_customer"
                    value={
                      form.id_customer
                    }
                    onChange={
                      handleChange
                    }
                    required
                  >
                    <option value="">
                      Select customer
                    </option>

                    {customers.map(
                      (customer) => (
                        <option
                          key={
                            customer.id_customer
                          }
                          value={
                            customer.id_customer
                          }
                        >
                          {
                            customer.first_name
                          }{" "}
                          {
                            customer.last_name ||
                            ""
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Available SIM *
                  </label>

                  <select
                    name="id_sim"
                    value={
                      form.id_sim
                    }
                    onChange={
                      handleChange
                    }
                    required
                  >
                    <option value="">
                      Select SIM
                    </option>

                    {availableSims.map(
                      (sim) => (
                        <option
                          key={
                            sim.id_sim
                          }
                          value={
                            sim.id_sim
                          }
                        >
                          {
                            sim.phone_number ||
                            sim.iccid ||
                            `SIM #${sim.id_sim}`
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Agent *
                  </label>

                  <select
                    name="id_agent"
                    value={
                      form.id_agent
                    }
                    onChange={
                      handleChange
                    }
                    required
                  >
                    <option value="">
                      Select agent
                    </option>

                    {agents.map(
                      (agent) => (
                        <option
                          key={
                            agent.id_agent
                          }
                          value={
                            agent.id_agent
                          }
                        >
                          {
                            agent.agent_name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Registration Status
                  </label>

                  <input
                    type="text"
                    value={
                      pendingStatus?.status_name ||
                      "Pending"
                    }
                    readOnly
                  />
                </div>

              </div>

              <div className="form-group">

                <label>
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={
                    form.notes
                  }
                  onChange={
                    handleChange
                  }
                  rows="4"
                  placeholder="Registration notes..."
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
                  {editingRegistration
                    ? "Update Registration"
                    : "Create Registration"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* ================= DETAILS MODAL ================= */}

      {showDetails &&
        selectedRegistration && (
          <div className="modal-overlay">

            <div className="modal-card details-modal">

              <div className="modal-header">

                <div>

                  <h2>
                    Registration Details
                  </h2>

                  <p>
                    Registration #
                    {
                      selectedRegistration.id_registration
                    }
                  </p>

                </div>

                <button
                  className="modal-close"
                  onClick={
                    closeDetails
                  }
                >
                  ×
                </button>

              </div>

              <div className="details-grid">

                <div>
                  <span>
                    Customer
                  </span>

                  <strong>
                    {
                      selectedRegistration.customer_name ||
                      "-"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Passport
                  </span>

                  <strong>
                    {
                      selectedRegistration.passport_number ||
                      "-"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Phone Number
                  </span>

                  <strong>
                    {
                      selectedRegistration.phone_number ||
                      "-"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Agent
                  </span>

                  <strong>
                    {
                      selectedRegistration.agent_name ||
                      "-"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    ICCID
                  </span>

                  <strong>
                    {
                      selectedRegistration.iccid ||
                      "-"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    IMSI
                  </span>

                  <strong>
                    {
                      selectedRegistration.imsi ||
                      "-"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    SIM Status
                  </span>

                  <strong>
                    {
                      selectedRegistration.sim_status ||
                      "-"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Registration Status
                  </span>

                  <strong>
                    {
                      selectedRegistration.registration_status ||
                      "-"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Reviewed By
                  </span>

                  <strong>
                    {
                      selectedRegistration.reviewed_by_username ||
                      "-"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Registered At
                  </span>

                  <strong>
                    {
                      selectedRegistration.registered_at
                        ? new Date(
                            selectedRegistration.registered_at
                          ).toLocaleString()
                        : "-"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Reviewed At
                  </span>

                  <strong>
                    {
                      selectedRegistration.reviewed_at
                        ? new Date(
                            selectedRegistration.reviewed_at
                          ).toLocaleString()
                        : "-"
                    }
                  </strong>
                </div>

                <div className="details-full">
                  <span>
                    Notes
                  </span>

                  <strong>
                    {
                      selectedRegistration.notes ||
                      "-"
                    }
                  </strong>
                </div>

              </div>

              <div className="modal-actions">

                {normalizeStatus(
                  selectedRegistration.registration_status
                ) ===
                  "pending" &&
                  isAdmin && (
                    <>
                      <button
                        className="approve-button"
                        onClick={async () => {
                          await approveRegistration(
                            selectedRegistration
                          );
                          closeDetails();
                        }}
                      >
                        Approve
                      </button>

                      <button
                        className="delete-button"
                        onClick={async () => {
                          await rejectRegistration(
                            selectedRegistration
                          );
                          closeDetails();
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeDetails
                  }
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

export default Registrations;