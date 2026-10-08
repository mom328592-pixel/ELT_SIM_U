const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const pool = require("../db");

const {
    getClientIp,
    getDeviceName,
} = require("../utils/device");

const {
    createAuditLog,
} = require("../utils/audit");

// =====================================================
// CREATE ACCESS TOKEN
// =====================================================

const createAccessToken = (
    user
) => {
    return jwt.sign(
        {
            id_user:
                user.id_user,

            username:
                user.username,

            id_role:
                user.id_role,
        },

        process.env.JWT_SECRET,

        {
            expiresIn:
                process.env.JWT_EXPIRES_IN ||
                "15m",
        }
    );
};

// =====================================================
// LOGIN
// =====================================================

const login = async (
    req,
    res
) => {
    try {
        const {
            username,
            password,
        } = req.body;

        if (
            !username ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Username and password are required",
            });
        }

        const [rows] =
            await pool.query(
                `
                SELECT
                    u.id_user,
                    u.username,
                    u.email,
                    u.password_hash,
                    u.fullname,
                    u.phone_number,
                    u.id_role,
                    u.id_status_user,
                    u.failed_login_attempts,
                    u.locked_until,

                    r.role_name,

                    s.status_name

                FROM users u

                LEFT JOIN roles r
                    ON u.id_role =
                       r.id_role

                LEFT JOIN status_user s
                    ON u.id_status_user =
                       s.id_status_user

                WHERE u.username = ?
                  AND u.deleted_at IS NULL

                LIMIT 1
                `,
                [username]
            );

        if (!rows.length) {
            await createAuditLog({
                req,
                action:
                    "LOGIN_FAILED",
                targetEntity:
                    "users",
                targetId:
                    null,
                metadata: {
                    username,
                    reason:
                        "USER_NOT_FOUND",
                },
            }).catch(() => {});

            return res.status(401).json({
                success: false,
                message:
                    "Invalid username or password",
            });
        }

        const user =
            rows[0];

        // ---------------------------------------------
        // ACCOUNT LOCK CHECK
        // ---------------------------------------------

        if (
            user.locked_until &&
            new Date(
                user.locked_until
            ) > new Date()
        ) {
            return res.status(423).json({
                success: false,
                message:
                    "Account temporarily locked. Please try again later.",
            });
        }

        // ---------------------------------------------
        // PASSWORD CHECK
        // ---------------------------------------------

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password_hash
            );

        if (
            !passwordMatch
        ) {
            const attempts =
                Number(
                    user.failed_login_attempts ||
                        0
                ) + 1;

            const maxAttempts =
                Number(
                    process.env
                        .MAX_LOGIN_ATTEMPTS ||
                        5
                );

            const lockoutMinutes =
                Number(
                    process.env
                        .LOCKOUT_MINUTES ||
                        15
                );

            // -----------------------------------------
            // LOCK ACCOUNT
            // -----------------------------------------

            if (
                attempts >=
                maxAttempts
            ) {
                await pool.query(
                    `
                    UPDATE users

                    SET
                        failed_login_attempts = ?,
                        locked_until =
                            DATE_ADD(
                                NOW(),
                                INTERVAL ? MINUTE
                            )

                    WHERE id_user = ?
                    `,
                    [
                        attempts,
                        lockoutMinutes,
                        user.id_user,
                    ]
                );

                await createAuditLog({
                    req,
                    action:
                        "ACCOUNT_LOCKED",
                    targetEntity:
                        "users",
                    targetId:
                        user.id_user,
                    metadata: {
                        username:
                            user.username,

                        attempts,

                        lockout_minutes:
                            lockoutMinutes,
                    },
                });

                return res.status(423).json({
                    success: false,
                    message:
                        "Account temporarily locked after too many failed login attempts",
                });
            }

            // -----------------------------------------
            // SAVE FAILED ATTEMPT
            // -----------------------------------------

            await pool.query(
                `
                UPDATE users

                SET
                    failed_login_attempts = ?

                WHERE id_user = ?
                `,
                [
                    attempts,
                    user.id_user,
                ]
            );

            await createAuditLog({
                req,
                action:
                    "LOGIN_FAILED",
                targetEntity:
                    "users",
                targetId:
                    user.id_user,
                metadata: {
                    username:
                        user.username,
                    attempt:
                        attempts,
                },
            });

            return res.status(401).json({
                success: false,
                message:
                    "Invalid username or password",
            });
        }

        // ---------------------------------------------
        // RESET LOGIN ATTEMPTS
        // ---------------------------------------------

        await pool.query(
            `
            UPDATE users

            SET
                failed_login_attempts = 0,
                locked_until = NULL

            WHERE id_user = ?
            `,
            [user.id_user]
        );

        // ---------------------------------------------
        // ACCOUNT STATUS
        // ---------------------------------------------

        if (
            Number(
                user.id_status_user
            ) !== 1 ||
            String(
                user.status_name || ""
            ).toLowerCase() !==
                "active"
        ) {
            await createAuditLog({
                req,
                action:
                    "LOGIN_FAILED",
                targetEntity:
                    "users",
                targetId:
                    user.id_user,
                metadata: {
                    username:
                        user.username,
                    reason:
                        "INACTIVE_ACCOUNT",
                },
            }).catch(() => {});

            return res.status(403).json({
                success: false,
                message:
                    "User account is inactive",
            });
        }

        // ---------------------------------------------
        // DEVICE INFORMATION
        // ---------------------------------------------

        const ipAddress =
            getClientIp(req);

        const userAgent =
            req.headers[
                "user-agent"
            ] || null;

        const deviceName =
            getDeviceName(
                userAgent
            );

        // ---------------------------------------------
        // CREATE TOKENS
        // ---------------------------------------------

        const accessToken =
            createAccessToken(
                user
            );

        const refreshToken =
            crypto
                .randomBytes(64)
                .toString("hex");

        const refreshTokenHash =
            crypto
                .createHash(
                    "sha256"
                )
                .update(
                    refreshToken
                )
                .digest("hex");

        const expiresDays =
            Number(
                process.env
                    .REFRESH_TOKEN_EXPIRES_DAYS ||
                    7
            );

        // ---------------------------------------------
        // SAVE REFRESH TOKEN
        // ---------------------------------------------

        await pool.query(
            `
            INSERT INTO refresh_tokens (
                id_user,
                token_hash,
                expires_at,
                last_activity_at,
                revoked,
                ip_address,
                user_agent,
                device_name
            )

            VALUES (
                ?,
                ?,
                DATE_ADD(
                    NOW(),
                    INTERVAL ? DAY
                ),
                NOW(),
                0,
                ?,
                ?,
                ?
            )
            `,
            [
                user.id_user,
                refreshTokenHash,
                expiresDays,
                ipAddress,
                userAgent,
                deviceName,
            ]
        );

        // ---------------------------------------------
        // AUDIT LOGIN
        // ---------------------------------------------

        await createAuditLog({
            req,
            action:
                "LOGIN_SUCCESS",
            targetEntity:
                "users",
            targetId:
                user.id_user,
            metadata: {
                username:
                    user.username,
            },
        });

        // ---------------------------------------------
        // RESPONSE
        // ---------------------------------------------

        return res.json({
            success: true,
            message:
                "Login successful",

            data: {
                access_token:
                    accessToken,

                refresh_token:
                    refreshToken,

                token_type:
                    "Bearer",

                expires_in:
                    process.env
                        .JWT_EXPIRES_IN ||
                    "15m",

                user: {
                    id_user:
                        user.id_user,

                    username:
                        user.username,

                    email:
                        user.email,

                    fullname:
                        user.fullname,

                    phone_number:
                        user.phone_number,

                    id_role:
                        user.id_role,

                    role_name:
                        user.role_name,

                    id_status_user:
                        user.id_status_user,

                    status_name:
                        user.status_name,
                },
            },
        });
    } catch (error) {
        console.error(
            "POST /auth/login ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Database error",
        });
    }
};
// =================================================
// AGENT LOGIN DISABLED
// Agents use the public registration link only.
// =================================================

