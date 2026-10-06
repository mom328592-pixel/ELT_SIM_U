const pool = require("../db");
const { createAuditLog } = require("../utils/audit");

// =====================================================
// GET ALL SIM TYPES
// =====================================================

const getAllSimTypes = async (
    req,
    res
) => {
    try {
        const [rows] =
            await pool.query(`
                SELECT
                    id_sim_type,
                    sim_type,
                    description,
                    created_at,
                    updated_at

                FROM sim_types

                ORDER BY
                    id_sim_type ASC
            `);

        return res.json({
            success: true,
            message:
                "SIM types retrieved successfully",
            data: rows,
        });
    } catch (error) {
        console.error(
            "GET /sim-types ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Database error",
        });
    }
};

// =====================================================
// CREATE SIM TYPE
// =====================================================

const createSimType = async (
    req,
    res
) => {
    try {
        const {
            sim_type,
            description,
        } = req.body;

        if (
            !sim_type ||
            !sim_type.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "SIM type is required",
            });
        }

        const cleanedName =
            sim_type.trim();

        const cleanedDescription =
            description
                ? String(
                      description
                  ).trim()
                : null;

        const [result] =
            await pool.query(
                `
                INSERT INTO sim_types (
                    sim_type,
                    description
                )

                VALUES (?, ?)
                `,
                [
                    cleanedName,
                    cleanedDescription,
                ]
            );

        const newId =
            result.insertId;

        await createAuditLog({
            req,
            action: "CREATE",
            targetEntity:
                "sim_types",
            targetId: newId,
            metadata: {
                sim_type:
                    cleanedName,
            },
        });

        return res.status(201).json({
            success: true,
            message:
                "SIM type created successfully",
            data: {
                id_sim_type:
                    newId,
            },
        });
    } catch (error) {
        console.error(
            "POST /sim-types ERROR:",
            error
        );

        if (
            error.code ===
            "ER_DUP_ENTRY"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "SIM type already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Database error",
        });
    }
};

// =====================================================
// UPDATE SIM TYPE
// =====================================================

const updateSimType = async (
    req,
    res
) => {
    try {
        const { id } =
            req.params;

        const {
            sim_type,
            description,
        } = req.body;

        if (
            !sim_type ||
            !sim_type.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "SIM type is required",
            });
        }

        // Find old record first
        const [oldRows] =
            await pool.query(
                `
                SELECT
                    id_sim_type,
                    sim_type

                FROM sim_types

                WHERE id_sim_type = ?

                LIMIT 1
                `,
                [id]
            );

        if (!oldRows.length) {
            return res.status(404).json({
                success: false,
                message:
                    "SIM type not found",
            });
        }

        const cleanedName =
            sim_type.trim();

        const cleanedDescription =
            description
                ? String(
                      description
                  ).trim()
                : null;

        await pool.query(
            `
            UPDATE sim_types

            SET
                sim_type = ?,
                description = ?,
                updated_at = NOW()

            WHERE id_sim_type = ?
            `,
            [
                cleanedName,
                cleanedDescription,
                id,
            ]
        );

        await createAuditLog({
            req,
            action: "UPDATE",
            targetEntity:
                "sim_types",
            targetId: id,
            metadata: {
                old_sim_type:
                    oldRows[0]
                        .sim_type,

                new_sim_type:
                    cleanedName,
            },
        });

        return res.json({
            success: true,
            message:
                "SIM type updated successfully",
        });
    } catch (error) {
        console.error(
            "PUT /sim-types/:id ERROR:",
            error
        );

        if (
            error.code ===
            "ER_DUP_ENTRY"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "SIM type already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Database error",
        });
    }
};

// =====================================================
// DELETE SIM TYPE
// =====================================================

const deleteSimType = async (
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
                    id_sim_type,
                    sim_type

                FROM sim_types

                WHERE id_sim_type = ?

                LIMIT 1
                `,
                [id]
            );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message:
                    "SIM type not found",
            });
        }

        // Check whether SIM cards use it.
        const [simRows] =
            await pool.query(
                `
                SELECT
                    id_sim

                FROM sim_cards

                WHERE id_sim_type = ?
                  AND deleted_at IS NULL

                LIMIT 1
                `,
                [id]
            );

        if (simRows.length) {
            return res.status(409).json({
                success: false,
                message:
                    "Cannot delete SIM type because it is being used by SIM cards",
            });
        }

        await pool.query(
            `
            DELETE FROM sim_types

            WHERE id_sim_type = ?
            `,
            [id]
        );

        await createAuditLog({
            req,
            action: "DELETE",
            targetEntity:
                "sim_types",
            targetId: id,
            metadata: {
                sim_type:
                    rows[0].sim_type,
            },
        });

        return res.json({
            success: true,
            message:
                "SIM type deleted successfully",
        });
    } catch (error) {
        console.error(
            "DELETE /sim-types/:id ERROR:",
            error
        );

        if (
            error.code ===
                "ER_ROW_IS_REFERENCED_2" ||
            error.code ===
                "ER_ROW_IS_REFERENCED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Cannot delete SIM type because it is being used by SIM cards",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Database error",
        });
    }
};

module.exports = {
    getAllSimTypes,
    createSimType,
    updateSimType,
    deleteSimType,
};