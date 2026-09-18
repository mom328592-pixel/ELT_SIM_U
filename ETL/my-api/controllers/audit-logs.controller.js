const pool = require("../db");

const getAllAuditLogs = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                al.id_audit_log,
                al.id_user,
                u.username,
                u.fullname,
                al.action,
                al.target_entity,
                al.target_id,
                al.ip_address,
                al.user_agent,
                al.old_value,
                al.metadata,
                al.created_at
            FROM audit_logs al
            LEFT JOIN users u
                ON al.id_user = u.id_user
            ORDER BY al.created_at DESC
        `);

        res.json({
            success: true,
            message: "Audit logs retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error("GET /audit-logs ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

const getAuditLogById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(`
            SELECT
                al.id_audit_log,
                al.id_user,
                u.username,
                u.fullname,
                al.action,
                al.target_entity,
                al.target_id,
                al.ip_address,
                al.user_agent,
                al.old_value,
                al.metadata,
                al.created_at
            FROM audit_logs al
            LEFT JOIN users u
                ON al.id_user = u.id_user
            WHERE al.id_audit_log = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Audit log not found"
            });
        }

        res.json({
            success: true,
            message: "Audit log retrieved successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("GET /audit-logs/:id ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

module.exports = {
    getAllAuditLogs,
    getAuditLogById
};