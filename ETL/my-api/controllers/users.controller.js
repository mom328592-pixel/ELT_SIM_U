const pool = require("../db");
const bcrypt = require("bcryptjs");
const { createAuditLog } = require("../utils/audit");

const PASSWORD_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;


// =====================================================
// GET ALL USERS
// =====================================================

const getAllUsers = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                u.id_user,
                u.username,
                u.email,
                u.fullname,
                u.phone_number,
                u.id_role,
                r.role_name,
                u.id_status_user,
                s.status_name,
                u.failed_login_attempts,
                u.locked_until,
                u.created_at,
                u.updated_at
            FROM users u
            LEFT JOIN roles r
                ON u.id_role = r.id_role
            LEFT JOIN status_user s
                ON u.id_status_user = s.id_status_user
            WHERE u.deleted_at IS NULL
            ORDER BY u.id_user DESC
        `);

        return res.json({
            success: true,
            message: "Users retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error("GET /users ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// GET USER BY ID
// =====================================================

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            `
            SELECT
                u.id_user,
                u.username,
                u.email,
                u.fullname,
                u.phone_number,
                u.id_role,
                r.role_name,
                u.id_status_user,
                s.status_name,
                u.created_at,
                u.updated_at
            FROM users u
            LEFT JOIN roles r
                ON u.id_role = r.id_role
            LEFT JOIN status_user s
                ON u.id_status_user = s.id_status_user
            WHERE u.id_user = ?
              AND u.deleted_at IS NULL
            `,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.json({
            success: true,
            message: "User retrieved successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("GET /users/:id ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// CREATE USER
// =====================================================

const createUser = async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            fullname,
            phone_number,
            id_role,
            id_status_user
        } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "username, email and password are required"
            });
        }

        if (!PASSWORD_REGEX.test(password)) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character"
            });
        }

        const password_hash =
            await bcrypt.hash(password, 10);

        const [result] = await pool.query(
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
                username.trim(),
                email.trim(),
                password_hash,
                fullname?.trim() || null,
                phone_number?.trim() || null,
                id_role || null,
                id_status_user || null
            ]
        );

        await createAuditLog({
            req,
            action: "CREATE",
            targetEntity: "users",
            targetId: result.insertId,
            metadata: {
                username: username.trim(),
                email: email.trim(),
                id_role,
                id_status_user
            }
        });

        const [rows] = await pool.query(
            `
            SELECT
                u.id_user,
                u.username,
                u.email,
                u.fullname,
                u.phone_number,
                u.id_role,
                r.role_name,
                u.id_status_user,
                s.status_name,
                u.created_at,
                u.updated_at
            FROM users u
            LEFT JOIN roles r
                ON u.id_role = r.id_role
            LEFT JOIN status_user s
                ON u.id_status_user = s.id_status_user
            WHERE u.id_user = ?
            `,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("POST /users ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Username or email already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// UPDATE USER
// =====================================================

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            username,
            email,
            password,
            fullname,
            phone_number,
            id_role,
            id_status_user
        } = req.body;

        if (!username || !email) {
            return res.status(400).json({
                success: false,
                message:
                    "username and email are required"
            });
        }

        if (password && password.trim()) {
            if (!PASSWORD_REGEX.test(password)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character"
                });
            }

            const password_hash =
                await bcrypt.hash(password, 10);

            await pool.query(
                `
                UPDATE users
                SET
                    username = ?,
                    email = ?,
                    password_hash = ?,
                    fullname = ?,
                    phone_number = ?,
                    id_role = ?,
                    id_status_user = ?
                WHERE id_user = ?
                  AND deleted_at IS NULL
                `,
                [
                    username.trim(),
                    email.trim(),
                    password_hash,
                    fullname?.trim() || null,
                    phone_number?.trim() || null,
                    id_role || null,
                    id_status_user || null,
                    id
                ]
            );

        } else {
            await pool.query(
                `
                UPDATE users
                SET
                    username = ?,
                    email = ?,
                    fullname = ?,
                    phone_number = ?,
                    id_role = ?,
                    id_status_user = ?
                WHERE id_user = ?
                  AND deleted_at IS NULL
                `,
                [
                    username.trim(),
                    email.trim(),
                    fullname?.trim() || null,
                    phone_number?.trim() || null,
                    id_role || null,
                    id_status_user || null,
                    id
                ]
            );
        }

        await createAuditLog({
            req,
            action: "UPDATE",
            targetEntity: "users",
            targetId: id,
            metadata: {
                username: username.trim(),
                email: email.trim(),
                id_role,
                id_status_user
            }
        });

        const [rows] = await pool.query(
            `
            SELECT
                u.id_user,
                u.username,
                u.email,
                u.fullname,
                u.phone_number,
                u.id_role,
                r.role_name,
                u.id_status_user,
                s.status_name,
                u.created_at,
                u.updated_at
            FROM users u
            LEFT JOIN roles r
                ON u.id_role = r.id_role
            LEFT JOIN status_user s
                ON u.id_status_user = s.id_status_user
            WHERE u.id_user = ?
            `,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.json({
            success: true,
            message: "User updated successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("PUT /users/:id ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Username or email already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// DELETE USER
// =====================================================

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            `
            UPDATE users
            SET deleted_at = NOW()
            WHERE id_user = ?
              AND deleted_at IS NULL
            `,
            [id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        await createAuditLog({
            req,
            action: "DELETE",
            targetEntity: "users",
            targetId: id
        });

        return res.json({
            success: true,
            message: "User deleted successfully"
        });

    } catch (error) {
        console.error("DELETE /users/:id ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// UNLOCK USER
// =====================================================

const unlockUser = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            `
            UPDATE users
            SET
                failed_login_attempts = 0,
                locked_until = NULL
            WHERE id_user = ?
              AND deleted_at IS NULL
            `,
            [id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        await createAuditLog({
            req,
            action: "ACCOUNT_UNLOCKED",
            targetEntity: "users",
            targetId: id
        });

        return res.json({
            success: true,
            message: "User account unlocked successfully"
        });

    } catch (error) {
        console.error("UNLOCK USER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    unlockUser
};