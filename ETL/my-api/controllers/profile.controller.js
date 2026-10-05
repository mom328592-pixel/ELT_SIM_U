const bcrypt = require("bcryptjs");
const pool = require("../db");

const getMyProfile = async (req, res) => {
    try {
        const userId = req.user.id_user;

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
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            message: "Profile retrieved successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("GET /profile ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user.id_user;

        const {
            fullname,
            email,
            phone_number
        } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        await pool.query(
            `
            UPDATE users
            SET
                fullname = ?,
                email = ?,
                phone_number = ?
            WHERE id_user = ?
              AND deleted_at IS NULL
            `,
            [
                fullname || null,
                email,
                phone_number || null,
                userId
            ]
        );

        res.json({
            success: true,
            message: "Profile updated successfully"
        });

    } catch (error) {
        console.error("PUT /profile ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Email already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


const changeMyPassword = async (req, res) => {
    try {
        const userId = req.user.id_user;

        const {
            current_password,
            new_password
        } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message:
                    "Current password and new password are required"
            });
        }

        const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

if (!strongPassword.test(new_password)) {

    return res.status(400).json({
        success: false,
        message:
            "Password must be at least 8 characters and contain uppercase, lowercase, number and special character"
    });
}

        const [rows] = await pool.query(
            `
            SELECT password_hash
            FROM users
            WHERE id_user = ?
              AND deleted_at IS NULL
            `,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const passwordMatch =
            await bcrypt.compare(
                current_password,
                rows[0].password_hash
            );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        const newPasswordHash =
            await bcrypt.hash(new_password, 10);

        await pool.query(
            `
            UPDATE users
            SET password_hash = ?
            WHERE id_user = ?
            `,
            [
                newPasswordHash,
                userId
            ]
        );

        res.json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error(
            "PUT /profile/password ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


module.exports = {
    getMyProfile,
    updateMyProfile,
    changeMyPassword
};