const pool = require("../db");


// ======================================================
// REPORTS
// ======================================================
const getDashboardReports = async (req, res) => {

    try {

        // =================================================
        // SIM SUMMARY
        // =================================================

        const [[simSummary]] = await pool.query(`
            SELECT
                COUNT(*) AS total,

                SUM(
                    CASE
                        WHEN LOWER(ss.status_name) = 'available'
                        THEN 1
                        ELSE 0
                    END
                ) AS available,

                SUM(
                    CASE
                        WHEN LOWER(ss.status_name) = 'registered'
                        THEN 1
                        ELSE 0
                    END
                ) AS registered,

                SUM(
                    CASE
                        WHEN LOWER(ss.status_name) = 'blocked'
                        THEN 1
                        ELSE 0
                    END
                ) AS blocked,

                SUM(
                    CASE
                        WHEN LOWER(ss.status_name) = 'reserved'
                        THEN 1
                        ELSE 0
                    END
                ) AS reserved

            FROM sim_cards s

            LEFT JOIN sim_status ss
                ON s.id_sim_status =
                   ss.id_sim_status

            WHERE s.deleted_at IS NULL
        `);


        // =================================================
        // REGISTRATION SUMMARY
        // =================================================

        const [[registrationSummary]] =
            await pool.query(`
                SELECT

                    COUNT(*) AS total,

                    SUM(
                        CASE
                            WHEN LOWER(rs.status_name) = 'pending'
                            THEN 1
                            ELSE 0
                        END
                    ) AS pending,

                    SUM(
                        CASE
                            WHEN LOWER(rs.status_name) = 'approved'
                            THEN 1
                            ELSE 0
                        END
                    ) AS approved,

                    SUM(
                        CASE
                            WHEN LOWER(rs.status_name) = 'rejected'
                            THEN 1
                            ELSE 0
                        END
                    ) AS rejected

                FROM registrations r

                LEFT JOIN registrations_status rs
                    ON r.id_registration_status =
                       rs.id_registration_status

                WHERE r.deleted_at IS NULL
            `);


        // =================================================
        // DAILY REGISTRATION
        // LAST 30 DAYS
        // =================================================

        const [daily] = await pool.query(`
            SELECT
                DATE(registered_at) AS registration_date,
                COUNT(*) AS total
            FROM registrations
            WHERE deleted_at IS NULL
              AND registered_at >=
                  DATE_SUB(CURDATE(), INTERVAL 29 DAY)
            GROUP BY DATE(registered_at)
            ORDER BY registration_date ASC
        `);


        // =================================================
        // WEEKLY REGISTRATION
        // LAST 12 WEEKS
        // =================================================

        const [weekly] = await pool.query(`
            SELECT
                YEARWEEK(
                    registered_at,
                    3
                ) AS year_week,

                MIN(
                    DATE(registered_at)
                ) AS week_start,

                COUNT(*) AS total

            FROM registrations

            WHERE deleted_at IS NULL
              AND registered_at >=
                  DATE_SUB(
                      CURDATE(),
                      INTERVAL 83 DAY
                  )

            GROUP BY YEARWEEK(
                registered_at,
                3
            )

            ORDER BY year_week ASC
        `);


        // =================================================
        // MONTHLY REGISTRATION
        // LAST 12 MONTHS
        // =================================================

        const [monthly] = await pool.query(`
            SELECT

                DATE_FORMAT(
                    registered_at,
                    '%Y-%m'
                ) AS month,

                COUNT(*) AS total

            FROM registrations

            WHERE deleted_at IS NULL
              AND registered_at >=
                  DATE_SUB(
                      CURDATE(),
                      INTERVAL 11 MONTH
                  )

            GROUP BY DATE_FORMAT(
                registered_at,
                '%Y-%m'
            )

            ORDER BY month ASC
        `);


        // =================================================
        // CURRENT DAY / WEEK / MONTH
        // =================================================

        const [[periodSummary]] =
            await pool.query(`
                SELECT

                    SUM(
                        CASE
                            WHEN DATE(registered_at)
                                 = CURDATE()
                            THEN 1
                            ELSE 0
                        END
                    ) AS today,

                    SUM(
                        CASE
                            WHEN YEARWEEK(
                                registered_at,
                                3
                            )
                            =
                            YEARWEEK(
                                CURDATE(),
                                3
                            )
                            THEN 1
                            ELSE 0
                        END
                    ) AS this_week,

                    SUM(
                        CASE
                            WHEN YEAR(registered_at)
                                 = YEAR(CURDATE())
                             AND MONTH(registered_at)
                                 = MONTH(CURDATE())
                            THEN 1
                            ELSE 0
                        END
                    ) AS this_month

                FROM registrations

                WHERE deleted_at IS NULL
            `);


        // =================================================
        // BY SIM TYPE
        // =================================================

        const [bySimType] =
            await pool.query(`
                SELECT

                    st.id_sim_type,

                    st.sim_type,

                    COUNT(
                        r.id_registration
                    ) AS registrations

                FROM sim_types st

                LEFT JOIN sim_cards s
                    ON s.id_sim_type =
                       st.id_sim_type

                LEFT JOIN registrations r
                    ON r.id_sim = s.id_sim

                   AND r.deleted_at IS NULL

                GROUP BY
                    st.id_sim_type,
                    st.sim_type

                ORDER BY registrations DESC
            `);


        // =================================================
        // BY AGENT
        // =================================================

        const [byAgent] =
            await pool.query(`
                SELECT

                    a.id_agent,

                    a.agent_name,

                    COUNT(
                        r.id_registration
                    ) AS registrations

                FROM agents a

                LEFT JOIN registrations r
                    ON r.id_agent =
                       a.id_agent

                   AND r.deleted_at IS NULL

                WHERE a.deleted_at IS NULL

                GROUP BY
                    a.id_agent,
                    a.agent_name

                ORDER BY registrations DESC
            `);


        // =================================================
        // REMAINING SIM / IMSI
        // =================================================

        const [remainingByStatus] =
            await pool.query(`
                SELECT

                    ss.status_name AS status,

                    COUNT(*) AS total

                FROM sim_cards s

                INNER JOIN sim_status ss
                    ON s.id_sim_status =
                       ss.id_sim_status

                WHERE s.deleted_at IS NULL

                GROUP BY
                    ss.status_name

                ORDER BY
                    ss.status_name ASC
            `);


        // =================================================
        // REMAINING BY SIM TYPE
        // =================================================

        const [remainingByType] =
            await pool.query(`
                SELECT

                    st.sim_type,

                    SUM(
                        CASE
                            WHEN LOWER(
                                ss.status_name
                            ) = 'available'
                            THEN 1
                            ELSE 0
                        END
                    ) AS available,

                    SUM(
                        CASE
                            WHEN LOWER(
                                ss.status_name
                            ) = 'registered'
                            THEN 1
                            ELSE 0
                        END
                    ) AS registered,

                    COUNT(*) AS total

                FROM sim_cards s

                LEFT JOIN sim_types st
                    ON s.id_sim_type =
                       st.id_sim_type

                LEFT JOIN sim_status ss
                    ON s.id_sim_status =
                       ss.id_sim_status

                WHERE s.deleted_at IS NULL

                GROUP BY
                    st.sim_type

                ORDER BY
                    st.sim_type ASC
            `);


        // =================================================
        // SYSTEM COUNTS
        // =================================================

        const [[customerStats]] =
            await pool.query(`
                SELECT COUNT(*) AS total
                FROM customers
            `);


        const [[agentStats]] =
            await pool.query(`
                SELECT COUNT(*) AS total
                FROM agents
                WHERE deleted_at IS NULL
            `);


        const [[userStats]] =
            await pool.query(`
                SELECT COUNT(*) AS total
                FROM users
                WHERE deleted_at IS NULL
            `);


        // =================================================
        // RESPONSE
        // =================================================

        res.json({
            success: true,

            data: {

                sim: {
                    total:
                        Number(
                            simSummary.total || 0
                        ),

                    available:
                        Number(
                            simSummary.available || 0
                        ),

                    registered:
                        Number(
                            simSummary.registered || 0
                        ),

                    reserved:
                        Number(
                            simSummary.reserved || 0
                        ),

                    blocked:
                        Number(
                            simSummary.blocked || 0
                        )
                },


                registrations: {

                    total:
                        Number(
                            registrationSummary.total || 0
                        ),

                    pending:
                        Number(
                            registrationSummary.pending || 0
                        ),

                    approved:
                        Number(
                            registrationSummary.approved || 0
                        ),

                    rejected:
                        Number(
                            registrationSummary.rejected || 0
                        )
                },


                periods: {

                    today:
                        Number(
                            periodSummary.today || 0
                        ),

                    this_week:
                        Number(
                            periodSummary.this_week || 0
                        ),

                    this_month:
                        Number(
                            periodSummary.this_month || 0
                        )
                },


                daily:
                    daily.map(row => ({
                        date:
                            row.registration_date,

                        total:
                            Number(row.total || 0)
                    })),


                weekly:
                    weekly.map(row => ({
                        week:
                            row.year_week,

                        week_start:
                            row.week_start,

                        total:
                            Number(row.total || 0)
                    })),


                monthly:
                    monthly.map(row => ({
                        month:
                            row.month,

                        total:
                            Number(row.total || 0)
                    })),


                by_sim_type:
                    bySimType.map(row => ({
                        id_sim_type:
                            row.id_sim_type,

                        sim_type:
                            row.sim_type,

                        registrations:
                            Number(
                                row.registrations || 0
                            )
                    })),


                by_agent:
                    byAgent.map(row => ({
                        id_agent:
                            row.id_agent,

                        agent_name:
                            row.agent_name,

                        registrations:
                            Number(
                                row.registrations || 0
                            )
                    })),


                remaining: {

                    by_status:
                        remainingByStatus.map(row => ({
                            status:
                                row.status,

                            total:
                                Number(
                                    row.total || 0
                                )
                        })),

                    by_sim_type:
                        remainingByType.map(row => ({
                            sim_type:
                                row.sim_type,

                            available:
                                Number(
                                    row.available || 0
                                ),

                            registered:
                                Number(
                                    row.registered || 0
                                ),

                            total:
                                Number(
                                    row.total || 0
                                )
                        }))
                },


                customers: {
                    total:
                        Number(
                            customerStats.total || 0
                        )
                },

                agents: {
                    total:
                        Number(
                            agentStats.total || 0
                        )
                },

                users: {
                    total:
                        Number(
                            userStats.total || 0
                        )
                }
            }
        });

    } catch (error) {

        console.error(
            "GET /reports ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


module.exports = {
    getDashboardReports
};