import {
    useCallback,
    useEffect,
    useState,
} from "react";

import { apiFetch } from "../../api";

const emptyForm = {
    agent_name: "",
    contact_phone: "",
    contact_email: "",
    address: "",
};

function Agents() {
    const [agents, setAgents] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [showModal, setShowModal] =
        useState(false);

    const [editingAgent, setEditingAgent] =
        useState(null);

    const [form, setForm] =
        useState(emptyForm);

    const [search, setSearch] =
        useState("");

    const [error, setError] =
        useState("");

    const [message, setMessage] =
        useState("");

    const [
        linkActionId,
        setLinkActionId,
    ] = useState(null);

    const [
        copiedId,
        setCopiedId,
    ] = useState(null);

    // =================================================
    // LOAD AGENTS
    // =================================================

    const loadAgents =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );
                    setError("");

                    const response =
                        await apiFetch(
                            "/agents"
                        );

                    setAgents(
                        response.data ||
                            []
                    );
                } catch (
                    error
                ) {
                    console.error(
                        error
                    );

                    setError(
                        error.message ||
                            "Failed to load agents."
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            },
            []
        );

    useEffect(() => {
        loadAgents();
    }, [loadAgents]);

    // =================================================
    // OPEN ADD
    // =================================================

    const openAdd = () => {
        setEditingAgent(
            null
        );

        setForm({
            ...emptyForm,
        });

        setMessage("");
        setError("");
        setShowModal(
            true
        );
    };

    // =================================================
    // OPEN EDIT
    // =================================================

    const openEdit =
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

            setMessage("");
            setError("");
            setShowModal(
                true
            );
        };

    // =================================================
    // CLOSE
    // =================================================

    const closeModal = () => {
        if (saving) return;

        setShowModal(
            false
        );

        setEditingAgent(
            null
        );

        setForm({
            ...emptyForm,
        });
    };

    // =================================================
    // CHANGE
    // =================================================

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

    // =================================================
    // SAVE
    // =================================================

    const handleSubmit =
        async (
            event
        ) => {
            event.preventDefault();

            if (
                !form.agent_name.trim()
            ) {
                setError(
                    "Agent name is required."
                );
                return;
            }

            try {
                setSaving(
                    true
                );
                setError("");

                const payload = {
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

                    setMessage(
                        "Agent updated successfully."
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
                                        payload
                                    ),
                            }
                        );

                    if (
                        response?.data
                            ?.public_url
                    ) {
                        window.alert(
                            "Agent created successfully.\n\nPublic Registration Link:\n" +
                                response.data.public_url
                        );
                    }

                    setMessage(
                        "Agent created successfully."
                    );
                }

                setShowModal(
                    false
                );

                setEditingAgent(
                    null
                );

                setForm({
                    ...emptyForm,
                });

                await loadAgents();
            } catch (
                error
            ) {
                console.error(
                    error
                );

                setError(
                    error.message ||
                        "Failed to save Agent."
                );
            } finally {
                setSaving(
                    false
                );
            }
        };

    // =================================================
    // DELETE
    // =================================================

    const handleDelete =
        async (agent) => {
            const ok =
                window.confirm(
                    `Delete "${agent.agent_name}"?`
                );

            if (!ok) return;

            try {
                await apiFetch(
                    `/agents/${agent.id_agent}`,
                    {
                        method:
                            "DELETE",
                    }
                );

                setMessage(
                    "Agent deleted successfully."
                );

                await loadAgents();
            } catch (
                error
            ) {
                setError(
                    error.message ||
                        "Failed to delete Agent."
                );
            }
        };

    // =================================================
    // COPY LINK
    // =================================================

    const copyLink =
        async (agent) => {
            if (
                !agent.public_url
            )
                return;

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
            } catch {
                window.prompt(
                    "Copy public registration link:",
                    agent.public_url
                );
            }
        };

    // =================================================
    // SHARE
    // =================================================

    const shareLink =
        async (agent) => {
            if (
                !agent.public_url
            )
                return;

            const text =
                `SIM Registration\n\n` +
                `Please open this link to register your SIM:\n` +
                agent.public_url;

            try {
                if (
                    navigator.share
                ) {
                    await navigator.share(
                        {
                            title:
                                "SIM Registration",
                            text,
                            url:
                                agent.public_url,
                        }
                    );
                    return;
                }

                await navigator.clipboard.writeText(
                    text
                );

                setMessage(
                    "Registration message copied."
                );
            } catch (
                error
            ) {
                if (
                    error?.name !==
                    "AbortError"
                ) {
                    setError(
                        "Unable to share link."
                    );
                }
            }
        };

    // =================================================
    // WHATSAPP
    // =================================================

    const openWhatsApp =
        (agent) => {
            if (
                !agent.public_url
            )
                return;

            const text =
                `SIM Registration\n\n` +
                `Please open this link to register your SIM:\n` +
                agent.public_url;

            window.open(
                `https://wa.me/?text=${encodeURIComponent(
                    text
                )}`,
                "_blank",
                "noopener,noreferrer"
            );
        };

    // =================================================
    // REGENERATE
    // =================================================

    const regenerateLink =
        async (
            agent
        ) => {
            const ok =
                window.confirm(
                    `Regenerate public link for "${agent.agent_name}"?\n\nThe old link will stop working.`
                );

            if (!ok) return;

            try {
                setLinkActionId(
                    agent.id_agent
                );

                await apiFetch(
                    `/agents/${agent.id_agent}/public-link`,
                    {
                        method:
                            "POST",
                    }
                );

                setMessage(
                    "Public registration link regenerated."
                );

                await loadAgents();
            } catch (
                error
            ) {
                setError(
                    error.message ||
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
            (agent) => {
                const key =
                    search
                        .trim()
                        .toLowerCase();

                if (!key)
                    return true;

                return [
                    agent.agent_name,
                    agent.contact_phone,
                    agent.contact_email,
                    agent.address,
                ]
                    .filter(Boolean)
                    .some(
                        (value) =>
                            String(
                                value
                            )
                                .toLowerCase()
                                .includes(
                                    key
                                )
                    );
            }
        );

    if (loading) {
        return (
            <div className="panel">
                Loading agents...
            </div>
        );
    }

    return (
        <div className="agents-module">

            <div className="page-header">

                <div>
                    <h2>
                        Agents
                    </h2>

                    <p>
                        Manage Agent
                        profiles and
                        customer
                        registration
                        links.
                    </p>
                </div>

                <button
                    type="button"
                    className="primary-button"
                    onClick={
                        openAdd
                    }
                >
                    + Add Agent
                </button>
            </div>

            {error && (
                <div className="registration-error">
                    {error}
                </div>
            )}

            {message && (
                <div className="success-banner">
                    {message}
                </div>
            )}

            <div className="panel">

                <div
                    className="agent-toolbar"
                    style={{
                        display:
                            "flex",
                        justifyContent:
                            "space-between",
                        gap:
                            "12px",
                        marginBottom:
                            "16px",
                    }}
                >
                    <input
                        type="search"
                        className="search-input"
                        placeholder="Search Agent..."
                        value={
                            search
                        }
                        onChange={
                            (e) =>
                                setSearch(
                                    e
                                        .target
                                        .value
                                )
                        }
                    />

                    <span>
                        {
                            filteredAgents.length
                        }{" "}
                        Agent(s)
                    </span>
                </div>

                <div className="table-wrapper">

                    <table>

                        <thead>
                            <tr>
                                <th>
                                    Agent
                                </th>

                                <th>
                                    Contact
                                </th>

                                <th>
                                    Registrations
                                </th>

                                <th>
                                    Public Link
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

                                            <td>
                                                <strong>
                                                    {
                                                        agent.agent_name
                                                    }
                                                </strong>

                                                <div>
                                                    ID: #
                                                    {
                                                        agent.id_agent
                                                    }
                                                </div>
                                            </td>

                                            <td>
                                                <div>
                                                    {
                                                        agent.contact_phone ||
                                                        "-"
                                                    }
                                                </div>

                                                <div>
                                                    {
                                                        agent.contact_email ||
                                                        "-"
                                                    }
                                                </div>
                                            </td>

                                            <td>
                                                <div>
                                                    Total:{" "}
                                                    {
                                                        agent.total_registrations ||
                                                        0
                                                    }
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

                                            <td>

                                                <div
                                                    style={{
                                                        maxWidth:
                                                            "320px",
                                                        wordBreak:
                                                            "break-all",
                                                        fontSize:
                                                            "11px",
                                                    }}
                                                >
                                                    {
                                                        agent.public_url
                                                    }
                                                </div>

                                                <div
                                                    className="agent-action-stack"
                                                    style={{
                                                        display:
                                                            "flex",
                                                        gap:
                                                            "6px",
                                                        flexWrap:
                                                            "wrap",
                                                        marginTop:
                                                            "8px",
                                                    }}
                                                >

                                                    <button
                                                        type="button"
                                                        className="secondary-button"
                                                        onClick={() =>
                                                            copyLink(
                                                                agent
                                                            )
                                                        }
                                                    >
                                                        {copiedId ===
                                                        agent.id_agent
                                                            ? "Copied"
                                                            : "Copy"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="secondary-button"
                                                        onClick={() =>
                                                            shareLink(
                                                                agent
                                                            )
                                                        }
                                                    >
                                                        Share
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="secondary-button"
                                                        onClick={() =>
                                                            openWhatsApp(
                                                                agent
                                                            )
                                                        }
                                                    >
                                                        WhatsApp
                                                    </button>

                                                </div>
                                            </td>

                                            <td>

                                                <div
                                                    className="agent-action-stack"
                                                    style={{
                                                        display:
                                                            "flex",
                                                        gap:
                                                            "6px",
                                                        flexWrap:
                                                            "wrap",
                                                    }}
                                                >

                                                    <button
                                                        type="button"
                                                        className="secondary-button"
                                                        onClick={() =>
                                                            window.open(
                                                                agent.public_url,
                                                                "_blank",
                                                                "noopener,noreferrer"
                                                            )
                                                        }
                                                    >
                                                        Open
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="secondary-button"
                                                        disabled={
                                                            linkActionId ===
                                                            agent.id_agent
                                                        }
                                                        onClick={() =>
                                                            regenerateLink(
                                                                agent
                                                            )
                                                        }
                                                    >
                                                        {linkActionId ===
                                                        agent.id_agent
                                                            ? "..."
                                                            : "New Link"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="secondary-button"
                                                        onClick={() =>
                                                            openEdit(
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
            </div>

            {showModal && (
                <div className="modal-backdrop">

                    <div className="modal-card">

                        <div className="modal-header">

                            <div>
                                <h2>
                                    {editingAgent
                                        ? "Edit Agent"
                                        : "Add Agent"}
                                </h2>

                                <p>
                                    Agent does not
                                    need a backend
                                    login account.
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

                            <div className="form-group">
                                <label>
                                    Phone
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
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    Email
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
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    Address
                                </label>

                                <textarea
                                    name="address"
                                    rows="3"
                                    value={
                                        form.address
                                    }
                                    onChange={
                                        handleChange
                                    }
                                />
                            </div>

                            <div className="agent-link-note">
                                After creating
                                the Agent,
                                the system
                                automatically
                                generates a
                                unique public
                                registration
                                link.
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
                                    {saving
                                        ? "Saving..."
                                        : editingAgent
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