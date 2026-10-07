import {
    useCallback,
    useEffect,
    useState,
} from "react";

import { apiFetch } from "../../api";

import "../../agent-portal.css";

function AgentDashboard() {
    const [
        data,
        setData,
    ] = useState(null);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState("");

    const [
        copied,
        setCopied,
    ] = useState(false);

    // =================================================
    // LOAD
    // =================================================

    const loadDashboard =
        useCallback(
            async () => {
                try {
                    setLoading(true);
                    setError("");

                    const response =
                        await apiFetch(
                            "/agent-portal/dashboard"
                        );

                    setData(
                        response.data ||
                            null
                    );
                } catch (err) {
                    console.error(
                        "AGENT DASHBOARD ERROR:",
                        err
                    );

                    setError(
                        err.message ||
                            "Unable to load your Agent dashboard."
                    );
                } finally {
                    setLoading(false);
                }
            },
            []
        );

    useEffect(() => {
        loadDashboard();
    }, [
        loadDashboard,
    ]);

    // =================================================
    // PUBLIC URL
    // =================================================

    const publicUrl =
        data?.agent
            ?.public_url ||
        "";

    // =================================================
    // COPY LINK
    // =================================================

    const copyLink =
        async () => {
            if (
                !publicUrl
            ) {
                return;
            }

            try {
                await navigator.clipboard.writeText(
                    publicUrl
                );

                setCopied(true);

                window.setTimeout(
                    () =>
                        setCopied(
                            false
                        ),
                    1600
                );
            } catch {
                window.prompt(
                    "Copy your customer registration link:",
                    publicUrl
                );
            }
        };

    // =================================================
    // SHARE
    // =================================================

    const shareLink =
        async () => {
            if (
                !publicUrl
            ) {
                return;
            }

            const text =
                `SIM Registration\n\n` +
                `Please open this link to register your SIM:\n` +
                `${publicUrl}`;

            try {
                if (
                    navigator.share
                ) {
                    await navigator.share({
                        title:
                            "SIM Registration",
                        text,
                        url:
                            publicUrl,
                    });

                    return;
                }

                await navigator.clipboard.writeText(
                    text
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
                        "SHARE LINK ERROR:",
                        err
                    );
                }
            }
        };

    // =================================================
    // WHATSAPP
    // =================================================

    const openWhatsApp =
        () => {
            if (
                !publicUrl
            ) {
                return;
            }

            const message =
                `SIM Registration\n\n` +
                `Please open this link to register your SIM:\n` +
                `${publicUrl}`;

            window.open(
                `https://wa.me/?text=${encodeURIComponent(
                    message
                )}`,
                "_blank",
                "noopener,noreferrer"
            );
        };

    // =================================================
    // LOADING
    // =================================================

    if (
        loading
    ) {
        return (
            <div className="page-container agent-dashboard">
                <div className="panel agent-dashboard-loading">
                    Loading your Agent dashboard...
                </div>
            </div>
        );
    }

    // =================================================
    // ERROR
    // =================================================

    if (
        error
    ) {
        return (
            <div className="page-container agent-dashboard">
                <div className="agent-feedback error">
                    {error}
                </div>
            </div>
        );
    }

    const stats =
        data?.stats ||
        {};

    const recent =
        data
            ?.recent_registrations ||
        [];

    return (
        <div className="page-container agent-dashboard">

            {/* ==========================================
                HEADER
            =========================================== */}

            <div className="page-header agent-dashboard-header">
                <div>
                    <h1>
                        Welcome,{" "}
                        {data?.agent
                            ?.agent_name ||
                            "Agent"}
                    </h1>

                    <p>
                        Your Agent dashboard and
                        customer registration tools.
                    </p>
                </div>
            </div>

            {/* ==========================================
                LINK HERO
            =========================================== */}

            <section className="agent-link-hero">

                <div className="agent-link-hero-copy">

                    <span className="agent-link-label">
                        YOUR CUSTOMER REGISTRATION LINK
                    </span>

                    <h2>
                        Share this link with your
                        customers
                    </h2>

                    <p>
                        Customers can open this
                        link on their phone and
                        complete SIM registration
                        without an account.
                    </p>

                    <div className="agent-dashboard-url">
                        {publicUrl}
                    </div>

                    <div className="agent-link-actions">

                        <button
                            type="button"
                            className="primary-button"
                            onClick={
                                copyLink
                            }
                        >
                            {copied
                                ? "Copied"
                                : "Copy Link"}
                        </button>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={
                                shareLink
                            }
                        >
                            Share
                        </button>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={
                                openWhatsApp
                            }
                        >
                            WhatsApp
                        </button>

                        <a
                            className="secondary-button"
                            href={
                                publicUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                        >
                            Open Registration
                        </a>

                    </div>

                    <small className="agent-stable-note">
                        Stable link • changes only when
                        an administrator regenerates it.
                    </small>

                </div>

                <div className="agent-link-hero-badge">

                    <span>
                        AGENT
                    </span>

                    <strong>
                        {data?.agent
                            ?.agent_name ||
                            "-"}
                    </strong>

                </div>

            </section>

            {/* ==========================================
                STATS
            =========================================== */}

            <section className="agent-stat-grid-large">

                <div className="agent-stat-card">
                    <span>
                        Total
                    </span>

                    <strong>
                        {
                            stats.total_registrations ||
                            0
                        }
                    </strong>

                    <small>
                        All registrations
                    </small>
                </div>

                <div className="agent-stat-card">
                    <span>
                        Pending
                    </span>

                    <strong>
                        {
                            stats.pending_registrations ||
                            0
                        }
                    </strong>

                    <small>
                        Waiting for review
                    </small>
                </div>

                <div className="agent-stat-card">
                    <span>
                        Approved
                    </span>

                    <strong>
                        {
                            stats.approved_registrations ||
                            0
                        }
                    </strong>

                    <small>
                        Completed registrations
                    </small>
                </div>

                <div className="agent-stat-card">
                    <span>
                        Rejected
                    </span>

                    <strong>
                        {
                            stats.rejected_registrations ||
                            0
                        }
                    </strong>

                    <small>
                        Rejected registrations
                    </small>
                </div>

            </section>

            {/* ==========================================
                RECENT
            =========================================== */}

            <section className="panel agent-recent-panel">

                <div className="agent-section-heading">

                    <div>
                        <h2>
                            Recent Registrations
                        </h2>

                        <p>
                            The latest registrations
                            created through your link.
                        </p>
                    </div>

                </div>

                <div className="table-wrapper">

                    <table className="agent-recent-table">

                        <thead>
                            <tr>
                                <th>
                                    Registration
                                </th>

                                <th>
                                    Customer
                                </th>

                                <th>
                                    Nationality
                                </th>

                                <th>
                                    SIM Type
                                </th>

                                <th>
                                    Phone
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Registered
                                </th>
                            </tr>
                        </thead>

                        <tbody>

                            {recent.length ===
                            0 ? (
                                <tr>
                                    <td
                                        colSpan="7"
                                        className="empty-row"
                                    >
                                        No registrations yet.
                                    </td>
                                </tr>
                            ) : (
                                recent.map(
                                    (
                                        row
                                    ) => (
                                        <tr
                                            key={
                                                row.id_registration
                                            }
                                        >

                                            <td>
                                                #
                                                {
                                                    row.id_registration
                                                }
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        row.customer_name
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    row.nationality ||
                                                    "-"
                                                }
                                            </td>

                                            <td>
                                                {
                                                    row.sim_type ||
                                                    "-"
                                                }
                                            </td>

                                            <td>
                                                {
                                                    row.phone_number ||
                                                    "-"
                                                }
                                            </td>

                                            <td>
                                                <span className="status-badge status-info">
                                                    {
                                                        row.registration_status
                                                    }
                                                </span>
                                            </td>

                                            <td>
                                                {
                                                    row.registered_at
                                                        ? new Date(
                                                              row.registered_at
                                                          ).toLocaleString()
                                                        : "-"
                                                }
                                            </td>

                                        </tr>
                                    )
                                )
                            )}

                        </tbody>

                    </table>

                </div>

            </section>

        </div>
    );
}

export default AgentDashboard;