if (
    Number(user.id_role) === 3 ||
    String(user.role_name || "").trim().toLowerCase() === "agent"
) {
    await createAuditLog({
        req,
        action: "LOGIN_BLOCKED_AGENT",
        targetEntity: "users",
        targetId: user.id_user,
        metadata: {
            username: user.username,
            reason: "AGENT_LOGIN_DISABLED",
        },
    }).catch(() => {});

    return res.status(403).json({
        success: false,
        message:
            "Agent accounts do not have backend login. Use the Agent public registration link.",
    });
}
// =====================================================
// REFRESH ACCESS TOKEN
// =====================================================

const refreshAccessToken =
    async (
        req,
        res
    ) => {
        try {
            const {
                refresh_token,
            } = req.body;

            if (
                !refresh_token
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "refresh_token is required",
                });
            }

            const tokenHash =
                crypto
                    .createHash(
                        "sha256"
                    )
                    .update(
                        refresh_token
                    )
                    .digest("hex");

            const [rows] =
                await pool.query(
                    `
                    SELECT
                        rt.id_refresh_token,
                        rt.id_user,
                        rt.expires_at,
                        rt.revoked,

                        u.username,
                        u.id_role,
                        u.deleted_at,

                        s.status_name

                    FROM refresh_tokens rt

                    INNER JOIN users u
                        ON rt.id_user =
                           u.id_user

                    LEFT JOIN status_user s
                        ON u.id_status_user =
                           s.id_status_user

                    WHERE rt.token_hash = ?

                    LIMIT 1
                    `,
                    [tokenHash]
                );

            if (!rows.length) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid refresh token",
                });
            }

            const tokenRecord =
                rows[0];

            if (
                tokenRecord.revoked
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Refresh token has been revoked",
                });
            }

            if (
                new Date(
                    tokenRecord.expires_at
                ) < new Date()
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Refresh token has expired",
                });
            }

            if (
                tokenRecord.deleted_at !==
                null
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        "User account no longer exists",
                });
            }

            if (
                String(
                    tokenRecord.status_name ||
                        ""
                ).toLowerCase() !==
                "active"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "User account is inactive",
                });
            }

            const accessToken =
                createAccessToken({
                    id_user:
                        tokenRecord.id_user,

                    username:
                        tokenRecord.username,

                    id_role:
                        tokenRecord.id_role,
                });

            await pool.query(
                `
                UPDATE refresh_tokens

                SET
                    last_activity_at =
                        NOW()

                WHERE id_refresh_token = ?
                `,
                [
                    tokenRecord.id_refresh_token,
                ]
            );

            return res.json({
                success: true,
                message:
                    "Access token refreshed successfully",

                data: {
                    access_token:
                        accessToken,

                    token_type:
                        "Bearer",

                    expires_in:
                        process.env
                            .JWT_EXPIRES_IN ||
                        "15m",
                },
            });
        } catch (error) {
            console.error(
                "POST /auth/refresh ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Database error",
            });
        }
    };

