const pool = require("../db");

// ======================================
// GET AGENTS + SIM TYPES
// ======================================
const getRegistrationOptions = async (req, res) => {
    try {
        const [agents] = await pool.query(`
            SELECT
                id_agent,
                agent_name
            FROM agents
            WHERE deleted_at IS NULL
            ORDER BY agent_name ASC
        `);

        const [simTypes] = await pool.query(`SELECT id_sim_type, sim_type, description FROM sim_types ORDER BY id_sim_type ASC`);
        res.json({
            success: true,
            message: "Registration options retrieved successfully",
            data: {
                agents,
                sim_types: simTypes
            }
        });

    } catch (error) {
        console.error(
            "GET /public/registration-options ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// ======================================
// GET AVAILABLE SIM
// ======================================
const getAvailableSims = async (req, res) => {
    try {
        const { id_sim_type } = req.query;

        if (!id_sim_type) {
            return res.status(400).json({
                success: false,
                message: "SIM type is required"
            });
        }

        const [rows] = await pool.query(
            `
            SELECT
                s.id_sim,
                s.phone_number,
                s.iccid,
                s.imsi,
                s.id_sim_type,
                st.sim_type,
                s.id_package,
                p.package_name,
                p.duration_days AS package_duration_days,
                p.price AS package_price,
                p.currency AS package_currency,
                s.package,
                s.qr_code,
                s.link_url
            FROM sim_cards s

            INNER JOIN sim_types st
                ON s.id_sim_type = st.id_sim_type

            INNER JOIN sim_status ss
                ON s.id_sim_status = ss.id_sim_status

            LEFT JOIN packages p
                ON s.id_package = p.id_package

            WHERE s.id_sim_type = ?
              AND s.deleted_at IS NULL
              AND ss.sim_status = 'Available'

            ORDER BY s.id_sim ASC
            `,
            [id_sim_type]
        );

        res.json({
            success: true,
            message: "Available SIMs retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error(
            "GET /public/sims/available ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// ======================================
// CREATE CUSTOMER REGISTRATION
// ======================================
const createPublicRegistration = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const {
            id_agent,
            id_sim,
            first_name,
            last_name,
            passport_number,
            nationality,
            date_of_birth,
            passport_expiry_date,
        } = req.body;

        // ------------------------------
        // VALIDATION
        // ------------------------------
        if (!id_agent) {
            return res.status(400).json({
                success: false,
                message: "Agent is required"
            });
        }

        if (!id_sim) {
            return res.status(400).json({
                success: false,
                message: "SIM is required"
            });
        }

        if (!first_name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "First name is required"
            });
        }

        if (!last_name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Last name is required"
            });
        }

        if (!passport_number?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Passport number is required"
            });
        }

        await connection.beginTransaction();

        // ------------------------------
        // CHECK AGENT
        // ------------------------------
        const [agentRows] = await connection.query(
            `
            SELECT id_agent
            FROM agents
            WHERE id_agent = ?
              AND deleted_at IS NULL
            `,
            [id_agent]
        );

        if (agentRows.length === 0) {
            await connection.rollback();
            connection.release();

            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }

        // ------------------------------
        // CHECK SIM + LOCK
        // ------------------------------
        const [simRows] = await connection.query(
            `
            SELECT
                s.id_sim,
                s.id_sim_status,
                s.id_sim_type,
                s.phone_number,
                s.qr_code,
                s.link_url,
                s.activation_code,
                ss.sim_status
            FROM sim_cards s

            INNER JOIN sim_status ss
                ON s.id_sim_status = ss.id_sim_status

            WHERE s.id_sim = ?
              AND s.deleted_at IS NULL
            FOR UPDATE
            `,
            [id_sim]
        );

        if (simRows.length === 0) {
            await connection.rollback();
            connection.release();

            return res.status(404).json({
                success: false,
                message: "SIM not found"
            });
        }

        const sim = simRows[0];

        if (sim.sim_status !== "Available") {
            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message: `SIM is not available. Current status: ${sim.sim_status}`
            });
        }

        // Package is assigned to the SIM by Admin. Customer does not choose or submit a package.
        const [packageRows] = await connection.query(
            `SELECT id_package, package_name, duration_days, price, currency
             FROM packages
             WHERE id_package = (SELECT id_package FROM sim_cards WHERE id_sim = ?)
               AND is_active = 1
               AND deleted_at IS NULL
             LIMIT 1`,
            [id_sim]
        );

        if (packageRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(409).json({
                success: false,
                message: "This SIM does not have an active package assigned"
            });
        }

        const simPackage = packageRows[0];

        // ------------------------------
        // CHECK PENDING REGISTRATION
        // ------------------------------
        const [pendingRows] = await connection.query(
            `
            SELECT r.id_registration
            FROM registrations r

            INNER JOIN registrations_status rs
                ON r.id_registration_status = rs.id_registration_status

            WHERE r.id_sim = ?
              AND rs.status_name = 'Pending'
            `,
            [id_sim]
        );

        if (pendingRows.length > 0) {
            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message: "This SIM already has a pending registration"
            });
        }

        // ------------------------------
        // CHECK CUSTOMER BY PASSPORT
        // ------------------------------
        let customerId;

        const [customerRows] = await connection.query(
            `
            SELECT id_customer
            FROM customers
            WHERE passport_number = ?
            LIMIT 1
            `,
            [passport_number.trim()]
        );

        if (customerRows.length > 0) {
            customerId = customerRows[0].id_customer;

            // Update customer info
            await connection.query(
                `
                UPDATE customers
                SET
                    first_name = ?,
                    last_name = ?,
                    nationality = ?,
                    date_of_birth = ?,
                    passport_expiry_date = ?
                WHERE id_customer = ?
                `,
                [
                    first_name.trim(),
                    last_name.trim(),
                    nationality?.trim() || null,
                    date_of_birth || null,
                    passport_expiry_date || null,
                    customerId
                ]
            );

        } else {
            // ------------------------------
            // CREATE CUSTOMER
            // ------------------------------
            const [customerResult] = await connection.query(
                `
                INSERT INTO customers (
                    first_name,
                    last_name,
                    passport_number,
                    nationality,
                    date_of_birth,
                    passport_expiry_date,
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    first_name.trim(),
                    last_name.trim(),
                    passport_number.trim(),
                    nationality?.trim() || null,
                    date_of_birth || null,
                    passport_expiry_date || null,
                ]
            );

            customerId = customerResult.insertId;
        }

        // ------------------------------
        // FIND PENDING STATUS
        // ------------------------------
        const [statusRows] = await connection.query(
            `
            SELECT id_registration_status
            FROM registrations_status
            WHERE status_name = 'Pending'
            LIMIT 1
            `
        );

        if (statusRows.length === 0) {
            await connection.rollback();
            connection.release();

            return res.status(500).json({
                success: false,
                message: "Pending registration status is not configured"
            });
        }

        const pendingStatusId = statusRows[0].id_registration_status;

        // ------------------------------
        // CREATE REGISTRATION
        // ------------------------------
        const [registrationResult] = await connection.query(
            `
            INSERT INTO registrations (
                id_registration_status,
                id_customer,
                id_sim,
                id_agent,
                id_package,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                pendingStatusId,
                customerId,
                id_sim,
                id_agent,
                simPackage.id_package,
                "Customer self registration"
            ]
        );

        // Reserve the SIM while the registration is waiting for admin review.
        const [reservedStatus] = await connection.query(`SELECT id_sim_status FROM sim_status WHERE sim_status='Reserved' LIMIT 1`);
        if (reservedStatus.length) {
            await connection.query(`UPDATE sim_cards SET id_sim_status=? WHERE id_sim=?`, [reservedStatus[0].id_sim_status, id_sim]);
        }

        await connection.commit();
        connection.release();

        res.status(201).json({
            success: true,
            message: "Customer registration submitted successfully",
            data: {
                id_registration: registrationResult.insertId,
                id_customer: customerId,
                id_sim: Number(id_sim),
                id_agent: Number(id_agent),
                id_package: simPackage.id_package,
                package_name: simPackage.package_name,
                package_duration_days: simPackage.duration_days,
                package_price: simPackage.price,
                package_currency: simPackage.currency,
                qr_code: sim.qr_code || null,
                activation_code: sim.activation_code || null,
                link_url: sim.link_url || null,
                status: "Pending"
            }
        });

    } catch (error) {
        try {
            await connection.rollback();
        } catch {}

        connection.release();

        console.error(
            "POST /public/registrations ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to submit registration"
        });
    }
};


module.exports = {
    getRegistrationOptions,
    getAvailableSims,
    createPublicRegistration
};