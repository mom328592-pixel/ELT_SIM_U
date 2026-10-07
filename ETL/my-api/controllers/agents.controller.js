const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const pool = require("../db");
const { createAuditLog } = require("../utils/audit");

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://eltsimu.vercel.app";

const AGENT_ROLE_ID = 3;

const PASSWORD_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

// ======================================================
// GENERATE PUBLIC TOKEN
// ======================================================

const generatePublicToken = () => {
    return crypto.randomBytes(32).toString("hex");
};

// ======================================================
// PUBLIC URL
// ======================================================

const getPublicUrl = (token) => {
    return `${FRONTEND_URL.replace(
        /\/$/,
        ""
    )}/customer-registration/${token}`;
};

// ======================================================
// GET ACTIVE USER STATUS
// ======================================================

const getActiveStatusId = async (
    connection
) => {
    const [rows] =
        await connection.query(
            `
            SELECT
                id_status_user
            FROM status_user
            WHERE LOWER(status_name) = 'active'
            LIMIT 1
            `
        );

    if (!rows.length) {
        throw new Error(
            "Active user status is not configured"
        );
    }

    return Number(
        rows[0].id_status_user
    );
};

// ======================================================
// GET AGENT INTERNAL
// ======================================================

const getAgentByIdInternal =
    async (
        connection,
        id
    ) => {
        const [rows] =
            await connection.query(
                `
                SELECT
                    a.id_agent,
                    a.agent_name,
                    a.contact_phone,
                    a.contact_email,
                    a.address,
                    a.public_token,
                    a.created_by,
                    a.created_at,
                    a.updated_at
                FROM agents a
                WHERE a.id_agent = ?
                  AND a.deleted_at IS NULL
                LIMIT 1
                `,
                [id]
            );

        return rows[0] || null;
    };

// ======================================================
// GET ALL AGENTS
// ======================================================

const getAllAgents =
    async (
        req,
        res
    ) => {
        try {
            const [rows] =
                await pool.query(
                    `
                    SELECT
                        a.id_agent,
                        a.agent_name,
                        a.contact_phone,
                        a.contact_email,
                        a.address,
                        a.public_token,

                        CONCAT(
                            ?,
                            '/customer-registration/',
                            a.public_token
                        ) AS public_url,

                        a.created_by,
                        u.username AS created_by_username,
                        a.created_at,
                        a.updated_at,

                        au.id_user AS agent_user_id,
                        au.username AS login_username,

                        CASE
                            WHEN au.id_user IS NULL
                            THEN 0
                            ELSE 1
                        END AS has_login_account,

                        (
                            SELECT COUNT(*)
                            FROM registrations r
                            WHERE r.id_agent =
                                  a.id_agent
                              AND r.deleted_at IS NULL
                        ) AS total_registrations,

                        (
                            SELECT COUNT(*)
                            FROM registrations r
                            INNER JOIN registrations_status rs
                                ON r.id_registration_status =
                                   rs.id_registration_status
                            WHERE r.id_agent =
                                  a.id_agent
                              AND LOWER(
                                  rs.status_name
                              ) = 'pending'
                              AND r.deleted_at IS NULL
                        ) AS pending_registrations,

                        (
                            SELECT COUNT(*)
                            FROM registrations r
                            INNER JOIN registrations_status rs
                                ON r.id_registration_status =
                                   rs.id_registration_status
                            WHERE r.id_agent =
                                  a.id_agent
                              AND LOWER(
                                  rs.status_name
                              ) = 'approved'
                              AND r.deleted_at IS NULL
                        ) AS approved_registrations,

                        (
                            SELECT COUNT(*)
                            FROM registrations r
                            INNER JOIN registrations_status rs
                                ON r.id_registration_status =
                                   rs.id_registration_status
                            WHERE r.id_agent =
                                  a.id_agent
                              AND LOWER(
                                  rs.status_name
                              ) = 'rejected'
                              AND r.deleted_at IS NULL
                        ) AS rejected_registrations

                    FROM agents a

                    LEFT JOIN users u
                        ON a.created_by =
                           u.id_user

                    LEFT JOIN users au
                        ON au.email =
                           a.contact_email
                       AND au.id_role = ?
                       AND au.deleted_at IS NULL

                    WHERE a.deleted_at IS NULL

                    ORDER BY a.id_agent DESC
                    `,
                    [
                        FRONTEND_URL.replace(
                            /\/$/,
                            ""
                        ),
                        AGENT_ROLE_ID,
                    ]
                );

            return res.json({
                success: true,
                message:
                    "Agents retrieved successfully",
                data: rows,
            });
        } catch (error) {
            console.error(
                "GET /agents ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Database error",
            });
        }
    };