// =====================================================
// LOGOUT
// =====================================================

const logout = async (
    req,
    res
) => {
    try {
        const {
            refresh_token,
        } = req.body;

        if (
            !refresh_token
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "refresh_token is required",
            });
        }

        const tokenHash =
            crypto
                .createHash(
                    "sha256"
                )
                .update(
                    refresh_token
                )
                .digest("hex");

        const [rows] =
            await pool.query(
                `
                SELECT
                    id_refresh_token,
                    id_user

                FROM refresh_tokens

                WHERE token_hash = ?

                LIMIT 1
                `,
                [tokenHash]
            );

        await pool.query(
            `
            UPDATE refresh_tokens

            SET
                revoked = TRUE

            WHERE token_hash = ?
            `,
            [tokenHash]
        );

        await createAuditLog({
            req,
            action:
                "LOGOUT",
            targetEntity:
                "refresh_tokens",
            targetId:
                rows.length
                    ? rows[0]
                          .id_refresh_token
                    : null,
            metadata: {
                id_user:
                    rows.length
                        ? rows[0]
                              .id_user
                        : req.user
                        ? req.user
                              .id_user
                        : null,
            },
        }).catch(
            () => {}
        );

        return res.json({
            success: true,
            message:
                "Logout successful",
        });
    } catch (error) {
        console.error(
            "POST /auth/logout ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Database error",
        });
    }
};

// =====================================================
// LOGOUT ALL DEVICES
// =====================================================

const logoutAllDevices =
    async (
        req,
        res
    ) => {
        try {
            const userId =
                req.user.id_user;

            const [result] =
                await pool.query(
                    `
                    UPDATE refresh_tokens

                    SET
                        revoked = TRUE

                    WHERE id_user = ?
                    `,
                    [userId]
                );

            await createAuditLog({
                req,
                action:
                    "LOGOUT_ALL",
                targetEntity:
                    "users",
                targetId:
                    userId,
                metadata: {
                    revoked_sessions:
                        result
                            .affectedRows,
                },
            });

            return res.json({
                success: true,
                message:
                    "All sessions have been revoked",
            });
        } catch (error) {
            console.error(
                "POST /auth/logout-all ERROR:",
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
    login,
    refreshAccessToken,
    logout,
    logoutAllDevices,
};