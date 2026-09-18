const pool = require("../db");

const getDashboardReports = async (req, res) => {
    try {
        const [[simStats]] = await pool.query(`
            SELECT
                COUNT(*) AS total_sim,
                SUM(
                    CASE
                        WHEN ss.sim_status = 'Available' THEN 1
                        ELSE 0
                    END
                ) AS available_sim,
                SUM(
                    CASE
                        WHEN ss.sim_status = 'Registered' THEN 1
                        ELSE 0
                    END
                ) AS registered_sim,
                SUM(
                    CASE
                        WHEN ss.sim_status = 'Blocked' THEN 1
                        ELSE 0
                    END
                ) AS blocked_sim
            FROM sim_cards s
            LEFT JOIN sim_status ss
                ON s.id_sim_status = ss.id_sim_status
            WHERE s.deleted_at IS NULL
        `);

        const [[registrationStats]] = await pool.query(`
            SELECT
                COUNT(*) AS total_registrations,
                SUM(
                    CASE
                        WHEN rs.status_name = 'Pending' THEN 1
                        ELSE 0
                    END
                ) AS pending_registrations,
                SUM(
                    CASE
                        WHEN rs.status_name = 'Approved' THEN 1
                        ELSE 0
                    END
                ) AS approved_registrations,
                SUM(
                    CASE
                        WHEN rs.status_name = 'Rejected' THEN 1
                        ELSE 0
                    END
                ) AS rejected_registrations
            FROM registrations r
            LEFT JOIN registrations_status rs
                ON r.id_registration_status =
                   rs.id_registration_status
            WHERE r.deleted_at IS NULL
        `);

        const [[customerStats]] = await pool.query(`
            SELECT COUNT(*) AS total_customers
            FROM customers
        `);

        const [[agentStats]] = await pool.query(`
            SELECT COUNT(*) AS total_agents
            FROM agents
            WHERE deleted_at IS NULL
        `);

        const [[userStats]] = await pool.query(`
            SELECT COUNT(*) AS total_users
            FROM users
            WHERE deleted_at IS NULL
        `);

        res.json({
            success: true,
            message: "Dashboard reports retrieved successfully",
            data: {
                sim: {
                    total: Number(simStats.total_sim || 0),
                    available: Number(simStats.available_sim || 0),
                    registered: Number(simStats.registered_sim || 0),
                    blocked: Number(simStats.blocked_sim || 0)
                },

                registrations: {
                    total: Number(
                        registrationStats.total_registrations || 0
                    ),
                    pending: Number(
                        registrationStats.pending_registrations || 0
                    ),
                    approved: Number(
                        registrationStats.approved_registrations || 0
                    ),
                    rejected: Number(
                        registrationStats.rejected_registrations || 0
                    )
                },

                customers: {
                    total: Number(
                        customerStats.total_customers || 0
                    )
                },

                agents: {
                    total: Number(
                        agentStats.total_agents || 0
                    )
                },

                users: {
                    total: Number(
                        userStats.total_users || 0
                    )
                }
            }
        });

    } catch (error) {
        console.error("GET /reports ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

module.exports = {
    getDashboardReports
};