// ======================================================
// GET AGENT BY ID
// ======================================================

const getAgentById =
    async (
        req,
        res
    ) => {
        try {
            const { id } =
                req.params;

            const [rows] =
                await pool.query(
                    `
                    SELECT
                        a.id_agent,
                        a.agent_name,
                        a.contact_phone,
                        a.contact_email,
                        a.address,
                        a.public_token,

                        CONCAT(
                            ?,
                            '/customer-registration/',
                            a.public_token
                        ) AS public_url,

                        a.created_by,
                        u.username AS created_by_username,
                        a.created_at,
                        a.updated_at,

                        au.id_user AS agent_user_id,
                        au.username AS login_username,

                        CASE
                            WHEN au.id_user IS NULL
                            THEN 0
                            ELSE 1
                        END AS has_login_account

                    FROM agents a

                    LEFT JOIN users u
                        ON a.created_by =
                           u.id_user

                    LEFT JOIN users au
                        ON au.email =
                           a.contact_email
                       AND au.id_role = ?
                       AND au.deleted_at IS NULL

                    WHERE a.id_agent = ?
                      AND a.deleted_at IS NULL

                    LIMIT 1
                    `,
                    [
                        FRONTEND_URL.replace(
                            /\/$/,
                            ""
                        ),
                        AGENT_ROLE_ID,
                        id,
                    ]
                );

            if (!rows.length) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Agent not found",
                });
            }

            return res.json({
                success: true,
                data: rows[0],
            });
        } catch (error) {
            console.error(
                "GET AGENT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Database error",
            });
        }
    };

// ======================================================
// CREATE AGENT + LOGIN ACCOUNT
// ======================================================

