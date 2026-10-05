const pool = require("../db");


// =====================================================
// GET REGISTRATION OPTIONS
// =====================================================

const getRegistrationOptions = async (req, res) => {

    try {

        const { agentToken } = req.params;

        const [agents] =
            await pool.query(`
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
                message:
                    "Invalid or inactive agent link"
            });
        }

        const [simTypes] =
            await pool.query(`
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
            message: "Database error"
        });
    }
};


// =====================================================
// CREATE PUBLIC REGISTRATION
// =====================================================

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
                message:
                    "Passport number is required"
            });
        }

        if (!nationality?.trim()) {

            connection.release();

            return res.status(400).json({
                success: false,
                message: "Nationality is required"
            });
        }

        await connection.beginTransaction();


        // =================================================
        // AGENT
        // =================================================

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
                message:
                    "Invalid or inactive agent link"
            });
        }

        const agent = agentRows[0];


        // =================================================
        // SIM TYPE
        // =================================================

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


        // =================================================
        // AVAILABLE SIM + PACKAGE
        // IMPORTANT: LOCK ROW
        // =================================================

        const [simRows] =
            await connection.query(`
                SELECT
                    s.id_sim,
                    s.phone_number,
                    s.iccid,
                    s.imsi,

                    s.id_sim_type,
                    st.sim_type,

                    s.id_package,

                    s.qr_code,
                    s.activation_code,

                    p.package_name,
                    p.data_gb,
                    p.validity_days,
                    p.price

                FROM sim_cards s

                INNER JOIN sim_status ss
                    ON s.id_sim_status =
                       ss.id_sim_status

                INNER JOIN sim_types st
                    ON s.id_sim_type =
                       st.id_sim_type

                LEFT JOIN packages p
                    ON s.id_package =
                       p.id_package

                WHERE s.id_sim_type = ?
                  AND s.id_package IS NOT NULL
                  AND s.deleted_at IS NULL

                  AND LOWER(ss.sim_status) IN (
                      'available',
                      'ready for sale',
                      'ວ່າງ',
                      'ພ້ອມຂາຍ'
                  )

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


        // =================================================
        // CHECK CUSTOMER DUPLICATE PENDING REGISTRATION
        // =================================================

        const [pendingCustomerRows] =
            await connection.query(`
                SELECT
                    r.id_registration

                FROM registrations r

                INNER JOIN customers c
                    ON r.id_customer =
                       c.id_customer

                INNER JOIN registrations_status rs
                    ON r.id_registration_status =
                       rs.id_registration_status

                WHERE c.passport_number = ?

                  AND LOWER(rs.status_name) =
                      'pending'

                  AND r.deleted_at IS NULL

                LIMIT 1
            `, [passport_number.trim()]);

        if (pendingCustomerRows.length) {

            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    "This passport already has a pending registration"
            });
        }


        // =================================================
        // CHECK SIM PENDING REGISTRATION
        // =================================================

        const [pendingSimRows] =
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

        if (pendingSimRows.length) {

            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    "This SIM already has a pending registration"
            });
        }


        // =================================================
        // PASSPORT PHOTO
        // =================================================

        let passportPhoto = null;

        if (req.file) {
            passportPhoto =
                `/uploads/${req.file.filename}`;
        }


        // =================================================
        // CUSTOMER
        // =================================================

        let customerId;

        const [customerRows] =
            await connection.query(`
                SELECT
                    id_customer
                FROM customers
                WHERE passport_number = ?
                LIMIT 1
            `, [passport_number.trim()]);


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


        // =================================================
        // PENDING STATUS
        // =================================================

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

        const pendingStatus =
            statusRows[0].id_registration_status;


        // =================================================
        // CREATE REGISTRATION
        // PACKAGE IS NOT STORED HERE
        // PACKAGE COMES FROM sim_cards.id_package
        // =================================================

        const [registrationResult] =
            await connection.query(`
                INSERT INTO registrations (
                    id_registration_status,
                    id_customer,
                    id_sim,
                    id_agent,
                    registered_at,
                    notes
                )
                VALUES (?, ?, ?, ?, NOW(), ?)
            `, [
                pendingStatus,
                customerId,
                sim.id_sim,
                agent.id_agent,
                "Customer self registration"
            ]);


        // =================================================
        // COMMIT
        // =================================================

        await connection.commit();

        connection.release();


        // =================================================
        // RESPONSE
        // =================================================

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

                    package_name:
                        sim.package_name,

                    data_gb:
                        sim.data_gb,

                    validity_days:
                        sim.validity_days,

                    price:
                        sim.price,

                    sim_type:
                        sim.sim_type,

                    // Do not expose before approval.
                    qr_code:
                        null,

                    activation_code:
                        null,

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
        } catch {}

        connection.release();

        console.error(
            "PUBLIC REGISTRATION ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to submit registration",
            error: error.message
        });
    }
};


// =====================================================
// PUBLIC STATUS / RESULT
// =====================================================

const getPublicRegistrationStatus =
    async (req, res) => {

        try {

            const {
                agentToken,
                id
            } = req.params;

            const [rows] =
                await pool.query(`
                    SELECT
                        r.id_registration,

                        rs.status_name
                            AS registration_status,

                        c.first_name,
                        c.last_name,
                        c.passport_number,

                        r.id_sim,

                        s.phone_number,
                        s.iccid,
                        s.imsi,

                        st.sim_type,

                        p.package_name,
                        p.data_gb,
                        p.validity_days,
                        p.price,

                        s.qr_code,
                        s.activation_code,

                        r.registered_at,
                        r.reviewed_at

                    FROM registrations r

                    INNER JOIN agents a
                        ON r.id_agent =
                           a.id_agent

                    INNER JOIN registrations_status rs
                        ON r.id_registration_status =
                           rs.id_registration_status

                    INNER JOIN customers c
                        ON r.id_customer =
                           c.id_customer

                    INNER JOIN sim_cards s
                        ON r.id_sim =
                           s.id_sim

                    LEFT JOIN sim_types st
                        ON s.id_sim_type =
                           st.id_sim_type

                    LEFT JOIN packages p
                        ON s.id_package =
                           p.id_package

                    WHERE r.id_registration = ?

                      AND a.public_token = ?

                      AND r.deleted_at IS NULL

                    LIMIT 1
                `, [
                    id,
                    agentToken
                ]);

            if (!rows.length) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Registration not found"
                });
            }

            const row = rows[0];

            const approved =
                String(
                    row.registration_status || ""
                ).toLowerCase() === "approved";

            res.json({
                success: true,
                data: {

                    id_registration:
                        row.id_registration,

                    status:
                        row.registration_status,

                    customer: {
                        first_name:
                            row.first_name,
                        last_name:
                            row.last_name,
                        passport_number:
                            row.passport_number
                    },

                    sim: {

                        id_sim:
                            row.id_sim,

                        phone_number:
                            row.phone_number,

                        iccid:
                            row.iccid,

                        imsi:
                            row.imsi,

                        sim_type:
                            row.sim_type,

                        package_name:
                            row.package_name,

                        data_gb:
                            row.data_gb,

                        validity_days:
                            row.validity_days,

                        price:
                            row.price,

                        qr_code:
                            approved
                                ? row.qr_code
                                : null,

                        activation_code:
                            approved
                                ? row.activation_code
                                : null
                    },

                    registered_at:
                        row.registered_at,

                    reviewed_at:
                        row.reviewed_at
                }
            });

        } catch (error) {

            console.error(
                "PUBLIC REGISTRATION STATUS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Database error"
            });
        }
    };


module.exports = {
    getRegistrationOptions,
    createPublicRegistration,
    getPublicRegistrationStatus
};