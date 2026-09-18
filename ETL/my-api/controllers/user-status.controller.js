const pool = require("../db");

// =========================
// GET ALL
// =========================
const getAllUserStatuses = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                id_status_user,
                status_name,
                description,
                created_at
            FROM status_user
            ORDER BY id_status_user ASC
        `);

        res.json({
            success: true,
            message: "User statuses retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error(
            "GET /user-status ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =========================
// CREATE
// =========================
const createUserStatus = async (req, res) => {
    try {
        const {
            status_name,
            description
        } = req.body;

        if (!status_name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Status name is required"
            });
        }

        const [result] = await pool.query(
            `
            INSERT INTO status_user (
                status_name,
                description
            )
            VALUES (?, ?)
            `,
            [
                status_name.trim(),
                description || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "User status created successfully",
            data: {
                id_status_user: result.insertId
            }
        });

    } catch (error) {
        console.error(
            "POST /user-status ERROR:",
            error
        );

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "User status already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =========================
// UPDATE
// =========================
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            status_name,
            description
        } = req.body;

        if (!status_name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Status name is required"
            });
        }

        const [result] = await pool.query(
            `
            UPDATE status_user
            SET
                status_name = ?,
                description = ?
            WHERE id_status_user = ?
            `,
            [
                status_name.trim(),
                description || null,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "User status not found"
            });
        }

        res.json({
            success: true,
            message: "User status updated successfully"
        });

    } catch (error) {
        console.error(
            "PUT /user-status/:id ERROR:",
            error
        );

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "User status already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =========================
// DELETE
// =========================
const deleteUserStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            `
            DELETE FROM status_user
            WHERE id_status_user = ?
            `,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "User status not found"
            });
        }

        res.json({
            success: true,
            message: "User status deleted successfully"
        });

    } catch (error) {
        console.error(
            "DELETE /user-status/:id ERROR:",
            error
        );

        if (
            error.code === "ER_ROW_IS_REFERENCED_2" ||
            error.code === "ER_ROW_IS_REFERENCED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Cannot delete user status because it is being used by users"
            });
        }

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


module.exports = {
    getAllUserStatuses,
    createUserStatus,
    updateUserStatus,
    deleteUserStatus
};