const createAgent =
    async (
        req,
        res
    ) => {
        const connection =
            await pool.getConnection();

        try {
            const {
                agent_name,
                contact_phone,
                contact_email,
                address,
                login_username,
                login_password,
            } = req.body;

            if (
                !agent_name?.trim() ||
                !contact_email?.trim() ||
                !login_username?.trim() ||
                !login_password
            ) {
                connection.release();

                return res.status(400).json({
                    success: false,
                    message:
                        "Agent name, contact email, login username and login password are required",
                });
            }

            if (
                !PASSWORD_REGEX.test(
                    login_password
                )
            ) {
                connection.release();

                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character",
                });
            }

            await connection.beginTransaction();

            const activeStatusId =
                await getActiveStatusId(
                    connection
                );

            // ------------------------------------------
            // CHECK USERNAME / EMAIL
            // ------------------------------------------

            const [
                existingUsers,
            ] =
                await connection.query(
                    `
                    SELECT
                        id_user
                    FROM users
                    WHERE (
                        username = ?
                        OR email = ?
                    )
                    AND deleted_at IS NULL
                    LIMIT 1
                    `,
                    [
                        login_username.trim(),
                        contact_email.trim(),
                    ]
                );

            if (
                existingUsers.length
            ) {
                await connection.rollback();
                connection.release();

                return res.status(409).json({
                    success: false,
                    message:
                        "Login username or email is already in use",
                });
            }

            // ------------------------------------------
            // PUBLIC TOKEN
            // ------------------------------------------

            const publicToken =
                generatePublicToken();

            // ------------------------------------------
            // INSERT AGENT
            // ------------------------------------------

            const [agentResult] =
                await connection.query(
                    `
                    INSERT INTO agents (
                        agent_name,
                        contact_phone,
                        contact_email,
                        address,
                        public_token,
                        created_by
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    [
                        agent_name.trim(),
                        contact_phone?.trim() ||
                            null,
                        contact_email.trim(),
                        address?.trim() ||
                            null,
                        publicToken,
                        req.user?.id_user ||
                            null,
                    ]
                );

            // ------------------------------------------
            // PASSWORD HASH
            // ------------------------------------------

            const passwordHash =
                await bcrypt.hash(
                    login_password,
                    10
                );

            // ------------------------------------------
            // INSERT USER
            // ROLE 3 = AGENT
            // ------------------------------------------

            const [userResult] =
                await connection.query(
                    `
                    INSERT INTO users (
                        username,
                        email,
                        password_hash,
                        fullname,
                        phone_number,
                        id_role,
                        id_status_user
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        login_username.trim(),
                        contact_email.trim(),
                        passwordHash,
                        agent_name.trim(),
                        contact_phone?.trim() ||
                            null,
                        AGENT_ROLE_ID,
                        activeStatusId,
                    ]
                );

            await connection.commit();
            connection.release();

            // ------------------------------------------
            // AUDIT
            // ------------------------------------------

            await createAuditLog({
                req,
                action: "CREATE",
                targetEntity:
                    "agents",
                targetId:
                    agentResult.insertId,
                metadata: {
                    agent_name:
                        agent_name.trim(),
                    login_username:
                        login_username.trim(),
                    agent_user_id:
                        userResult.insertId,
                },
            }).catch(() => {});

            return res.status(201).json({
                success: true,
                message:
                    "Agent and login account created successfully",
                data: {
                    id_agent:
                        agentResult.insertId,

                    public_token:
                        publicToken,

                    public_url:
                        getPublicUrl(
                            publicToken
                        ),

                    login_username:
                        login_username.trim(),
                },
            });
        } catch (error) {
            try {
                await connection.rollback();
            } catch {}

            connection.release();

            console.error(
                "CREATE AGENT ERROR:",
                error
            );

            if (
                error.code ===
                "ER_DUP_ENTRY"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Agent, username or email already exists",
                });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Database error",
            });
        }
    };

// ======================================================
// CREATE LOGIN FOR EXISTING AGENT
// ======================================================

