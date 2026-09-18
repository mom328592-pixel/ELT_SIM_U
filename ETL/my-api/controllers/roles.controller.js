const pool = require("../db");
const { createAuditLog } = require("../utils/audit");

// =========================
// GET ALL ROLES
// =========================
const getAllRoles = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM roles ORDER BY id_role ASC"
        );

        res.json({
            success: true,
            message: "Roles retrieved successfully",
            data: rows
        });
    } catch (error) {
        console.error("GET /roles ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// =========================
// GET ROLE BY ID
// =========================
const getRoleById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            "SELECT * FROM roles WHERE id_role = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

        res.json({
            success: true,
            message: "Role retrieved successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("GET /roles/:id ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// =========================
// CREATE ROLE
// =========================
const createRole = async (req, res) => {
    try {
        const { role_name, description } = req.body;

        if (!role_name) {
            return res.status(400).json({
                success: false,
                message: "role_name is required"
            });
        }

        const [result] = await pool.query(
            "INSERT INTO roles (role_name, description) VALUES (?, ?)",
            [role_name, description || null]
        );

        // CREATE AUDIT LOG
        if (createAuditLog) {
            await createAuditLog({
                req,
                action: "CREATE",
                targetEntity: "roles",
                targetId: result.insertId,
                metadata: { role_name, description }
            });
        }

        const [rows] = await pool.query(
            "SELECT * FROM roles WHERE id_role = ?",
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: "Role created successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("POST /roles ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Role name already exists"
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
// UPDATE ROLE
// =========================
const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role_name, description } = req.body;

        if (!role_name) {
            return res.status(400).json({
                success: false,
                message: "role_name is required"
            });
        }

        const [result] = await pool.query(
            `UPDATE roles
             SET role_name = ?, description = ?
             WHERE id_role = ?`,
            [role_name, description || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

        // CREATE AUDIT LOG
        if (createAuditLog) {
            await createAuditLog({
                req,
                action: "UPDATE",
                targetEntity: "roles",
                targetId: id,
                metadata: { role_name, description }
            });
        }

        const [rows] = await pool.query(
            "SELECT * FROM roles WHERE id_role = ?",
            [id]
        );

        res.json({
            success: true,
            message: "Role updated successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("PUT /roles/:id ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Role name already exists"
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
// DELETE ROLE
// =========================
const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "DELETE FROM roles WHERE id_role = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

        // CREATE AUDIT LOG
        if (createAuditLog) {
            await createAuditLog({
                req,
                action: "DELETE",
                targetEntity: "roles",
                targetId: id
            });
        }

        res.json({
            success: true,
            message: "Role deleted successfully"
        });
    } catch (error) {
        console.error("DELETE /roles/:id ERROR:", error);

        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                success: false,
                message: "Cannot delete role because it is currently assigned to users"
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
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
};