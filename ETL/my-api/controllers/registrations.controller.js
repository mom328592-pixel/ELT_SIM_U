const pool = require("../db");
const { createAuditLog } = require("../utils/audit");
const {
    createNotification,
    createNotificationsForUsers
} = require("./notifications.controller");

// Helper function to fetch active admin IDs
const getAdminUserIds = async (connection) => {
    const [rows] = await connection.query(`
        SELECT id_user
        FROM users
        WHERE id_role = 1
          AND id_status_user = 1
          AND deleted_at IS NULL
    `);
    return rows.map((row) => row.id_user);
};

// 1. GET ALL REGISTRATIONS
const getAllRegistrations = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                r.id_registration,
                r.id_registration_status,
                rs.status_name AS registration_status,
                r.id_customer,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                c.passport_number,
                r.id_sim,
                s.phone_number,
                s.iccid,
                s.imsi,
                r.id_agent,
                a.agent_name,
                r.id_package,
                p.package_name,
                p.price AS package_price,
                r.registered_at,
                r.reviewed_by,
                u.username AS reviewed_by_username,
                r.reviewed_at,
                r.notes,
                r.created_at,
                r.updated_at
            FROM registrations r
            LEFT JOIN registrations_status rs ON r.id_registration_status = rs.id_registration_status
            LEFT JOIN customers c ON r.id_customer = c.id_customer
            LEFT JOIN sim_cards s ON r.id_sim = s.id_sim
            LEFT JOIN agents a ON r.id_agent = a.id_agent
            LEFT JOIN packages p ON r.id_package = p.id_package
            LEFT JOIN users u ON r.reviewed_by = u.id_user
            WHERE r.deleted_at IS NULL
            ORDER BY r.created_at DESC
        `);

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error("GET ALL REGISTRATIONS ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// GET AVAILABLE SIMS
const getAvailableSims = async (req, res) => {
    try {
        const id_sim_type = req.query.id_sim_type || req.query.sim_type_id;

        if (!id_sim_type) {
            return res.status(400).json({
                success: false,
                message: "SIM type is required"
            });
        }

        const [rows] = await pool.query(`
            SELECT 
                s.id_sim,
                s.phone_number,
                s.iccid,
                s.imsi,
                s.id_package,
                p.package_name,
                p.price
            FROM sim_cards s
            JOIN sim_status ss ON s.id_sim_status = ss.id_sim_status
            LEFT JOIN packages p ON s.id_package = p.id_package
            WHERE s.id_sim_type = ? 
              AND LOWER(ss.sim_status) = 'available'
              AND s.deleted_at IS NULL
        `, [id_sim_type]);

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error("GET AVAILABLE SIMS ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// 2. GET REGISTRATION BY ID
const getRegistrationById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(`
            SELECT 
                r.id_registration,
                r.id_registration_status,
                rs.status_name AS registration_status,
                r.id_customer,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                c.passport_number,
                r.id_sim,
                s.phone_number,
                s.iccid,
                s.imsi,
                r.id_agent,
                a.agent_name,
                r.id_package,
                p.package_name,
                p.price AS package_price,
                r.registered_at,
                r.reviewed_by,
                u.username AS reviewed_by_username,
                r.reviewed_at,
                r.notes,
                r.created_at,
                r.updated_at
            FROM registrations r
            LEFT JOIN registrations_status rs ON r.id_registration_status = rs.id_registration_status
            LEFT JOIN customers c ON r.id_customer = c.id_customer
            LEFT JOIN sim_cards s ON r.id_sim = s.id_sim
            LEFT JOIN agents a ON r.id_agent = a.id_agent
            LEFT JOIN packages p ON r.id_package = p.id_package
            LEFT JOIN users u ON r.reviewed_by = u.id_user
            WHERE r.id_registration = ? AND r.deleted_at IS NULL
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Registration not found"
            });
        }

        res.json({
            success: true,
            message: "Registration retrieved successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("GET REGISTRATION BY ID ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// 3. CREATE REGISTRATION
const createRegistration = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const {
            id_registration_status = 1,
            id_customer,
            id_sim,
            id_agent,
            id_package,
            registered_at,
            reviewed_by,
            reviewed_at,
            notes
        } = req.body;

        if (!id_customer || !id_sim || !id_agent) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: "id_customer, id_sim and id_agent are required"
            });
        }

        await connection.beginTransaction();

        const [simRows] = await connection.query(`
            SELECT
                s.id_sim,
                s.iccid,
                s.id_package,
                s.id_sim_type,
                ss.sim_status,
                p.package_name,
                p.price,
                p.duration_days
            FROM sim_cards s
            JOIN sim_status ss ON s.id_sim_status = ss.id_sim_status
            LEFT JOIN packages p ON s.id_package = p.id_package
            WHERE s.id_sim = ? AND s.deleted_at IS NULL
            FOR UPDATE
        `, [id_sim]);

        if (simRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: "SIM card not found"
            });
        }

        if (simRows[0].sim_status.toLowerCase() !== 'available') {
            await connection.rollback();
            connection.release();
            return res.status(409).json({
                success: false,
                message: `SIM is not available. Current status: ${simRows[0].sim_status}`
            });
        }

        if (id_package) {
            const [pkg] = await connection.query(
                `SELECT id_package FROM packages WHERE id_package = ? AND is_active = 1 AND deleted_at IS NULL`,
                [id_package]
            );
            if (!pkg.length) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ success: false, message: 'Package not found or inactive' });
            }
        }

        const [result] = await connection.query(`
            INSERT INTO registrations (
                id_registration_status,
                id_customer,
                id_sim,
                id_agent,
                id_package,
                registered_at,
                reviewed_by,
                reviewed_at,
                notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id_registration_status,
            id_customer,
            id_sim,
            id_agent,
            id_package || null,
            registered_at || new Date(),
            reviewed_by || null,
            reviewed_at || null,
            notes || null
        ]);

        const newId = result.insertId;

        const [reservedStatus] = await connection.query(
            `SELECT id_sim_status FROM sim_status WHERE LOWER(sim_status) = 'reserved' LIMIT 1`
        );
        if (reservedStatus.length) {
            await connection.query(
                `UPDATE sim_cards SET id_sim_status = ? WHERE id_sim = ?`,
                [reservedStatus[0].id_sim_status, id_sim]
            );
        }

        const adminUserIds = await getAdminUserIds(connection);

        const [rows] = await connection.query(`
            SELECT 
                r.id_registration,
                r.id_registration_status,
                rs.status_name AS registration_status,
                r.id_customer,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                c.passport_number,
                r.id_sim,
                s.phone_number,
                s.iccid,
                s.imsi,
                r.id_agent,
                a.agent_name,
                r.id_package,
                p.package_name,
                p.price AS package_price,
                r.registered_at,
                r.reviewed_by,
                u.username AS reviewed_by_username,
                r.reviewed_at,
                r.notes,
                r.created_at,
                r.updated_at
            FROM registrations r
            LEFT JOIN registrations_status rs ON r.id_registration_status = rs.id_registration_status
            LEFT JOIN customers c ON r.id_customer = c.id_customer
            LEFT JOIN sim_cards s ON r.id_sim = s.id_sim
            LEFT JOIN agents a ON r.id_agent = a.id_agent
            LEFT JOIN packages p ON r.id_package = p.id_package
            LEFT JOIN users u ON r.reviewed_by = u.id_user
            WHERE r.id_registration = ?
        `, [newId]);

        await connection.commit();
        connection.release();

        // Non-blocking side-effects after successful commit
        await createAuditLog({
            req,
            action: "CREATE",
            targetEntity: "registrations",
            targetId: newId,
            metadata: { id_customer, id_sim, id_agent, id_registration_status }
        }).catch(err => console.error("Audit Log Error:", err));

        if (adminUserIds.length > 0) {
            await createNotificationsForUsers({
                userIds: adminUserIds,
                title: "New Registration",
                message: `Registration #${newId} is waiting for review.`,
                type: "registration"
            }).catch(err => console.error("Notification Error:", err));
        }

        res.status(201).json({
            success: true,
            message: "Registration created successfully",
            data: rows[0]
        });
    } catch (error) {
        try { await connection.rollback(); } catch (rollbackError) {}
        connection.release();

        console.error("CREATE REGISTRATION ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// 4. UPDATE REGISTRATION
const updateRegistration = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;
        const {
            id_registration_status,
            id_customer,
            id_sim,
            id_agent,
            reviewed_by,
            notes
        } = req.body;

        if (!id_registration_status || !id_customer || !id_sim || !id_agent) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: "id_registration_status, id_customer, id_sim and id_agent are required"
            });
        }

        const statusId = Number(id_registration_status);

        if ([2, 3].includes(statusId) && Number(req.user?.id_role) !== 1) {
            connection.release();
            return res.status(403).json({ success: false, message: "Only Admin can approve or reject registrations" });
        }

        await connection.beginTransaction();

        const [registrationRows] = await connection.query(
            `SELECT id_registration, id_agent FROM registrations WHERE id_registration = ? AND deleted_at IS NULL FOR UPDATE`,
            [id]
        );

        if (registrationRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: "Registration not found"
            });
        }

        await connection.query(`
            UPDATE registrations
            SET
                id_registration_status = ?,
                id_customer = ?,
                id_sim = ?,
                id_agent = ?,
                reviewed_by = ?,
                reviewed_at = CASE
                    WHEN ? IN (2, 3) THEN NOW()
                    ELSE reviewed_at
                END,
                notes = ?
            WHERE id_registration = ?
        `, [
            id_registration_status,
            id_customer,
            id_sim,
            id_agent,
            reviewed_by || null,
            statusId,
            notes || null,
            id
        ]);

        let auditAction = "UPDATE";

        if (statusId === 2) {
            await connection.query(
                `UPDATE sim_cards SET id_sim_status = 2, updated_at = NOW() WHERE id_sim = ?`,
                [id_sim]
            );
            auditAction = "APPROVE";
        } else if (statusId === 3) {
            await connection.query(
                `UPDATE sim_cards SET id_sim_status = 1, updated_at = NOW() WHERE id_sim = ?`,
                [id_sim]
            );
            auditAction = "REJECT";
        }

        const adminUserIds = await getAdminUserIds(connection);

        const [rows] = await connection.query(`
            SELECT 
                r.id_registration,
                r.id_registration_status,
                rs.status_name AS registration_status,
                r.id_customer,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                c.passport_number,
                r.id_sim,
                s.phone_number,
                s.iccid,
                s.imsi,
                r.id_agent,
                a.agent_name,
                r.id_package,
                p.package_name,
                p.price AS package_price,
                r.registered_at,
                r.reviewed_by,
                u.username AS reviewed_by_username,
                r.reviewed_at,
                r.notes,
                r.created_at,
                r.updated_at
            FROM registrations r
            LEFT JOIN registrations_status rs ON r.id_registration_status = rs.id_registration_status
            LEFT JOIN customers c ON r.id_customer = c.id_customer
            LEFT JOIN sim_cards s ON r.id_sim = s.id_sim
            LEFT JOIN agents a ON r.id_agent = a.id_agent
            LEFT JOIN packages p ON r.id_package = p.id_package
            LEFT JOIN users u ON r.reviewed_by = u.id_user
            WHERE r.id_registration = ?
        `, [id]);

        await connection.commit();
        connection.release();

        // Non-blocking notifications & audit logs
        createAuditLog({
            req,
            action: auditAction,
            targetEntity: "registrations",
            targetId: id,
            metadata: { id_customer, id_sim, id_agent, id_registration_status: statusId }
        }).catch(err => console.error("Audit log failed:", err));

        if (statusId === 2 && id_agent) {
            createNotification({
                idUser: id_agent,
                title: "Registration Approved",
                message: `Registration #${id} has been approved.`,
                type: "success"
            }).catch(err => console.error(err));

            if (adminUserIds.length > 0) {
                createNotificationsForUsers({
                    userIds: adminUserIds,
                    title: "Registration Approved",
                    message: `Registration #${id} has been approved.`,
                    type: "success"
                }).catch(err => console.error(err));
            }
        } else if (statusId === 3 && id_agent) {
            createNotification({
                idUser: id_agent,
                title: "Registration Rejected",
                message: `Registration #${id} has been rejected.`,
                type: "error"
            }).catch(err => console.error(err));
        }

        res.json({
            success: true,
            message: statusId === 2
                ? "Registration approved successfully"
                : statusId === 3
                ? "Registration rejected successfully"
                : "Registration updated successfully",
            data: rows[0]
        });

    } catch (error) {
        try { await connection.rollback(); } catch (rollbackError) {}
        connection.release();

        console.error("UPDATE REGISTRATION ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// 5. DELETE REGISTRATION
const deleteRegistration = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            `UPDATE registrations SET deleted_at = NOW() WHERE id_registration = ? AND deleted_at IS NULL`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Registration not found"
            });
        }

        await createAuditLog({
            req,
            action: "DELETE",
            targetEntity: "registrations",
            targetId: id
        });

        res.json({
            success: true,
            message: "Registration deleted successfully"
        });
    } catch (error) {
        console.error("DELETE REGISTRATION ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

const reviewRegistration = async (req, res, approved) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const note = req.body?.notes || null;
        await connection.beginTransaction();

        const [rows] = await connection.query(`
            SELECT r.id_registration, r.id_sim, r.id_registration_status, s.id_sim_status 
            FROM registrations r 
            JOIN sim_cards s ON r.id_sim = s.id_sim 
            WHERE r.id_registration = ? AND r.deleted_at IS NULL 
            FOR UPDATE
        `, [id]);

        if (!rows.length) { 
            await connection.rollback(); 
            connection.release(); 
            return res.status(404).json({ success: false, message: 'Registration not found' }); 
        }

        const targetStatus = approved ? 2 : 3;
        if (Number(rows[0].id_registration_status) !== 1) { 
            await connection.rollback(); 
            connection.release(); 
            return res.status(409).json({ success: false, message: 'Only Pending registrations can be reviewed' }); 
        }

        const simStatus = approved ? 2 : 1;
        await connection.query(`
            UPDATE registrations 
            SET id_registration_status = ?, reviewed_by = ?, reviewed_at = NOW(), notes = COALESCE(?, notes), updated_at = NOW() 
            WHERE id_registration = ?
        `, [targetStatus, req.user.id_user, note, id]);

        await connection.query(`
            UPDATE sim_cards 
            SET id_sim_status = ?, updated_at = NOW() 
            WHERE id_sim = ?
        `, [simStatus, rows[0].id_sim]);

        await connection.commit(); 
        connection.release();

        createAuditLog({
            req,
            action: approved ? 'APPROVE' : 'REJECT',
            targetEntity: 'registrations',
            targetId: id,
            metadata: { id_sim: rows[0].id_sim }
        }).catch(e => console.error("Audit Log Error:", e));

        res.json({
            success: true,
            message: approved ? 'Registration approved successfully' : 'Registration rejected successfully'
        });
    } catch (e) { 
        try { await connection.rollback(); } catch {} 
        connection.release(); 
        res.status(500).json({ success: false, message: 'Database error', error: e.message }); 
    }
};

const approveRegistration = (req, res) => reviewRegistration(req, res, true);
const rejectRegistration = (req, res) => reviewRegistration(req, res, false);

module.exports = {
    getAllRegistrations,
    getAvailableSims,
    getRegistrationById,
    createRegistration,
    updateRegistration,
    deleteRegistration,
    approveRegistration,
    rejectRegistration
};