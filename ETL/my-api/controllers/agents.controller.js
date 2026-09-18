const pool = require("../db");

// =========================
// GET ALL AGENTS
// =========================
const getAllAgents = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                a.id_agent,
                a.agent_name,
                a.contact_phone,
                a.contact_email,
                a.address,
                a.created_by,
                u.username AS created_by_username,
                a.created_at,
                a.updated_at
            FROM agents a
            LEFT JOIN users u
                ON a.created_by = u.id_user
            WHERE a.deleted_at IS NULL
            ORDER BY a.id_agent DESC
        `);

        res.json({
            success: true,
            message: "Agents retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error(
            "GET /agents ERROR:",
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
// GET AGENT BY ID
// =========================
async function getAgentById(req, res) {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(`
            SELECT
                a.id_agent,
                a.agent_name,
                a.contact_phone,
                a.contact_email,
                a.address,
                a.created_by,
                u.username AS created_by_username,
                a.created_at,
                a.updated_at
            FROM agents a
            LEFT JOIN users u
                ON a.created_by = u.id_user
            WHERE a.id_agent = ?
              AND a.deleted_at IS NULL
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }

        res.json({
            success: true,
            message: "Agent retrieved successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("GET /agents/:id ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
}


// =========================
// CREATE AGENT
// =========================
const createAgent = async (req, res) => {
    try {
        const {
            agent_name,
            contact_phone,
            contact_email,
            address
        } = req.body;

        if (!agent_name) {
            return res.status(400).json({
                success: false,
                message: "Agent name is required"
            });
        }

        const createdBy = req.user.id_user;

        const [result] = await pool.query(
            `
            INSERT INTO agents (
                agent_name,
                contact_phone,
                contact_email,
                address,
                created_by
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                agent_name,
                contact_phone || null,
                contact_email || null,
                address || null,
                createdBy
            ]
        );

        res.status(201).json({
            success: true,
            message: "Agent created successfully",
            data: {
                id_agent: result.insertId
            }
        });

    } catch (error) {
        console.error(
            "POST /agents ERROR:",
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
// UPDATE AGENT
// =========================
const updateAgent = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            agent_name,
            contact_phone,
            contact_email,
            address
        } = req.body;

        if (!agent_name) {
            return res.status(400).json({
                success: false,
                message: "agent_name is required"
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
            agent_name,
            contact_phone || null,
            contact_email || null,
            address || null,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }

        const [rows] = await pool.query(`
            SELECT
                a.id_agent,
                a.agent_name,
                a.contact_phone,
                a.contact_email,
                a.address,
                a.created_by,
                u.username AS created_by_username,
                a.created_at,
                a.updated_at
            FROM agents a
            LEFT JOIN users u
                ON a.created_by = u.id_user
            WHERE a.id_agent = ?
        `, [id]);

        res.json({
            success: true,
            message: "Agent updated successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("PUT /agents/:id ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =========================
// DELETE AGENT
// =========================
const deleteAgent = async (req, res) => {
    try {
        const { id } = req.params;

        // Soft delete
        const [result] = await pool.query(`
            UPDATE agents
            SET deleted_at = NOW()
            WHERE id_agent = ?
              AND deleted_at IS NULL
        `, [id]);

        if (result.affectedRows === 0) {
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
        console.error("DELETE /agents/:id ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


module.exports = {
    getAllAgents,
    getAgentById,
    createAgent,
    updateAgent,
    deleteAgent
};