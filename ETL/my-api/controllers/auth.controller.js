const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db");
const { getClientIp, getDeviceName } = require("../utils/device");
const { createAuditLog } = require("../utils/audit");

// =========================
// HELPER: CREATE ACCESS TOKEN
// =========================
const createAccessToken = (user) => {
    return jwt.sign(
        {
            id_user: user.id_user,
            username: user.username,
            id_role: user.id_role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "15m"
        }
    );
};

// =========================
// LOGIN
// =========================
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const [rows] = await pool.query(
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
                ON u.id_role = r.id_role
            LEFT JOIN status_user s
                ON u.id_status_user = s.id_status_user
            WHERE u.username = ?
              AND u.deleted_at IS NULL
            `,
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        const user = rows[0];

        // Check if account is locked
        if (
            user.locked_until &&
            new Date(user.locked_until) > new Date()
        ) {
            return res.status(423).json({
                success: false,
                message: "Account temporarily locked. Please try again later."
            });
        }

        // Check password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            const attempts = Number(user.failed_login_attempts || 0) + 1;
            const maxAttempts = Number(process.env.MAX_LOGIN_ATTEMPTS || 5);
            const lockoutMinutes = Number(process.env.LOCKOUT_MINUTES || 15);

            if (attempts >= maxAttempts) {
                await pool.query(
                    `
                    UPDATE users
                    SET
                        failed_login_attempts = ?,
                        locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE)
                    WHERE id_user = ?
                    `,
                    [attempts, lockoutMinutes, user.id_user]
                );

                // Audit Log: Account Locked
                await createAuditLog({
                    req,
                    action: "ACCOUNT_LOCKED",
                    targetEntity: "users",
                    targetId: user.id_user,
                    metadata: {
                        username: user.username,
                        attempts,
                        lockout_minutes: lockoutMinutes
                    }
                });

                return res.status(423).json({
                    success: false,
                    message: "Account temporarily locked after too many failed login attempts"
                });
            }

            await pool.query(
                `
                UPDATE users
                SET failed_login_attempts = ?
                WHERE id_user = ?
                `,
                [attempts, user.id_user]
            );

            // Audit Log: Login Failed
            await createAuditLog({
                req,
                action: "LOGIN_FAILED",
                targetEntity: "users",
                targetId: user.id_user,
                metadata: {
                    username: user.username,
                    attempt: attempts
                }
            });

            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        // Reset failed attempts on successful password check
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

        // Check account status
        if (Number(user.id_status_user) !== 1 || user.status_name !== "Active") {
            return res.status(403).json({
                success: false,
                message: "User account is inactive"
            });
        }

        // 1. Extract device info
        const ipAddress = getClientIp(req);
        const userAgent = req.headers["user-agent"] || null;
        const deviceName = getDeviceName(userAgent);

        // 2. Create access token & refresh token
        const accessToken = createAccessToken(user);
        const refreshToken = crypto.randomBytes(64).toString("hex");

        // 3. Hash refresh token before storing in database
        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const expiresDays = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7);

        // 4. Save single refresh token entry to database
        await pool.query(`
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
                DATE_ADD(NOW(), INTERVAL ? DAY),
                NOW(),
                0,
                ?,
                ?,
                ?
            )
        `, [
            user.id_user,
            refreshTokenHash,
            expiresDays,
            ipAddress,
            userAgent,
            deviceName
        ]);

        // Audit Log: Login Success
        await createAuditLog({
            req,
            action: "LOGIN_SUCCESS",
            targetEntity: "users",
            targetId: user.id_user,
            metadata: {
                username: user.username
            }
        });

        res.json({
            success: true,
            message: "Login successful",
            data: {
                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: "Bearer",
                expires_in: process.env.JWT_EXPIRES_IN || "15m",
                user: {
                    id_user: user.id_user,
                    username: user.username,
                    email: user.email,
                    fullname: user.fullname,
                    phone_number: user.phone_number,
                    id_role: user.id_role,
                    role_name: user.role_name,
                    id_status_user: user.id_status_user,
                    status_name: user.status_name
                }
            }
        });

    } catch (error) {
        console.error("POST /auth/login ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// =========================
// REFRESH ACCESS TOKEN
// =========================
const refreshAccessToken = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                message: "refresh_token is required"
            });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(refresh_token)
            .digest("hex");

        const [rows] = await pool.query(`
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
                ON rt.id_user = u.id_user
            LEFT JOIN status_user s
                ON u.id_status_user = s.id_status_user
            WHERE rt.token_hash = ?
            LIMIT 1
        `, [tokenHash]);

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token"
            });
        }

        const tokenRecord = rows[0];

        if (tokenRecord.revoked) {
            return res.status(401).json({
                success: false,
                message: "Refresh token has been revoked"
            });
        }

        if (new Date(tokenRecord.expires_at) < new Date()) {
            return res.status(401).json({
                success: false,
                message: "Refresh token has expired"
            });
        }

        if (tokenRecord.deleted_at !== null) {
            return res.status(401).json({
                success: false,
                message: "User account no longer exists"
            });
        }

        if (tokenRecord.status_name !== "Active") {
            return res.status(403).json({
                success: false,
                message: "User account is inactive"
            });
        }

        const accessToken = createAccessToken({
            id_user: tokenRecord.id_user,
            username: tokenRecord.username,
            id_role: tokenRecord.id_role
        });

        await pool.query(`
            UPDATE refresh_tokens
            SET last_activity_at = NOW()
            WHERE id_refresh_token = ?
        `, [tokenRecord.id_refresh_token]);

        res.json({
            success: true,
            message: "Access token refreshed successfully",
            data: {
                access_token: accessToken,
                token_type: "Bearer",
                expires_in: process.env.JWT_EXPIRES_IN || "15m"
            }
        });

    } catch (error) {
        console.error("POST /auth/refresh ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// =========================
// LOGOUT (SINGLE SESSION)
// =========================
const logout = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                message: "refresh_token is required"
            });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(refresh_token)
            .digest("hex");

        await pool.query(`
            UPDATE refresh_tokens
            SET revoked = TRUE
            WHERE token_hash = ?
        `, [tokenHash]);

        res.json({
            success: true,
            message: "Logout successful"
        });
    } catch (error) {
        console.error("POST /auth/logout ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// =========================
// LOGOUT ALL DEVICES
// =========================
const logoutAllDevices = async (req, res) => {
    try {
        const userId = req.user.id_user;

        await pool.query(`
            UPDATE refresh_tokens
            SET revoked = TRUE
            WHERE id_user = ?
        `, [userId]);

        res.json({
            success: true,
            message: "All sessions have been revoked"
        });
    } catch (error) {
        console.error("POST /auth/logout-all ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// =========================
// MODULE EXPORTS
// =========================
module.exports = {
    login,
    refreshAccessToken,
    logout,
    logoutAllDevices
};