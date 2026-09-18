const pool = require("../db");

const getAllSimTypes = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                id_sim_type,
                sim_type,
                description,
                created_at
            FROM sim_types
            ORDER BY id_sim_type ASC
        `);

        res.json({
            success: true,
            message: "SIM types retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error("GET /sim-types ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


const createSimType = async (req, res) => {
    try {
        const {
            sim_type,
            description
        } = req.body;

        if (!sim_type?.trim()) {
            return res.status(400).json({
                success: false,
                message: "SIM type is required"
            });
        }

        const [result] = await pool.query(
            `
            INSERT INTO sim_types (
                sim_type,
                description
            )
            VALUES (?, ?)
            `,
            [
                sim_type.trim(),
                description || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "SIM type created successfully",
            data: {
                id_sim_type: result.insertId
            }
        });

    } catch (error) {
        console.error("POST /sim-types ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "SIM type already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


const updateSimType = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            sim_type,
            description
        } = req.body;

        if (!sim_type?.trim()) {
            return res.status(400).json({
                success: false,
                message: "SIM type is required"
            });
        }

        const [result] = await pool.query(
            `
            UPDATE sim_types
            SET
                sim_type = ?,
                description = ?
            WHERE id_sim_type = ?
            `,
            [
                sim_type.trim(),
                description || null,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "SIM type not found"
            });
        }

        res.json({
            success: true,
            message: "SIM type updated successfully"
        });

    } catch (error) {
        console.error("PUT /sim-types/:id ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "SIM type already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


const deleteSimType = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            `
            DELETE FROM sim_types
            WHERE id_sim_type = ?
            `,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "SIM type not found"
            });
        }

        res.json({
            success: true,
            message: "SIM type deleted successfully"
        });

    } catch (error) {
        console.error("DELETE /sim-types/:id ERROR:", error);

        if (
            error.code === "ER_ROW_IS_REFERENCED_2" ||
            error.code === "ER_ROW_IS_REFERENCED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Cannot delete SIM type because it is being used by SIM cards"
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
    getAllSimTypes,
    createSimType,
    updateSimType,
    deleteSimType
};