const createAgentAccount =
    async (
        req,
        res
    ) => {
        const connection =
            await pool.getConnection();

        try {
            const { id } =
                req.params;

            const {
                login_username,
                login_password,
            } = req.body;

            if (
                !login_username?.trim() ||
                !login_password
            ) {
                connection.release();

                return res.status(400).json({
                    success: false,
                    message:
                        "Login username and login password are required",
                });
            }

            if (
                !PASSWORD_REGEX.test(
                    login_password
                )
            ) {
                connection.release();

                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character",
                });
            }

            await connection.beginTransaction();

            const agent =
                await getAgentByIdInternal(
                    connection,
                    id
                );

            if (!agent) {
                await connection.rollback();
                connection.release();

                return res.status(404).json({
                    success: false,
                    message:
                        "Agent not found",
                });
            }

            if (!agent.contact_email) {
                await connection.rollback();
                connection.release();

                return res.status(400).json({
                    success: false,
                    message:
                        "This agent needs a contact email before a login account can be created",
                });
            }

            const [
                existingAgentAccount,
            ] =
                await connection.query(
                    `
                    SELECT
                        id_user
                    FROM users
                    WHERE email = ?
                      AND id_role = ?
                      AND deleted_at IS NULL
                    LIMIT 1
                    `,
                    [
                        agent.contact_email,
                        AGENT_ROLE_ID,
                    ]
                );

            if (
                existingAgentAccount.length
            ) {
                await connection.rollback();
                connection.release();

                return res.status(409).json({
                    success: false,
                    message:
                        "This agent already has a login account",
                });
            }

            const [
                existingUsers,
            ] =
                await connection.query(
                    `
                    SELECT
                        id_user
                    FROM users
                    WHERE (
                        username = ?
                        OR email = ?
                    )
                    AND deleted_at IS NULL
                    LIMIT 1
                    `,
                    [
                        login_username.trim(),
                        agent.contact_email,
                    ]
                );

            if (
                existingUsers.length
            ) {
                await connection.rollback();
                connection.release();

                return res.status(409).json({
                    success: false,
                    message:
                        "Login username or email is already in use",
                });
            }

            const activeStatusId =
                await getActiveStatusId(
                    connection
                );

            const passwordHash =
                await bcrypt.hash(
                    login_password,
                    10
                );

            const [result] =
                await connection.query(
                    `
                    INSERT INTO users (
                        username,
                        email,
                        password_hash,
                        fullname,
                        phone_number,
                        id_role,
                        id_status_user
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        login_username.trim(),
                        agent.contact_email,
                        passwordHash,
                        agent.agent_name,
                        agent.contact_phone,
                        AGENT_ROLE_ID,
                        activeStatusId,
                    ]
                );

            await connection.commit();
            connection.release();

            await createAuditLog({
                req,
                action:
                    "CREATE_AGENT_LOGIN",
                targetEntity:
                    "agents",
                targetId: id,
                metadata: {
                    login_username:
                        login_username.trim(),
                    agent_user_id:
                        result.insertId,
                },
            }).catch(() => {});

            return res.status(201).json({
                success: true,
                message:
                    "Agent login account created successfully",
                data: {
                    id_agent:
                        Number(id),
                    login_username:
                        login_username.trim(),
                },
            });
        } catch (error) {
            try {
                await connection.rollback();
            } catch {}

            connection.release();

            console.error(
                "CREATE AGENT ACCOUNT ERROR:",
                error
            );

            if (
                error.code ===
                "ER_DUP_ENTRY"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Username or email already exists",
                });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Database error",
            });
        }
    };

// ======================================================
// UPDATE AGENT
// ======================================================

const updateAgent =
    async (
        req,
        res
    ) => {
        const connection =
            await pool.getConnection();

        try {
            const { id } =
                req.params;

            const {
                agent_name,
                contact_phone,
                contact_email,
                address,
            } = req.body;

            if (!agent_name?.trim()) {
                connection.release();

                return res.status(400).json({
                    success: false,
                    message:
                        "Agent name is required",
                });
            }

            await connection.beginTransaction();

            const currentAgent =
                await getAgentByIdInternal(
                    connection,
                    id
                );

            if (!currentAgent) {
                await connection.rollback();
                connection.release();

                return res.status(404).json({
                    success: false,
                    message:
                        "Agent not found",
                });
            }

            const oldEmail =
                currentAgent.contact_email ||
                null;

            const newEmail =
                contact_email?.trim() ||
                null;

            const [
                linkedUsers,
            ] =
                await connection.query(
                    `
                    SELECT
                        id_user,
                        email
                    FROM users
                    WHERE email = ?
                      AND id_role = ?
                      AND deleted_at IS NULL
                    LIMIT 1
                    `,
                    [
                        oldEmail,
                        AGENT_ROLE_ID,
                    ]
                );

            if (
                linkedUsers.length &&
                !newEmail
            ) {
                await connection.rollback();
                connection.release();

                return res.status(400).json({
                    success: false,
                    message:
                        "Contact email is required while this Agent has a login account",
                });
            }

            if (
                newEmail &&
                oldEmail &&
                newEmail !== oldEmail &&
                linkedUsers.length
            ) {
                const [
                    emailUsers,
                ] =
                    await connection.query(
                        `
                        SELECT
                            id_user
                        FROM users
                        WHERE email = ?
                          AND id_user <> ?
                          AND deleted_at IS NULL
                        LIMIT 1
                        `,
                        [
                            newEmail,
                            linkedUsers[0]
                                .id_user,
                        ]
                    );

                if (
                    emailUsers.length
                ) {
                    await connection.rollback();
                    connection.release();

                    return res.status(409).json({
                        success: false,
                        message:
                            "The new contact email is already used by another user",
                    });
                }
            }

            await connection.query(
                `
                UPDATE agents
                SET
                    agent_name = ?,
                    contact_phone = ?,
                    contact_email = ?,
                    address = ?
                WHERE id_agent = ?
                  AND deleted_at IS NULL
                `,
                [
                    agent_name.trim(),
                    contact_phone?.trim() ||
                        null,
                    newEmail,
                    address?.trim() ||
                        null,
                    id,
                ]
            );

            if (
                linkedUsers.length
            ) {
                await connection.query(
                    `
                    UPDATE users
                    SET
                        email = ?,
                        fullname = ?,
                        phone_number = ?
                    WHERE id_user = ?
                      AND deleted_at IS NULL
                    `,
                    [
                        newEmail,
                        agent_name.trim(),
                        contact_phone?.trim() ||
                            null,
                        linkedUsers[0]
                            .id_user,
                    ]
                );
            }

            await connection.commit();
            connection.release();

            await createAuditLog({
                req,
                action: "UPDATE",
                targetEntity:
                    "agents",
                targetId: id,
                metadata: {
                    agent_name:
                        agent_name.trim(),
                },
            }).catch(() => {});

            return res.json({
                success: true,
                message:
                    "Agent updated successfully",
            });
        } catch (error) {
            try {
                await connection.rollback();
            } catch {}

            connection.release();

            console.error(
                "UPDATE AGENT ERROR:",
                error
            );

            if (
                error.code ===
                "ER_DUP_ENTRY"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Username or email already exists",
                });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Database error",
            });
        }
    };

// ======================================================
// REGENERATE PUBLIC LINK
// ======================================================

const regeneratePublicLink =
    async (
        req,
        res
    ) => {
        try {
            const { id } =
                req.params;

            const publicToken =
                generatePublicToken();

            const [result] =
                await pool.query(
                    `
                    UPDATE agents
                    SET public_token = ?
                    WHERE id_agent = ?
                      AND deleted_at IS NULL
                    `,
                    [
                        publicToken,
                        id,
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Agent not found",
                });
            }

            await createAuditLog({
                req,
                action:
                    "REGENERATE_PUBLIC_LINK",
                targetEntity:
                    "agents",
                targetId: id,
            }).catch(() => {});

            return res.json({
                success: true,
                message:
                    "Agent public link regenerated",
                data: {
                    public_token:
                        publicToken,
                    public_url:
                        getPublicUrl(
                            publicToken
                        ),
                },
            });
        } catch (error) {
            console.error(
                "REGENERATE LINK ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Database error",
            });
        }
    };

// ======================================================
// DELETE AGENT
// ======================================================

const deleteAgent =
    async (
        req,
        res
    ) => {
        const connection =
            await pool.getConnection();

        try {
            const { id } =
                req.params;

            await connection.beginTransaction();

            const agent =
                await getAgentByIdInternal(
                    connection,
                    id
                );

            if (!agent) {
                await connection.rollback();
                connection.release();

                return res.status(404).json({
                    success: false,
                    message:
                        "Agent not found",
                });
            }

            await connection.query(
                `
                UPDATE agents
                SET deleted_at = NOW()
                WHERE id_agent = ?
                  AND deleted_at IS NULL
                `,
                [id]
            );

            // Disable linked Agent login.
            if (
                agent.contact_email
            ) {
                const [
                    inactiveRows,
                ] =
                    await connection.query(
                        `
                        SELECT
                            id_status_user
                        FROM status_user
                        WHERE LOWER(status_name) =
                              'inactive'
                        LIMIT 1
                        `
                    );

                if (
                    inactiveRows.length
                ) {
                    await connection.query(
                        `
                        UPDATE users
                        SET
                            id_status_user = ?,
                            locked_until = NULL
                        WHERE email = ?
                          AND id_role = ?
                          AND deleted_at IS NULL
                        `,
                        [
                            Number(
                                inactiveRows[0]
                                    .id_status_user
                            ),
                            agent.contact_email,
                            AGENT_ROLE_ID,
                        ]
                    );
                }
            }

            await connection.commit();
            connection.release();

            await createAuditLog({
                req,
                action: "DELETE",
                targetEntity:
                    "agents",
                targetId: id,
            }).catch(() => {});

            return res.json({
                success: true,
                message:
                    "Agent deleted and login disabled successfully",
            });
        } catch (error) {
            try {
                await connection.rollback();
            } catch {}

            connection.release();

            console.error(
                "DELETE AGENT ERROR:",
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
    getAllAgents,
    getAgentById,
    createAgent,
    createAgentAccount,
    updateAgent,
    regeneratePublicLink,
    deleteAgent,
};