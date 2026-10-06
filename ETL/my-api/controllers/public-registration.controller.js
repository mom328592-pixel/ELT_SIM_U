const pool = require("../db");
const { createAuditLog } = require("../utils/audit");


// =====================================================
// GET REGISTRATION OPTIONS
// =====================================================

const getRegistrationOptions = async (req, res) => {
    try {
        const { agentToken } = req.params;

        const [agents] = await pool.query(
            `
            SELECT
                id_agent,
                agent_name,
                contact_phone,
                contact_email
            FROM agents
            WHERE public_token = ?
              AND deleted_at IS NULL
            LIMIT 1
            `,
            [agentToken]
        );

        if (!agents.length) {
            return res.status(404).json({
                success: false,
                message:
                    "Invalid or inactive agent link"
            });
        }

        const [simTypes] = await pool.query(
            `
            SELECT
                id_sim_type,
                sim_type,
                description
            FROM sim_types
            ORDER BY id_sim_type ASC
            `
        );

        return res.json({
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

        return res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// CREATE PUBLIC REGISTRATION
// =====================================================

const createPublicRegistration = async (req, res) => {
    let connection;

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

        // ---------------------------------------------
        // BASIC VALIDATION
        // ---------------------------------------------

        if (!agent_token) {
            return res.status(400).json({
                success: false,
                message: "Agent token is required"
            });
        }

        if (!id_sim_type) {
            return res.status(400).json({
                success: false,
                message: "SIM type is required"
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

        if (!nationality?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Nationality is required"
            });
        }

        connection =
            await pool.getConnection();

        await connection.beginTransaction();

        // ---------------------------------------------
        // FIND AGENT
        // ---------------------------------------------

        const [agentRows] =
            await connection.query(
                `
                SELECT
                    id_agent,
                    agent_name
                FROM agents
                WHERE public_token = ?
                  AND deleted_at IS NULL
                LIMIT 1
                `,
                [agent_token]
            );

        if (!agentRows.length) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message:
                    "Invalid or inactive agent link"
            });
        }

        const agent =
            agentRows[0];

        // ---------------------------------------------
        // FIND SIM TYPE
        // ---------------------------------------------

        const [simTypeRows] =
            await connection.query(
                `
                SELECT
                    id_sim_type,
                    sim_type
                FROM sim_types
                WHERE id_sim_type = ?
                LIMIT 1
                `,
                [id_sim_type]
            );

        if (!simTypeRows.length) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "SIM type not found"
            });
        }

        // ---------------------------------------------
        // FIND + LOCK AVAILABLE SIM
        // ---------------------------------------------

        const [simRows] =
            await connection.query(
                `
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
                      'ready_to_sale',
                      'ready-to-sale',
                      'ວ່າງ',
                      'ພ້ອມຂາຍ'
                  )

                ORDER BY s.id_sim ASC

                LIMIT 1

                FOR UPDATE
                `,
                [id_sim_type]
            );

        if (!simRows.length) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message:
                    "No SIM is available for this SIM type"
            });
        }

        const sim =
            simRows[0];

        // ---------------------------------------------
        // PREVENT DUPLICATE CUSTOMER PENDING REQUEST
        // ---------------------------------------------

        const [pendingCustomerRows] =
            await connection.query(
                `
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
                `,
                [passport_number.trim()]
            );

        if (pendingCustomerRows.length) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message:
                    "This passport already has a pending registration"
            });
        }

        // ---------------------------------------------
        // PREVENT DUPLICATE SIM PENDING REQUEST
        // ---------------------------------------------

        const [pendingSimRows] =
            await connection.query(
                `
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
                `,
                [sim.id_sim]
            );

        if (pendingSimRows.length) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message:
                    "This SIM already has a pending registration"
            });
        }

        // ---------------------------------------------
        // PASSPORT PHOTO
        // ---------------------------------------------

        let passportPhoto = null;

        if (req.file) {
            passportPhoto =
                `/uploads/${req.file.filename}`;
        }

        // ---------------------------------------------
        // FIND EXISTING CUSTOMER
        // ---------------------------------------------

        let customerId;

        const [customerRows] =
            await connection.query(
                `
                SELECT
                    id_customer
                FROM customers
                WHERE passport_number = ?
                LIMIT 1
                `,
                [passport_number.trim()]
            );

        if (customerRows.length) {

            // -----------------------------------------
            // UPDATE EXISTING CUSTOMER
            // -----------------------------------------

            customerId =
                customerRows[0].id_customer;

            await connection.query(
                `
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
                `,
                [
                    first_name.trim(),
                    last_name.trim(),
                    nationality.trim(),
                    date_of_birth || null,
                    passport_expiry_date || null,
                    phone_number?.trim() || null,
                    passportPhoto,
                    customerId
                ]
            );

        } else {

            // -----------------------------------------
            // CREATE NEW CUSTOMER
            // -----------------------------------------

            const [customerResult] =
                await connection.query(
                    `
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
                    `,
                    [
                        first_name.trim(),
                        last_name.trim(),
                        passport_number.trim(),
                        nationality.trim(),
                        date_of_birth || null,
                        passport_expiry_date || null,
                        phone_number?.trim() || null,
                        passportPhoto
                    ]
                );

            customerId =
                customerResult.insertId;
        }

        // ---------------------------------------------
        // GET PENDING REGISTRATION STATUS
        // ---------------------------------------------

        const [statusRows] =
            await connection.query(
                `
                SELECT
                    id_registration_status
                FROM registrations_status
                WHERE LOWER(status_name) =
                      'pending'
                LIMIT 1
                `
            );

        if (!statusRows.length) {
            await connection.rollback();

            return res.status(500).json({
                success: false,
                message:
                    "Pending registration status is not configured"
            });
        }

        const pendingStatus =
            statusRows[0].id_registration_status;

        // ---------------------------------------------
        // CREATE REGISTRATION
        // PACKAGE IS TAKEN FROM SIM
        // ---------------------------------------------

        const [registrationResult] =
            await connection.query(
                `
                INSERT INTO registrations (
                    id_registration_status,
                    id_customer,
                    id_sim,
                    id_agent,
                    registered_at,
                    notes
                )
                VALUES (?, ?, ?, ?, NOW(), ?)
                `,
                [
                    pendingStatus,
                    customerId,
                    sim.id_sim,
                    agent.id_agent,
                    "Customer self registration"
                ]
            );

        // ---------------------------------------------
        // COMMIT
        // ---------------------------------------------

        await connection.commit();

        // ---------------------------------------------
        // AUDIT
        // ---------------------------------------------

        await createAuditLog({
            req,
            action: "CREATE_PUBLIC_REGISTRATION",
            targetEntity: "registrations",
            targetId: registrationResult.insertId,
            metadata: {
                id_agent: agent.id_agent,
                id_customer: customerId,
                id_sim: sim.id_sim,
                id_sim_type: id_sim_type,
                passport_number:
                    passport_number.trim()
            }
        });

        // ---------------------------------------------
        // RESPONSE
        // ---------------------------------------------

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

                    // Never expose QR before approval.
                    qr_code: null,

                    // Never expose activation code before approval.
                    activation_code: null,

                    status:
                        "Pending"
                },

                status:
                    "Pending"
            }
        });

    } catch (error) {

        if (connection) {
            try {
                await connection.rollback();
            } catch {}
        }

        console.error(
            "PUBLIC REGISTRATION ERROR:",
            error
        );

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message:
                    "Duplicate passport, ICCID, or registration data"
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to submit registration"
        });

    } finally {

        if (connection) {
            connection.release();
        }
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
                await pool.query(
                    `
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
                    `,
                    [
                        id,
                        agentToken
                    ]
                );

            if (!rows.length) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Registration not found"
                });
            }

            const row =
                rows[0];

            const status =
                String(
                    row.registration_status || ""
                )
                .trim()
                .toLowerCase();

            const approved =
                status === "approved";

            return res.json({
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

            return res.status(500).json({
                success: false,
                message: "Database error"
            });
        }
    };


// =====================================================
// EXPORT
// =====================================================

module.exports = {
    getRegistrationOptions,
    createPublicRegistration,
    getPublicRegistrationStatus
};