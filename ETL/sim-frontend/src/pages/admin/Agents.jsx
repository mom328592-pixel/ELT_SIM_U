import {
    useCallback,
    useEffect,
    useState,
} from "react";

import { apiFetch } from "../../api";

const initialForm = {
    agent_name: "",
    contact_phone: "",
    contact_email: "",
    address: "",
};

function Agents() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [linkActionId, setLinkActionId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");
    const [feedback, setFeedback] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null);
    const [form, setForm] = useState(initialForm);

    const loadAgents = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const response = await apiFetch("/agents");
            setAgents(response.data || []);
        } catch (err) {
            console.error("GET AGENTS ERROR:", err);
            setError(
                err.message || "Failed to load agents."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAgents();
    }, [loadAgents]);

    const openAddModal = () => {
        setEditingAgent(null);
        setForm({ ...initialForm });
        setFeedback("");
        setShowModal(true);
    };

    const openEditModal = (agent) => {
        setEditingAgent(agent);

        setForm({
            agent_name: agent.agent_name || "",
            contact_phone: agent.contact_phone || "",
            contact_email: agent.contact_email || "",
            address: agent.address || "",
        });

        setFeedback("");
        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) return;

        setShowModal(false);
        setEditingAgent(null);
        setForm({ ...initialForm });
        setFeedback("");
    };

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

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.agent_name.trim()) {
            setFeedback(
                "Agent name is required."
            );
            return;
        }

        try {
            setSaving(true);
            setFeedback("");

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

            if (editingAgent) {
                await apiFetch(
                    `/agents/${editingAgent.id_agent}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(payload),
                    }
                );

                setFeedback(
                    "Agent updated successfully."
                );
            } else {
                const response = await apiFetch(
                    "/agents",
                    {
                        method: "POST",
                        body: JSON.stringify(payload),
                    }
                );

                const newAgent =
                    response?.data;

                if (newAgent?.public_url) {
                    window.alert(
                        `Agent created successfully.\n\nPublic registration link:\n${newAgent.public_url}`
                    );
                }
            }

            closeModal();
            await loadAgents();
        } catch (err) {
            console.error(
                "SAVE AGENT ERROR:",
                err
            );

            setFeedback(
                err.message ||
                    "Failed to save Agent."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (agent) => {
        const confirmed =
            window.confirm(
                `Delete "${agent.agent_name}"?\n\nThe Agent profile will be disabled. Existing registrations will remain for history.`
            );

        if (!confirmed) return;

        try {
            await apiFetch(
                `/agents/${agent.id_agent}`,
                {
                    method: "DELETE",
                }
            );

            setFeedback(
                "Agent deleted successfully."
            );

            await loadAgents();
        } catch (err) {
            setFeedback(
                err.message ||
                    "Failed to delete Agent."
            );
        }
    };

    const copyPublicLink = async (agent) => {
        if (!agent.public_url) return;

        try {
            await navigator.clipboard.writeText(
                agent.public_url
            );

            setCopiedId(agent.id_agent);

            window.setTimeout(
                () =>
                    setCopiedId(null),
                1600
            );
        } catch {
            window.prompt(
                "Copy this Agent registration link:",
                agent.public_url
            );
        }
    };

    const sharePublicLink = async (agent) => {
        if (!agent.public_url) return;

        const message =
            `ETL SIM Registration\n\n` +
            `Please open this link to register a tourist SIM:\n` +
            `${agent.public_url}`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title:
                        "ETL SIM Registration",
                    text: message,
                    url: agent.public_url,
                });

                return;
            }

            await navigator.clipboard.writeText(
                message
            );

            window.alert(
                "Sharing is not available in this browser. The message was copied."
            );
        } catch (err) {
            if (
                err?.name !==
                "AbortError"
            ) {
                console.error(
                    "SHARE AGENT LINK ERROR:",
                    err
                );
            }
        }
    };

    const openWhatsApp = (agent) => {
        if (!agent.public_url) return;

        const message =
            `ETL SIM Registration\n\n` +
            `Please open this link to register a tourist SIM:\n` +
            `${agent.public_url}`;

        window.open(
            `https://wa.me/?text=${encodeURIComponent(
                message
            )}`,
            "_blank",
            "noopener,noreferrer"
        );
    };

    const regeneratePublicLink = async (
        agent
    ) => {
        const confirmed =
            window.confirm(
                `Regenerate the public registration link for "${agent.agent_name}"?\n\nThe old link will stop working.`
            );

        if (!confirmed) return;

        try {
            setLinkActionId(
                agent.id_agent
            );

            await apiFetch(
                `/agents/${agent.id_agent}/public-link`,
                {
                    method: "POST",
                }
            );

            setFeedback(
                "Public registration link regenerated successfully."
            );

            await loadAgents();
        } catch (err) {
            setFeedback(
                err.message ||
                    "Failed to regenerate public link."
            );
        } finally {
            setLinkActionId(null);
        }
    };

    const filteredAgents = agents.filter(
        (agent) => {
            const keyword =
                search
                    .trim()
                    .toLowerCase();

            if (!keyword) return true;

            return [
                agent.agent_name,
                agent.contact_phone,
                agent.contact_email,
                agent.address,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value)
                        .toLowerCase()
                        .includes(keyword)
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
                    <h2>Agents</h2>

                    <p>
                        Manage distributor
                        profiles and their
                        customer registration
                        links.
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

            {error && (
                <div className="registration-error">
                    {error}
                </div>
            )}

            {feedback && (
                <div className="success-banner">
                    {feedback}
                </div>
            )}

            <div className="panel">
                <div
                    className="agent-toolbar"
                    style={{
                        display:
                            "flex",
                        gap: "12px",
                        justifyContent:
                            "space-between",
                        alignItems:
                            "center",
                        marginBottom:
                            "16px",
                    }}
                >
                    <input
                        type="search"
                        className="search-input"
                        placeholder="Search Agent..."
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                    />

                    <span>
                        {
                            filteredAgents.length
                        }{" "}
                        agent(s)
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

                                                <div
                                                    style={{
                                                        fontSize:
                                                            "11px",
                                                        color:
                                                            "#64748b",
                                                    }}
                                                >
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

                                                <div
                                                    style={{
                                                        fontSize:
                                                            "11px",
                                                        color:
                                                            "#64748b",
                                                    }}
                                                >
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
                                            </td>

                                            <td>
                                                <div
                                                    style={{
                                                        maxWidth:
                                                            "310px",
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
                                                    className="action-buttons"
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
                                                            copyPublicLink(
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
                                                            sharePublicLink(
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
                                                    className="action-buttons"
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
                                                        onClick={() =>
                                                            regeneratePublicLink(
                                                                agent
                                                            )
                                                        }
                                                        disabled={
                                                            linkActionId ===
                                                            agent.id_agent
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
                                    need a
                                    backend login
                                    account.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={
                                    closeModal
                                }
                                disabled={
                                    saving
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

                            <div
                                className="agent-link-note"
                                style={{
                                    marginBottom:
                                        "16px",
                                }}
                            >
                                After saving, ETL
                                automatically
                                generates a unique
                                customer
                                registration link
                                for this Agent.
                            </div>

                            {feedback && (
                                <div className="registration-error">
                                    {feedback}
                                </div>
                            )}

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