const pool = require("../db");


// ======================================================
// GET REGISTRATION OPTIONS
// ======================================================

const getRegistrationOptions = async (req, res) => {

    try {

        const { agentToken } = req.params;

        if (!agentToken) {
            return res.status(400).json({
                success: false,
                message: "Agent token is required"
            });
        }

        const [agents] = await pool.query(`
            SELECT
                id_agent,
                agent_name,
                contact_phone,
                contact_email
            FROM agents
            WHERE public_token = ?
              AND deleted_at IS NULL
            LIMIT 1
        `, [agentToken]);

        if (!agents.length) {
            return res.status(404).json({
                success: false,
                message: "Invalid or inactive agent link"
            });
        }

        const [simTypes] = await pool.query(`
            SELECT
                id_sim_type,
                sim_type,
                description
            FROM sim_types
            ORDER BY id_sim_type ASC
        `);

        res.json({
            success: true,
            data: {
                agent: agents[0],
                sim_types: simTypes
            }
        });

    } catch (error) {

        console.error(
            "GET REGISTRATION OPTIONS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// ======================================================
// CREATE PUBLIC REGISTRATION
// ======================================================

const createPublicRegistration = async (req, res) => {

    const connection =
        await pool.getConnection();

    try {

        const {
            agent_token,
            id_sim_type,
            first_name,
            last_name,
            passport_number,
            nationality,
            date_of_birth,
            passport_expiry_date,
            phone_number
        } = req.body;


        // ==================================================
        // VALIDATION
        // ==================================================

        if (!agent_token) {
            connection.release();

            return res.status(400).json({
                success: false,
                message: "Agent token is required"
            });
        }

        if (!id_sim_type) {
            connection.release();

            return res.status(400).json({
                success: false,
                message: "SIM type is required"
            });
        }

        if (!first_name?.trim()) {
            connection.release();

            return res.status(400).json({
                success: false,
                message: "First name is required"
            });
        }

        if (!last_name?.trim()) {
            connection.release();

            return res.status(400).json({
                success: false,
                message: "Last name is required"
            });
        }

        if (!passport_number?.trim()) {
            connection.release();

            return res.status(400).json({
                success: false,
                message: "Passport number is required"
            });
        }

        if (!nationality?.trim()) {
            connection.release();

            return res.status(400).json({
                success: false,
                message: "Nationality is required"
            });
        }


        // ==================================================
        // BEGIN TRANSACTION
        // ==================================================

        await connection.beginTransaction();


        // ==================================================
        // FIND AGENT FROM PUBLIC TOKEN
        // ==================================================

        const [agentRows] =
            await connection.query(`
                SELECT
                    id_agent,
                    agent_name
                FROM agents
                WHERE public_token = ?
                  AND deleted_at IS NULL
                LIMIT 1
            `, [agent_token]);


        if (!agentRows.length) {

            await connection.rollback();
            connection.release();

            return res.status(404).json({
                success: false,
                message: "Invalid or inactive agent link"
            });
        }


        const agent =
            agentRows[0];


        // ==================================================
        // CHECK SIM TYPE
        // ==================================================

        const [simTypeRows] =
            await connection.query(`
                SELECT
                    id_sim_type,
                    sim_type
                FROM sim_types
                WHERE id_sim_type = ?
                LIMIT 1
            `, [id_sim_type]);


        if (!simTypeRows.length) {

            await connection.rollback();
            connection.release();

            return res.status(404).json({
                success: false,
                message: "SIM type not found"
            });
        }


        // ==================================================
        // FIND AVAILABLE SIM
        // LOCK ROW
        // ==================================================

        const [simRows] =
            await connection.query(`
                SELECT
                    s.id_sim,
                    s.phone_number,
                    s.iccid,
                    s.imsi,
                    s.id_sim_type,
                    s.id_package,
                    s.qr_code,
                    s.activation_code,
                    s.link_url,

                    ss.status_name AS sim_status,

                    st.sim_type,

                    p.package_name,
                    p.duration_days,
                    p.price,
                    p.currency

                FROM sim_cards s

                INNER JOIN sim_status ss
                    ON s.id_sim_status =
                       ss.id_sim_status

                LEFT JOIN sim_types st
                    ON s.id_sim_type =
                       st.id_sim_type

                LEFT JOIN packages p
                    ON s.id_package =
                       p.id_package

                WHERE s.id_sim_type = ?
                  AND LOWER(ss.status_name) =
                      'available'
                  AND s.deleted_at IS NULL

                ORDER BY s.id_sim ASC

                LIMIT 1

                FOR UPDATE
            `, [id_sim_type]);


        if (!simRows.length) {

            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    "No SIM is available for this SIM type"
            });
        }


        const sim = simRows[0];


        // ==================================================
        // PACKAGE MUST EXIST
        // ==================================================

        if (!sim.id_package) {

            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    "This SIM does not have a package assigned"
            });
        }


        // ==================================================
        // FIND PENDING REGISTRATION
        // ==================================================

        const [pendingRows] =
            await connection.query(`
                SELECT
                    r.id_registration

                FROM registrations r

                INNER JOIN registrations_status rs
                    ON r.id_registration_status =
                       rs.id_registration_status

                WHERE r.id_sim = ?

                  AND LOWER(rs.status_name) =
                      'pending'

                  AND r.deleted_at IS NULL

                LIMIT 1
            `, [sim.id_sim]);


        if (pendingRows.length) {

            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    "This SIM already has a pending registration"
            });
        }


        // ==================================================
        // PASSPORT PHOTO
        // ==================================================

        let passportPhoto = null;

        if (req.file) {
            passportPhoto =
                `/uploads/${req.file.filename}`;
        }


        // ==================================================
        // FIND CUSTOMER
        // ==================================================

        let customerId;

        const [customerRows] =
            await connection.query(`
                SELECT
                    id_customer
                FROM customers
                WHERE passport_number = ?
                LIMIT 1
            `, [
                passport_number.trim()
            ]);


        // ==================================================
        // UPDATE EXISTING CUSTOMER
        // ==================================================

        if (customerRows.length) {

            customerId =
                customerRows[0].id_customer;

            await connection.query(`
                UPDATE customers
                SET
                    first_name = ?,
                    last_name = ?,
                    nationality = ?,
                    date_of_birth = ?,
                    passport_expiry_date = ?,
                    phone_number = ?,
                    passport_photo =
                        COALESCE(
                            ?,
                            passport_photo
                        ),
                    updated_at = NOW()
                WHERE id_customer = ?
            `, [
                first_name.trim(),
                last_name.trim(),
                nationality.trim(),
                date_of_birth || null,
                passport_expiry_date || null,
                phone_number?.trim() || null,
                passportPhoto,
                customerId
            ]);

        } else {

            // ==================================================
            // CREATE CUSTOMER
            // ==================================================

            const [customerResult] =
                await connection.query(`
                    INSERT INTO customers (
                        first_name,
                        last_name,
                        passport_number,
                        nationality,
                        date_of_birth,
                        passport_expiry_date,
                        phone_number,
                        passport_photo
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    first_name.trim(),
                    last_name.trim(),
                    passport_number.trim(),
                    nationality.trim(),
                    date_of_birth || null,
                    passport_expiry_date || null,
                    phone_number?.trim() || null,
                    passportPhoto
                ]);

            customerId =
                customerResult.insertId;
        }


        // ==================================================
        // GET PENDING REGISTRATION STATUS
        // ==================================================

        const [statusRows] =
            await connection.query(`
                SELECT
                    id_registration_status
                FROM registrations_status
                WHERE LOWER(status_name) =
                      'pending'
                LIMIT 1
            `);


        if (!statusRows.length) {

            await connection.rollback();
            connection.release();

            return res.status(500).json({
                success: false,
                message:
                    "Pending registration status is not configured"
            });
        }


        const pendingStatusId =
            statusRows[0].id_registration_status;


        // ==================================================
        // CREATE REGISTRATION
        // ==================================================

        const [registrationResult] =
            await connection.query(`
                INSERT INTO registrations (
                    id_registration_status,
                    id_customer,
                    id_sim,
                    id_agent,
                    id_package,
                    registered_at,
                    notes
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    NOW(),
                    ?
                )
            `, [
                pendingStatusId,
                customerId,
                sim.id_sim,
                agent.id_agent,
                sim.id_package,
                "Customer self registration"
            ]);


        // ==================================================
        // RESERVED STATUS
        // ==================================================

        const [reservedStatus] =
            await connection.query(`
                SELECT
                    id_sim_status
                FROM sim_status
                WHERE LOWER(status_name) =
                      'reserved'
                LIMIT 1
            `);


        if (reservedStatus.length) {

            await connection.query(`
                UPDATE sim_cards
                SET
                    id_sim_status = ?,
                    updated_at = NOW()
                WHERE id_sim = ?
            `, [
                reservedStatus[0].id_sim_status,
                sim.id_sim
            ]);
        }


        // ==================================================
        // COMMIT
        // ==================================================

        await connection.commit();

        connection.release();


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.status(201).json({

            success: true,

            message:
                "Registration submitted successfully",

            data: {

                id_registration:
                    registrationResult.insertId,

                id_customer:
                    customerId,

                id_agent:
                    agent.id_agent,

                agent_name:
                    agent.agent_name,

                sim: {

                    id_sim:
                        sim.id_sim,

                    phone_number:
                        sim.phone_number,

                    iccid:
                        sim.iccid,

                    imsi:
                        sim.imsi,

                    // ບໍ່ສົ່ງ QR ກ່ອນ approve
                    qr_code: null,

                    activation_code: null,

                    link_url: null,

                    package_name:
                        sim.package_name,

                    duration_days:
                        sim.duration_days,

                    price:
                        sim.price,

                    currency:
                        sim.currency,

                    sim_type:
                        sim.sim_type,

                    status:
                        "Pending"
                },

                status:
                    "Pending"
            }
        });

    } catch (error) {

        try {
            await connection.rollback();
        } catch (_) {}

        connection.release();

        console.error(
            "PUBLIC REGISTRATION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to submit registration",
            error:
                error.message
        });
    }
};


module.exports = {
    getRegistrationOptions,
    createPublicRegistration
};