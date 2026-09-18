const pool = require("../db");

// =========================
// GET ALL
// =========================
const getAllRegistrationStatuses = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                id_registration_status,
                status_name,
                description,
                created_at
            FROM registrations_status
            ORDER BY id_registration_status ASC
        `);

        res.json({
            success: true,
            message: "Registration statuses retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error(
            "GET /registration-status ERROR:",
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
const createRegistrationStatus = async (req, res) => {
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
            INSERT INTO registrations_status (
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
            message: "Registration status created successfully",
            data: {
                id_registration_status:
                    result.insertId
            }
        });

    } catch (error) {
        console.error(
            "POST /registration-status ERROR:",
            error
        );

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Registration status already exists"
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
const updateRegistrationStatus = async (req, res) => {
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
            UPDATE registrations_status
            SET
                status_name = ?,
                description = ?
            WHERE id_registration_status = ?
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
                message: "Registration status not found"
            });
        }

        res.json({
            success: true,
            message: "Registration status updated successfully"
        });

    } catch (error) {
        console.error(
            "PUT /registration-status/:id ERROR:",
            error
        );

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Registration status already exists"
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
const deleteRegistrationStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            `
            DELETE FROM registrations_status
            WHERE id_registration_status = ?
            `,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Registration status not found"
            });
        }

        res.json({
            success: true,
            message: "Registration status deleted successfully"
        });

    } catch (error) {
        console.error(
            "DELETE /registration-status/:id ERROR:",
            error
        );

        if (
            error.code === "ER_ROW_IS_REFERENCED_2" ||
            error.code === "ER_ROW_IS_REFERENCED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Cannot delete status because it is being used by registrations"
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
    getAllRegistrationStatuses,
    createRegistrationStatus,
    updateRegistrationStatus,
    deleteRegistrationStatus
};