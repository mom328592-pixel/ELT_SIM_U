const pool = require("../db");

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://eltsimu.vercel.app";

// ======================================================
// FIND CURRENT AGENT
// ======================================================

const findCurrentAgent =
    async (
        userId
    ) => {
        const [rows] =
            await pool.query(
                `
                SELECT
                    a.id_agent,
                    a.agent_name,
                    a.contact_phone,
                    a.contact_email,
                    a.public_token,

                    CONCAT(
                        ?,
                        '/customer-registration/',
                        a.public_token
                    ) AS public_url

                FROM users u

                INNER JOIN agents a
                    ON a.contact_email =
                       u.email

                WHERE u.id_user = ?
                  AND u.id_role = 3
                  AND u.deleted_at IS NULL
                  AND a.deleted_at IS NULL

                LIMIT 1
                `,
                [
                    FRONTEND_URL.replace(
                        /\/$/,
                        ""
                    ),
                    userId,
                ]
            );

        return rows[0] || null;
    };

// ======================================================
// AGENT DASHBOARD
// ======================================================

const getMyAgentDashboard =
    async (
        req,
        res
    ) => {
        try {
            const agent =
                await findCurrentAgent(
                    req.user?.id_user
                );

            if (!agent) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Your Agent account is not linked to an active Agent profile",
                });
            }

            // ==========================================
            // STATS
            // ==========================================

            const [statsRows] =
                await pool.query(
                    `
                    SELECT

                        COUNT(*) AS total_registrations,

                        SUM(
                            CASE
                                WHEN LOWER(
                                    rs.status_name
                                ) = 'pending'
                                THEN 1
                                ELSE 0
                            END
                        ) AS pending_registrations,

                        SUM(
                            CASE
                                WHEN LOWER(
                                    rs.status_name
                                ) = 'approved'
                                THEN 1
                                ELSE 0
                            END
                        ) AS approved_registrations,

                        SUM(
                            CASE
                                WHEN LOWER(
                                    rs.status_name
                                ) = 'rejected'
                                THEN 1
                                ELSE 0
                            END
                        ) AS rejected_registrations

                    FROM registrations r

                    INNER JOIN registrations_status rs
                        ON r.id_registration_status =
                           rs.id_registration_status

                    WHERE r.id_agent = ?
                      AND r.deleted_at IS NULL
                    `,
                    [
                        agent.id_agent,
                    ]
                );

            // ==========================================
            // RECENT REGISTRATIONS
            // ==========================================

            const [recentRows] =
                await pool.query(
                    `
                    SELECT

                        r.id_registration,

                        CONCAT(
                            COALESCE(
                                c.first_name,
                                ''
                            ),
                            ' ',
                            COALESCE(
                                c.last_name,
                                ''
                            )
                        ) AS customer_name,

                        c.nationality,

                        rs.status_name
                            AS registration_status,

                        st.sim_type,

                        s.phone_number,

                        r.registered_at

                    FROM registrations r

                    INNER JOIN customers c
                        ON r.id_customer =
                           c.id_customer

                    INNER JOIN registrations_status rs
                        ON r.id_registration_status =
                           rs.id_registration_status

                    INNER JOIN sim_cards s
                        ON r.id_sim =
                           s.id_sim

                    LEFT JOIN sim_types st
                        ON s.id_sim_type =
                           st.id_sim_type

                    WHERE r.id_agent = ?
                      AND r.deleted_at IS NULL

                    ORDER BY r.created_at DESC

                    LIMIT 10
                    `,
                    [
                        agent.id_agent,
                    ]
                );

            return res.json({
                success: true,

                data: {
                    agent,

                    stats:
                        statsRows[0] || {
                            total_registrations: 0,
                            pending_registrations: 0,
                            approved_registrations: 0,
                            rejected_registrations: 0,
                        },

                    recent_registrations:
                        recentRows,
                },
            });
        } catch (error) {
            console.error(
                "GET AGENT DASHBOARD ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Database error",
            });
        }
    };

module.exports = {
    getMyAgentDashboard,
};