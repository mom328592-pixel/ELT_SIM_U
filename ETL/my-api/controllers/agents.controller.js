const crypto = require("crypto");
const pool = require("../db");

const FRONTEND_URL =
    process.env.FRONTEND_URL || "https://eltsimu.vercel.app";


// ======================================================
// CREATE PUBLIC TOKEN
// ======================================================
const generatePublicToken = () => {
    return crypto.randomBytes(32).toString("hex");
};
const {
    createAuditLog
} = require("../utils/audit");

// ======================================================
// PUBLIC URL
// ======================================================
const getPublicUrl = (token) => {
    return `${FRONTEND_URL.replace(/\/$/, "")}/customer-registration/${token}`;
};


// ======================================================
// GET ALL AGENTS
// ======================================================
const getAllAgents = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                a.id_agent,
                a.agent_name,
                a.contact_phone,
                a.contact_email,
                a.address,
                a.public_token,
                CONCAT(
                    ?,
                    '/customer-registration/',
                    a.public_token
                ) AS public_url,
                a.created_by,
                u.username AS created_by_username,
                a.created_at,
                a.updated_at,
                (
                    SELECT COUNT(*)
                    FROM registrations r
                    WHERE r.id_agent = a.id_agent
                      AND r.deleted_at IS NULL
                ) AS total_registrations,
                (
                    SELECT COUNT(*)
                    FROM registrations r
                    INNER JOIN registrations_status rs
                        ON r.id_registration_status = rs.id_registration_status
                    WHERE r.id_agent = a.id_agent
                      AND LOWER(rs.status_name) = 'pending'
                      AND r.deleted_at IS NULL
                ) AS pending_registrations,
                (
                    SELECT COUNT(*)
                    FROM registrations r
                    INNER JOIN registrations_status rs
                        ON r.id_registration_status = rs.id_registration_status
                    WHERE r.id_agent = a.id_agent
                      AND LOWER(rs.status_name) = 'approved'
                      AND r.deleted_at IS NULL
                ) AS approved_registrations,
                (
                    SELECT COUNT(*)
                    FROM registrations r
                    INNER JOIN registrations_status rs
                        ON r.id_registration_status = rs.id_registration_status
                    WHERE r.id_agent = a.id_agent
                      AND LOWER(rs.status_name) = 'rejected'
                      AND r.deleted_at IS NULL
                ) AS rejected_registrations
            FROM agents a
            LEFT JOIN users u
                ON a.created_by = u.id_user
            WHERE a.deleted_at IS NULL
            ORDER BY a.id_agent DESC
        `, [FRONTEND_URL.replace(/\/$/, "")]);

        res.json({
            success: true,
            message: "Agents retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error("GET /agents ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// ======================================================
// GET AGENT BY ID
// ======================================================
const getAgentById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(`
            SELECT
                a.id_agent,
                a.agent_name,
                a.contact_phone,
                a.contact_email,
                a.address,
                a.public_token,
                CONCAT(
                    ?,
                    '/customer-registration/',
                    a.public_token
                ) AS public_url,
                a.created_by,
                u.username AS created_by_username,
                a.created_at,
                a.updated_at
            FROM agents a
            LEFT JOIN users u
                ON a.created_by = u.id_user
            WHERE a.id_agent = ?
              AND a.deleted_at IS NULL
        `, [
            FRONTEND_URL.replace(/\/$/, ""),
            id
        ]);

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error("GET AGENT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// ======================================================
// CREATE AGENT
// ======================================================
const createAgent = async (req, res) => {
    try {
        const {
            agent_name,
            contact_phone,
            contact_email,
            address
        } = req.body;

        if (!agent_name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Agent name is required"
            });
        }

        const createdBy = req.user.id_user;
        const publicToken = generatePublicToken();

        const [result] = await pool.query(`
            INSERT INTO agents (
                agent_name,
                contact_phone,
                contact_email,
                address,
                public_token,
                created_by
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            agent_name.trim(),
            contact_phone || null,
            contact_email || null,
            address || null,
            publicToken,
            createdBy
        ]);

        res.status(201).json({
            success: true,
            message: "Agent created successfully",
            data: {
                id_agent: result.insertId,
                public_token: publicToken,
                public_url: getPublicUrl(publicToken)
            }
        });

    } catch (error) {
        console.error("CREATE AGENT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};
await createAuditLog({
    req,
    action: "CREATE",
    targetEntity: "agents",
    targetId: result.insertId,
    metadata: {
        agent_name
    }
}).catch(console.error);

// ======================================================
// UPDATE AGENT
// ======================================================
const updateAgent = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            agent_name,
            contact_phone,
            contact_email,
            address
        } = req.body;

        if (!agent_name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Agent name is required"
            });
        }

        const [result] = await pool.query(`
            UPDATE agents
            SET
                agent_name = ?,
                contact_phone = ?,
                contact_email = ?,
                address = ?
            WHERE id_agent = ?
              AND deleted_at IS NULL
        `, [
            agent_name.trim(),
            contact_phone || null,
            contact_email || null,
            address || null,
            id
        ]);

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }

        res.json({
            success: true,
            message: "Agent updated successfully"
        });

    } catch (error) {
        console.error("UPDATE AGENT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};
await createAuditLog({
    req,
    action: "UPDATE",
    targetEntity: "agents",
    targetId: id,
    metadata: {
        agent_name
    }
}).catch(console.error);
await createAuditLog({
    req,
    action: "REGENERATE_PUBLIC_LINK",
    targetEntity: "agents",
    targetId: id
}).catch(console.error);
await createAuditLog({
    req,
    action: "DELETE",
    targetEntity: "agents",
    targetId: id
}).catch(console.error);

// ======================================================
// REGENERATE PUBLIC LINK
// ======================================================
const regeneratePublicLink = async (req, res) => {
    try {
        const { id } = req.params;

        const publicToken = generatePublicToken();

        const [result] = await pool.query(`
            UPDATE agents
            SET public_token = ?
            WHERE id_agent = ?
              AND deleted_at IS NULL
        `, [
            publicToken,
            id
        ]);

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }

        res.json({
            success: true,
            message: "Agent public link regenerated",
            data: {
                public_token: publicToken,
                public_url: getPublicUrl(publicToken)
            }
        });

    } catch (error) {
        console.error("REGENERATE LINK ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// ======================================================
// DELETE AGENT
// ======================================================
const deleteAgent = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(`
            UPDATE agents
            SET deleted_at = NOW()
            WHERE id_agent = ?
              AND deleted_at IS NULL
        `, [id]);

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }

        res.json({
            success: true,
            message: "Agent deleted successfully"
        });

    } catch (error) {
        console.error("DELETE AGENT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


module.exports = {
    getAllAgents,
    getAgentById,
    createAgent,
    updateAgent,
    regeneratePublicLink,
    deleteAgent
};