import {
    useCallback,
    useEffect,
    useState,
} from "react";

import { apiFetch } from "../../api";

const initialAgentForm = {
    agent_name: "",
    contact_phone: "",
    contact_email: "",
    address: "",
    login_username: "",
    login_password: "",
};

const initialAccountForm = {
    login_username: "",
    login_password: "",
};

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
        feedback,
        setFeedback,
    ] = useState({
        type: "",
        message: "",
    });

    const [
        search,
        setSearch,
    ] = useState("");

    const [
        showModal,
        setShowModal,
    ] = useState(false);

    const [
        showAccountModal,
        setShowAccountModal,
    ] = useState(false);

    const [
        editingAgent,
        setEditingAgent,
    ] = useState(null);

    const [
        accountAgent,
        setAccountAgent,
    ] = useState(null);

    const [
        form,
        setForm,
    ] = useState(
        initialAgentForm
    );

    const [
        accountForm,
        setAccountForm,
    ] = useState(
        initialAccountForm
    );

    const [
        saving,
        setSaving,
    ] = useState(false);

    const [
        accountSaving,
        setAccountSaving,
    ] = useState(false);

    const [
        copiedId,
        setCopiedId,
    ] = useState(null);

    const [
        linkActionId,
        setLinkActionId,
    ] = useState(null);

    // =================================================
    // LOAD AGENTS
    // =================================================

    const loadAgents =
        useCallback(
            async () => {
                try {
                    setLoading(true);
                    setError("");

                    const response =
                        await apiFetch(
                            "/agents"
                        );

                    setAgents(
                        response.data ||
                            []
                    );
                } catch (err) {
                    console.error(
                        "GET AGENTS ERROR:",
                        err
                    );

                    setError(
                        err.message ||
                            "Failed to load agents."
                    );
                } finally {
                    setLoading(false);
                }
            },
            []
        );

    useEffect(() => {
        loadAgents();
    }, [
        loadAgents,
    ]);

    // =================================================
    // FEEDBACK
    // =================================================

    const showFeedback =
        (
            type,
            message
        ) => {
            setFeedback({
                type,
                message,
            });
        };

    // =================================================
    // ADD
    // =================================================

    const openAddModal =
        () => {
            setEditingAgent(
                null
            );

            setForm({
                ...initialAgentForm,
            });

            setFeedback({
                type: "",
                message: "",
            });

            setShowModal(
                true
            );
        };

    // =================================================
    // EDIT
    // =================================================

    const openEditModal =
        (
            agent
        ) => {
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

                login_username:
                    agent.login_username ||
                    "",

                login_password:
                    "",
            });

            setFeedback({
                type: "",
                message: "",
            });

            setShowModal(
                true
            );
        };

    // =================================================
    // CLOSE
    // =================================================

    const closeModal =
        () => {
            if (
                saving
            ) {
                return;
            }

            setShowModal(
                false
            );

            setEditingAgent(
                null
            );

            setForm({
                ...initialAgentForm,
            });
        };

    // =================================================
    // CREATE LOGIN MODAL
    // =================================================

    const openAccountModal =
        (
            agent
        ) => {
            setAccountAgent(
                agent
            );

            setAccountForm({
                login_username:
                    agent.login_username ||
                    `${String(
                        agent.agent_name ||
                        "agent"
                    )
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9]+/g,
                            ""
                        )
                        .slice(
                            0,
                            20
                        )}01`,

                login_password:
                    "",
            });

            setShowAccountModal(
                true
            );
        };

    const closeAccountModal =
        () => {
            if (
                accountSaving
            ) {
                return;
            }

            setShowAccountModal(
                false
            );

            setAccountAgent(
                null
            );

            setAccountForm({
                ...initialAccountForm,
            });
        };

    // =================================================
    // FORM CHANGE
    // =================================================

    const handleChange =
        (
            event
        ) => {
            const {
                name,
                value,
            } =
                event.target;

            setForm(
                (
                    prev
                ) => ({
                    ...prev,
                    [name]:
                        value,
                })
            );
        };

    const handleAccountChange =
        (
            event
        ) => {
            const {
                name,
                value,
            } =
                event.target;

            setAccountForm(
                (
                    prev
                ) => ({
                    ...prev,
                    [name]:
                        value,
                })
            );
        };

    // =================================================
    // CREATE / UPDATE AGENT
    // =================================================

    const handleSubmit =
        async (
            event
        ) => {
            event.preventDefault();

            if (
                !form.agent_name.trim()
            ) {
                showFeedback(
                    "error",
                    "Agent name is required."
                );

                return;
            }

            if (
                !editingAgent &&
                !form.contact_email.trim()
            ) {
                showFeedback(
                    "error",
                    "Contact email is required because every Agent needs a login account."
                );

                return;
            }

            if (
                !editingAgent &&
                !form.login_username.trim()
            ) {
                showFeedback(
                    "error",
                    "Login username is required."
                );

                return;
            }

            if (
                !editingAgent &&
                !form.login_password
            ) {
                showFeedback(
                    "error",
                    "Login password is required."
                );

                return;
            }

            try {
                setSaving(
                    true
                );

                setFeedback({
                    type: "",
                    message: "",
                });

                if (
                    editingAgent
                ) {
                    await apiFetch(
                        `/agents/${editingAgent.id_agent}`,
                        {
                            method:
                                "PUT",

                            body:
                                JSON.stringify({
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
                                }),
                        }
                    );

                    showFeedback(
                        "success",
                        "Agent information updated successfully."
                    );
                } else {
                    const response =
                        await apiFetch(
                            "/agents",
                            {
                                method:
                                    "POST",

                                body:
                                    JSON.stringify(
                                        {
                                            agent_name:
                                                form.agent_name.trim(),

                                            contact_phone:
                                                form.contact_phone.trim() ||
                                                null,

                                            contact_email:
                                                form.contact_email.trim(),

                                            address:
                                                form.address.trim() ||
                                                null,

                                            login_username:
                                                form.login_username.trim(),

                                            login_password:
                                                form.login_password,
                                        }
                                    ),
                            }
                        );

                    window.alert(
                        `Agent created successfully.\n\nLogin username: ${
                            response?.data
                                ?.login_username ||
                            form.login_username.trim()
                        }\n\nGive this username and the password you created to the Agent.`
                    );
                }

                closeModal();

                await loadAgents();
            } catch (
                err
            ) {
                console.error(
                    "SAVE AGENT ERROR:",
                    err
                );

                showFeedback(
                    "error",
                    err.message ||
                        "Failed to save Agent."
                );
            } finally {
                setSaving(
                    false
                );
            }
        };

    // =================================================
    // CREATE LOGIN FOR EXISTING AGENT
    // =================================================

    const createLoginAccount =
        async (
            event
        ) => {
            event.preventDefault();

            if (
                !accountAgent
            ) {
                return;
            }

            if (
                !accountForm.login_username.trim()
            ) {
                showFeedback(
                    "error",
                    "Login username is required."
                );

                return;
            }

            if (
                !accountForm.login_password
            ) {
                showFeedback(
                    "error",
                    "Login password is required."
                );

                return;
            }

            try {
                setAccountSaving(
                    true
                );

                const response =
                    await apiFetch(
                        `/agents/${accountAgent.id_agent}/account`,
                        {
                            method:
                                "POST",

                            body:
                                JSON.stringify(
                                    accountForm
                                ),
                        }
                    );

                closeAccountModal();

                await loadAgents();

                window.alert(
                    `Agent login created.\n\nUsername: ${
                        response?.data
                            ?.login_username ||
                        accountForm.login_username
                    }\n\nGive the Agent the password you entered.`
                );
            } catch (
                err
            ) {
                showFeedback(
                    "error",
                    err.message ||
                        "Failed to create Agent login."
                );
            } finally {
                setAccountSaving(
                    false
                );
            }
        };

    // =================================================
    // DELETE
    // =================================================

    const handleDelete =
        async (
            agent
        ) => {
            const confirmed =
                window.confirm(
                    `Delete "${agent.agent_name}"?\n\nThe Agent profile will be disabled and its login account will also be deactivated.`
                );

            if (
                !confirmed
            ) {
                return;
            }

            try {
                await apiFetch(
                    `/agents/${agent.id_agent}`,
                    {
                        method:
                            "DELETE",
                    }
                );

                showFeedback(
                    "success",
                    "Agent deleted and login disabled."
                );

                await loadAgents();
            } catch (
                err
            ) {
                showFeedback(
                    "error",
                    err.message ||
                        "Failed to delete Agent."
                );
            }
        };

    // =================================================
    // COPY
    // =================================================

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

                window.setTimeout(
                    () =>
                        setCopiedId(
                            null
                        ),
                    1600
                );
            } catch {
                window.prompt(
                    "Copy this Agent registration link:",
                    agent.public_url
                );
            }
        };

    // =================================================
    // SHARE
    // =================================================

    const sharePublicLink =
        async (
            agent
        ) => {
            if (
                !agent.public_url
            ) {
                return;
            }

            const message =
                `SIM Registration for ${agent.agent_name}\n\n` +
                `Please open this link to register your SIM:\n` +
                `${agent.public_url}`;

            try {
                if (
                    navigator.share
                ) {
                    await navigator.share(
                        {
                            title:
                                "SIM Registration",
                            text:
                                message,
                            url:
                                agent.public_url,
                        }
                    );

                    return;
                }

                await navigator.clipboard.writeText(
                    message
                );

                showFeedback(
                    "success",
                    "Sharing is not available in this browser. The message was copied."
                );
            } catch (
                err
            ) {
                if (
                    err?.name !==
                    "AbortError"
                ) {
                    showFeedback(
                        "error",
                        "Unable to share the link."
                    );
                }
            }
        };

    // =================================================
    // WHATSAPP
    // =================================================

    const openWhatsApp =
        (
            agent
        ) => {
            if (
                !agent.public_url
            ) {
                return;
            }

            const message =
                `SIM Registration\n\n` +
                `Please open this link to register your SIM:\n` +
                `${agent.public_url}`;

            window.open(
                `https://wa.me/?text=${encodeURIComponent(
                    message
                )}`,
                "_blank",
                "noopener,noreferrer"
            );
        };

    // =================================================
    // REGENERATE
    // =================================================

    const regeneratePublicLink =
        async (
            agent
        ) => {
            const confirmed =
                window.confirm(
                    `Regenerate the public registration link for "${agent.agent_name}"?\n\nThe old link will stop working.`
                );

            if (
                !confirmed
            ) {
                return;
            }

            try {
                setLinkActionId(
                    agent.id_agent
                );

                const response =
                    await apiFetch(
                        `/agents/${agent.id_agent}/public-link`,
                        {
                            method:
                                "POST",
                        }
                    );

                await loadAgents();

                showFeedback(
                    "success",
                    `New registration link generated for ${agent.agent_name}.`
                );

                if (
                    response?.data
                        ?.public_url
                ) {
                    try {
                        await navigator.clipboard.writeText(
                            response.data.public_url
                        );
                    } catch {}
                }
            } catch (
                err
            ) {
                showFeedback(
                    "error",
                    err.message ||
                        "Failed to regenerate link."
                );
            } finally {
                setLinkActionId(
                    null
                );
            }
        };

    // =================================================
    // FILTER
    // =================================================

    const filteredAgents =
        agents.filter(
            (
                agent
            ) => {
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

                    agent.login_username
                        ?.toLowerCase()
                        .includes(
                            keyword
                        )
                );
            }
        );

    // =================================================
    // RENDER
    // =================================================

    return (
        <div className="page-container agents-management-page">

            {/* ==========================================
                HEADER
            =========================================== */}

            <div className="page-header">

                <div>
                    <h1>
                        Agent Management
                    </h1>

                    <p>
                        Create Agent accounts,
                        manage public registration
                        links, and monitor
                        registrations.
                    </p>
                </div>

                <button
                    type="button"
                    className="primary-button"
                    onClick={
                        openAddModal
                    }
                >
                    + Add Agent
                </button>

            </div>

            {/* ==========================================
                HELP
            =========================================== */}

            <div className="agent-help-box">

                <div className="agent-help-icon">
                    ↗
                </div>

                <div>
                    <strong>
                        Agent workflow
                    </strong>

                    <p>
                        Create the Agent
                        account here. The
                        Agent logs in with
                        the username and
                        password, then copies
                        or shares the Agent's
                        stable customer
                        registration link.
                        Customers do not need
                        to log in.
                    </p>
                </div>

            </div>

            {/* ==========================================
                FEEDBACK
            =========================================== */}

            {feedback.message && (
                <div
                    className={`agent-feedback ${feedback.type}`}
                >
                    {
                        feedback.message
                    }
                </div>
            )}

            {error && (
                <div className="agent-feedback error">
                    {error}
                </div>
            )}

            {/* ==========================================
                SEARCH
            =========================================== */}

            <div className="panel agent-toolbar">

                <input
                    type="text"
                    className="search-input"
                    placeholder="Search agent, username or email..."
                    value={
                        search
                    }
                    onChange={(
                        event
                    ) =>
                        setSearch(
                            event
                                .target
                                .value
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

            {/* ==========================================
                TABLE
            =========================================== */}

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

                                    <th>
                                        Agent
                                    </th>

                                    <th>
                                        Login
                                    </th>

                                    <th>
                                        Public Registration Link
                                    </th>

                                    <th>
                                        Registrations
                                    </th>

                                    <th>
                                        Actions
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {filteredAgents.length ===
                                0 ? (
                                    <tr>
                                        <td
                                            colSpan="5"
                                            className="empty-row"
                                        >
                                            No agents found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAgents.map(
                                        (
                                            agent
                                        ) => (
                                            <tr
                                                key={
                                                    agent.id_agent
                                                }
                                            >

                                                {/* AGENT */}

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

                                                        <div>

                                                            <strong>
                                                                {
                                                                    agent.agent_name
                                                                }
                                                            </strong>

                                                            <div className="muted-text">
                                                                {
                                                                    agent.contact_phone ||
                                                                    "-"
                                                                }
                                                            </div>

                                                            <div className="muted-text">
                                                                {
                                                                    agent.contact_email ||
                                                                    "-"
                                                                }
                                                            </div>

                                                        </div>

                                                    </div>

                                                </td>

                                                {/* LOGIN */}

                                                <td>

                                                    {Number(
                                                        agent.has_login_account
                                                    ) === 1 ? (
                                                        <>
                                                            <span className="status-badge status-success">
                                                                Login Ready
                                                            </span>

                                                            <div className="muted-text agent-login-username">
                                                                @
                                                                {
                                                                    agent.login_username
                                                                }
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="status-badge status-danger">
                                                                No Login
                                                            </span>

                                                            <button
                                                                type="button"
                                                                className="secondary-button agent-small-button"
                                                                onClick={() =>
                                                                    openAccountModal(
                                                                        agent
                                                                    )
                                                                }
                                                            >
                                                                Create Login
                                                            </button>
                                                        </>
                                                    )}

                                                </td>

                                                {/* PUBLIC LINK */}

                                                <td>

                                                    <div className="agent-link-cell">

                                                        <a
                                                            className="agent-link-url"
                                                            href={
                                                                agent.public_url
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            title={
                                                                agent.public_url
                                                            }
                                                        >
                                                            {
                                                                agent.public_url
                                                            }
                                                        </a>

                                                        <div className="agent-link-note">
                                                            Stable link •
                                                            changes only
                                                            when regenerated
                                                        </div>

                                                        <div className="agent-action-stack">

                                                            <a
                                                                className="secondary-button agent-small-button"
                                                                href={
                                                                    agent.public_url
                                                                }
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                Open
                                                            </a>

                                                            <button
                                                                type="button"
                                                                className="secondary-button agent-small-button"
                                                                onClick={() =>
                                                                    copyPublicLink(
                                                                        agent
                                                                    )
                                                                }
                                                            >
                                                                {
                                                                    copiedId ===
                                                                    agent.id_agent
                                                                        ? "Copied"
                                                                        : "Copy"
                                                                }
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="secondary-button agent-small-button"
                                                                onClick={() =>
                                                                    sharePublicLink(
                                                                        agent
                                                                    )
                                                                }
                                                            >
                                                                Share
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="secondary-button agent-small-button"
                                                                onClick={() =>
                                                                    openWhatsApp(
                                                                        agent
                                                                    )
                                                                }
                                                            >
                                                                WhatsApp
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="delete-button agent-small-button"
                                                                disabled={
                                                                    linkActionId ===
                                                                    agent.id_agent
                                                                }
                                                                onClick={() =>
                                                                    regeneratePublicLink(
                                                                        agent
                                                                    )
                                                                }
                                                            >
                                                                {
                                                                    linkActionId ===
                                                                    agent.id_agent
                                                                        ? "Regenerating..."
                                                                        : "Regenerate"
                                                                }
                                                            </button>

                                                        </div>

                                                    </div>

                                                </td>

                                                {/* STATS */}

                                                <td>

                                                    <div className="agent-stat-grid">

                                                        <div className="agent-stat">

                                                            <span>
                                                                Total
                                                            </span>

                                                            <strong>
                                                                {
                                                                    agent.total_registrations ||
                                                                    0
                                                                }
                                                            </strong>

                                                        </div>

                                                        <div className="agent-stat">

                                                            <span>
                                                                Pending
                                                            </span>

                                                            <strong>
                                                                {
                                                                    agent.pending_registrations ||
                                                                    0
                                                                }
                                                            </strong>

                                                        </div>

                                                        <div className="agent-stat">

                                                            <span>
                                                                Approved
                                                            </span>

                                                            <strong>
                                                                {
                                                                    agent.approved_registrations ||
                                                                    0
                                                                }
                                                            </strong>

                                                        </div>

                                                        <div className="agent-stat">

                                                            <span>
                                                                Rejected
                                                            </span>

                                                            <strong>
                                                                {
                                                                    agent.rejected_registrations ||
                                                                    0
                                                                }
                                                            </strong>

                                                        </div>

                                                    </div>

                                                </td>

                                                {/* ACTIONS */}

                                                <td>

                                                    <div className="agent-action-stack">

                                                        <button
                                                            type="button"
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
                                                            type="button"
                                                            className="delete-button"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    agent
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

            {/* ==========================================
                ADD / EDIT MODAL
            =========================================== */}

            {showModal && (
                <div className="modal-overlay">

                    <div className="modal-card">

                        <div className="modal-header">

                            <div>

                                <h2>
                                    {
                                        editingAgent
                                            ? "Edit Agent"
                                            : "Create Agent Account"
                                    }
                                </h2>

                                <p>
                                    {
                                        editingAgent
                                            ? "Update Agent information."
                                            : "Create the Agent profile and login account together."
                                    }
                                </p>

                            </div>

                            <button
                                type="button"
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

                            <div className="form-grid">

                                {/* NAME */}

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
                                        required
                                    />

                                </div>

                                {/* PHONE */}

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

                                {/* EMAIL */}

                                <div className="form-group">

                                    <label>
                                        Contact Email *
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
                                        required={
                                            !editingAgent
                                        }
                                    />

                                    <small>
                                        This email links
                                        the Agent profile
                                        to the Agent login.
                                    </small>

                                </div>

                                {/* ADDRESS */}

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
                                        rows="3"
                                    />

                                </div>

                                {/* CREATE ACCOUNT */}

                                {!editingAgent && (
                                    <>

                                        <div className="form-group">

                                            <label>
                                                Agent Login Username *
                                            </label>

                                            <input
                                                type="text"
                                                name="login_username"
                                                value={
                                                    form.login_username
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                autoComplete="username"
                                                required
                                            />

                                        </div>

                                        <div className="form-group">

                                            <label>
                                                Agent Login Password *
                                            </label>

                                            <input
                                                type="password"
                                                name="login_password"
                                                value={
                                                    form.login_password
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                autoComplete="new-password"
                                                placeholder="At least 8 chars, A-Z, a-z, 0-9, special"
                                                required
                                            />

                                            <small>
                                                Minimum 8
                                                characters,
                                                uppercase,
                                                lowercase,
                                                number and
                                                special
                                                character.
                                            </small>

                                        </div>

                                    </>
                                )}

                            </div>

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={
                                        closeModal
                                    }
                                    disabled={
                                        saving
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={
                                        saving
                                    }
                                >
                                    {
                                        saving
                                            ? "Saving..."
                                            : editingAgent
                                            ? "Save Changes"
                                            : "Create Agent"
                                    }
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            {/* ==========================================
                CREATE LOGIN MODAL
            =========================================== */}

            {showAccountModal &&
                accountAgent && (
                    <div className="modal-overlay">

                        <div className="modal-card">

                            <div className="modal-header">

                                <div>

                                    <h2>
                                        Create Agent Login
                                    </h2>

                                    <p>
                                        {
                                            accountAgent.agent_name
                                        }
                                    </p>

                                </div>

                                <button
                                    type="button"
                                    className="modal-close"
                                    onClick={
                                        closeAccountModal
                                    }
                                >
                                    ×
                                </button>

                            </div>

                            <form
                                onSubmit={
                                    createLoginAccount
                                }
                            >

                                <div className="form-group">

                                    <label>
                                        Username *
                                    </label>

                                    <input
                                        type="text"
                                        name="login_username"
                                        value={
                                            accountForm.login_username
                                        }
                                        onChange={
                                            handleAccountChange
                                        }
                                        autoComplete="username"
                                        required
                                    />

                                </div>

                                <div className="form-group">

                                    <label>
                                        Password *
                                    </label>

                                    <input
                                        type="password"
                                        name="login_password"
                                        value={
                                            accountForm.login_password
                                        }
                                        onChange={
                                            handleAccountChange
                                        }
                                        autoComplete="new-password"
                                        placeholder="Strong password"
                                        required
                                    />

                                    <small>
                                        At least 8
                                        characters with
                                        uppercase,
                                        lowercase,
                                        number and
                                        special
                                        character.
                                    </small>

                                </div>

                                <div className="agent-link-note">

                                    Login email:
                                    {" "}
                                    {
                                        accountAgent.contact_email ||
                                        "-"
                                    }

                                </div>

                                <div className="modal-actions">

                                    <button
                                        type="button"
                                        className="secondary-button"
                                        onClick={
                                            closeAccountModal
                                        }
                                        disabled={
                                            accountSaving
                                        }
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="primary-button"
                                        disabled={
                                            accountSaving
                                        }
                                    >
                                        {
                                            accountSaving
                                                ? "Creating..."
                                                : "Create Login"
                                        }
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