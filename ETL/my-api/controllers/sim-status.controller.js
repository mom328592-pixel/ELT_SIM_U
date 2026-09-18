const pool = require("../db");


// =========================
// GET ALL
// =========================
const getAllSimStatuses = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                id_sim_status,
                sim_status,
                description,
                created_at
            FROM sim_status
            ORDER BY id_sim_status ASC
        `);

        res.json({
            success: true,
            message: "SIM statuses retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error(
            "GET /sim-status ERROR:",
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
const createSimStatus = async (req, res) => {
    try {
        const {
            sim_status,
            description
        } = req.body;

        if (!sim_status?.trim()) {
            return res.status(400).json({
                success: false,
                message: "SIM status is required"
            });
        }

        const [result] = await pool.query(
            `
            INSERT INTO sim_status (
                sim_status,
                description
            )
            VALUES (?, ?)
            `,
            [
                sim_status.trim(),
                description || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "SIM status created successfully",
            data: {
                id_sim_status: result.insertId
            }
        });

    } catch (error) {
        console.error(
            "POST /sim-status ERROR:",
            error
        );

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "SIM status already exists"
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
const updateSimStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            sim_status,
            description
        } = req.body;

        if (!sim_status?.trim()) {
            return res.status(400).json({
                success: false,
                message: "SIM status is required"
            });
        }

        const [result] = await pool.query(
            `
            UPDATE sim_status
            SET
                sim_status = ?,
                description = ?
            WHERE id_sim_status = ?
            `,
            [
                sim_status.trim(),
                description || null,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "SIM status not found"
            });
        }

        res.json({
            success: true,
            message: "SIM status updated successfully"
        });

    } catch (error) {
        console.error(
            "PUT /sim-status/:id ERROR:",
            error
        );

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "SIM status already exists"
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
const deleteSimStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            `
            DELETE FROM sim_status
            WHERE id_sim_status = ?
            `,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "SIM status not found"
            });
        }

        res.json({
            success: true,
            message: "SIM status deleted successfully"
        });

    } catch (error) {
        console.error(
            "DELETE /sim-status/:id ERROR:",
            error
        );

        if (
            error.code === "ER_ROW_IS_REFERENCED_2" ||
            error.code === "ER_ROW_IS_REFERENCED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Cannot delete SIM status because it is being used by SIM cards"
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
    getAllSimStatuses,
    createSimStatus,
    updateSimStatus,
    deleteSimStatus
};