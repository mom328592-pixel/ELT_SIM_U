const pool = require("../db");
const { createAuditLog } = require("../utils/audit");

// =====================================================
// HELPERS
// =====================================================

const normalizeStatus = (value) =>
    String(value || "")
        .trim()
        .toLowerCase();

const isAvailableSimStatus = (value) => {
    const status = normalizeStatus(value);

    return [
        "available",
        "ready for sale",
        "ready_to_sale",
        "ready-to-sale",
        "ວ່າງ",
        "ພ້ອມຂາຍ",
    ].includes(status);
};

const isRegisteredSimStatus = (value) => {
    const status = normalizeStatus(value);

    return [
        "registered",
        "active",
        "ລົງທະບຽນແລ້ວ",
    ].includes(status);
};

const findRegistrationStatusId = async (connection, names) => {
    const lowerNames = names.map((name) => name.toLowerCase());

    const placeholders = lowerNames.map(() => "?").join(", ");

    const [rows] = await connection.query(
        `
        SELECT
            id_registration_status,
            status_name
        FROM registrations_status
        WHERE LOWER(status_name) IN (${placeholders})
        LIMIT ${lowerNames.length}
        `,
        lowerNames
    );

    return rows;
};

const findSimStatusId = async (connection, names) => {
    const lowerNames = names.map((name) => name.toLowerCase());

    if (!lowerNames.length) {
        return null;
    }

    const placeholders = lowerNames.map(() => "?").join(", ");

    const [rows] = await connection.query(
        `
        SELECT
            id_sim_status,
            sim_status
        FROM sim_status
        WHERE LOWER(sim_status) IN (${placeholders})
        LIMIT 1
        `,
        lowerNames
    );

    return rows.length ? rows[0].id_sim_status : null;
};

// =====================================================
// GET ALL REGISTRATIONS
// =====================================================

const getAllRegistrations = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                r.id_registration,
                r.id_registration_status,
                rs.status_name AS registration_status,

                r.id_customer,

                CONCAT(
                    COALESCE(c.first_name, ''),
                    ' ',
                    COALESCE(c.last_name, '')
                ) AS customer_name,

                c.first_name,
                c.last_name,
                c.passport_number,
                c.passport_photo,

                r.id_sim,

                s.phone_number,
                s.iccid,
                s.imsi,
                s.qr_code,
                s.activation_code,

                s.id_sim_type,
                st.sim_type,

                s.id_sim_status,
                ss.sim_status,

                s.id_package,

                p.package_name,
                p.data_gb AS package_data_gb,
                p.validity_days AS package_duration_days,
                p.price AS package_price,

                r.id_agent,
                a.agent_name,

                r.registered_at,

                r.reviewed_by,
                u.username AS reviewed_by_username,

                r.reviewed_at,
                r.notes,

                r.created_at,
                r.updated_at

            FROM registrations r

            LEFT JOIN registrations_status rs
                ON r.id_registration_status =
                   rs.id_registration_status

            LEFT JOIN customers c
                ON r.id_customer = c.id_customer

            LEFT JOIN sim_cards s
                ON r.id_sim = s.id_sim

            LEFT JOIN sim_types st
                ON s.id_sim_type = st.id_sim_type

            LEFT JOIN sim_status ss
                ON s.id_sim_status = ss.id_sim_status

            LEFT JOIN packages p
                ON s.id_package = p.id_package

            LEFT JOIN agents a
                ON r.id_agent = a.id_agent

            LEFT JOIN users u
                ON r.reviewed_by = u.id_user

            WHERE r.deleted_at IS NULL

            ORDER BY r.created_at DESC
        `);

        return res.json({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error(
            "GET ALL REGISTRATIONS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Database error",
        });
    }
};

// =====================================================
// GET AVAILABLE SIMS
// =====================================================

const getAvailableSims = async (req, res) => {
    try {
        const id_sim_type =
            req.query.id_sim_type ||
            req.query.sim_type_id;

        if (!id_sim_type) {
            return res.status(400).json({
                success: false,
                message: "SIM type is required",
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

                s.id_sim_status,
                ss.sim_status,

                s.id_package,

                p.package_name,
                p.data_gb AS package_data_gb,
                p.validity_days AS package_duration_days,
                p.price AS package_price

            FROM sim_cards s

            JOIN sim_status ss
                ON s.id_sim_status =
                   ss.id_sim_status

            LEFT JOIN sim_types st
                ON s.id_sim_type =
                   st.id_sim_type

            LEFT JOIN packages p
                ON s.id_package =
                   p.id_package

            WHERE s.id_sim_type = ?

              AND s.deleted_at IS NULL

              AND s.id_package IS NOT NULL

              AND LOWER(ss.sim_status) IN (
                  'available',
                  'ready for sale',
                  'ready_to_sale',
                  'ready-to-sale',
                  'ວ່າງ',
                  'ພ້ອມຂາຍ'
              )

              AND NOT EXISTS (
                  SELECT 1
                  FROM registrations pr
                  WHERE pr.id_sim = s.id_sim
                    AND pr.deleted_at IS NULL
                    AND pr.id_registration_status = (
                        SELECT rs2.id_registration_status
                        FROM registrations_status rs2
                        WHERE LOWER(rs2.status_name) = 'pending'
                        LIMIT 1
                    )
              )

            ORDER BY s.id_sim ASC
            `,
            [id_sim_type]
        );

        return res.json({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error(
            "GET AVAILABLE SIMS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Database error",
        });
    }
};

// =====================================================
// GET REGISTRATION BY ID
// =====================================================

const getRegistrationById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            `
            SELECT
                r.id_registration,
                r.id_registration_status,
                rs.status_name AS registration_status,

                r.id_customer,

                CONCAT(
                    COALESCE(c.first_name, ''),
                    ' ',
                    COALESCE(c.last_name, '')
                ) AS customer_name,

                c.first_name,
                c.last_name,
                c.passport_number,
                c.nationality,
                c.date_of_birth,
                c.passport_photo,

                r.id_sim,

                s.phone_number,
                s.iccid,
                s.imsi,
                s.qr_code,
                s.activation_code,

                s.id_sim_type,
                st.sim_type,

                s.id_sim_status,
                ss.sim_status,

                s.id_package,

                p.package_name,
                p.data_gb AS package_data_gb,
                p.validity_days AS package_duration_days,
                p.price AS package_price,

                r.id_agent,
                a.agent_name,

                r.registered_at,

                r.reviewed_by,
                u.username AS reviewed_by_username,

                r.reviewed_at,
                r.notes,

                r.created_at,
                r.updated_at

            FROM registrations r

            LEFT JOIN registrations_status rs
                ON r.id_registration_status =
                   rs.id_registration_status

            LEFT JOIN customers c
                ON r.id_customer =
                   c.id_customer

            LEFT JOIN sim_cards s
                ON r.id_sim =
                   s.id_sim

            LEFT JOIN sim_types st
                ON s.id_sim_type =
                   st.id_sim_type

            LEFT JOIN sim_status ss
                ON s.id_sim_status =
                   ss.id_sim_status

            LEFT JOIN packages p
                ON s.id_package =
                   p.id_package

            LEFT JOIN agents a
                ON r.id_agent =
                   a.id_agent

            LEFT JOIN users u
                ON r.reviewed_by =
                   u.id_user

            WHERE r.id_registration = ?
              AND r.deleted_at IS NULL

            LIMIT 1
            `,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Registration not found",
            });
        }

        return res.json({
            success: true,
            message:
                "Registration retrieved successfully",
            data: rows[0],
        });
    } catch (error) {
        console.error(
            "GET REGISTRATION BY ID ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Database error",
        });
    }
};

// =====================================================
// CREATE REGISTRATION
// =====================================================

const createRegistration = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const {
            id_registration_status,
            id_customer,
            id_sim,
            id_agent,
            registered_at,
            notes,
        } = req.body;

        if (
            !id_customer ||
            !id_sim ||
            !id_agent
        ) {
            connection.release();

            return res.status(400).json({
                success: false,
                message:
                    "id_customer, id_sim and id_agent are required",
            });
        }

        await connection.beginTransaction();

        // ---------------------------------------------
        // Find Pending status
        // ---------------------------------------------

        const registrationStatuses =
            await findRegistrationStatusId(
                connection,
                ["Pending"]
            );

        const pendingStatus =
            registrationStatuses.find(
                (row) =>
                    normalizeStatus(
                        row.status_name
                    ) === "pending"
            );

        if (!pendingStatus) {
            throw new Error(
                "Pending registration status is not configured"
            );
        }

        const pendingStatusId =
            pendingStatus.id_registration_status;

        // ---------------------------------------------
        // Only Pending allowed when creating
        // ---------------------------------------------

        const requestedStatus =
            id_registration_status
                ? Number(id_registration_status)
                : pendingStatusId;

        if (
            requestedStatus !==
            Number(pendingStatusId)
        ) {
            await connection.rollback();
            connection.release();

            return res.status(400).json({
                success: false,
                message:
                    "New registrations must start with Pending status",
            });
        }

        // ---------------------------------------------
        // Lock SIM
        // ---------------------------------------------

        const [simRows] =
            await connection.query(
                `
                SELECT
                    s.id_sim,
                    s.iccid,
                    s.imsi,
                    s.id_package,
                    s.id_sim_type,

                    ss.id_sim_status,
                    ss.sim_status,

                    p.package_name,
                    p.data_gb,
                    p.validity_days,
                    p.price

                FROM sim_cards s

                JOIN sim_status ss
                    ON s.id_sim_status =
                       ss.id_sim_status

                LEFT JOIN packages p
                    ON s.id_package =
                       p.id_package

                WHERE s.id_sim = ?
                  AND s.deleted_at IS NULL

                FOR UPDATE
                `,
                [id_sim]
            );

        if (!simRows.length) {
            await connection.rollback();
            connection.release();

            return res.status(404).json({
                success: false,
                message: "SIM card not found",
            });
        }

        const sim = simRows[0];

        // ---------------------------------------------
        // Check SIM Available
        // ---------------------------------------------

        if (!isAvailableSimStatus(sim.sim_status)) {
            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    `SIM is not available. Current status: ${sim.sim_status}`,
            });
        }

        // ---------------------------------------------
        // Package must belong to SIM
        // ---------------------------------------------

        if (!sim.id_package) {
            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    "This SIM does not have a Package assigned",
            });
        }

        // ---------------------------------------------
        // Check existing pending registration
        // ---------------------------------------------

        const [pendingRegistrationRows] =
            await connection.query(
                `
                SELECT
                    id_registration

                FROM registrations

                WHERE id_sim = ?
                  AND id_registration_status = ?
                  AND deleted_at IS NULL

                LIMIT 1

                FOR UPDATE
                `,
                [
                    id_sim,
                    pendingStatusId,
                ]
            );

        if (pendingRegistrationRows.length) {
            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    "This SIM already has a pending registration",
            });
        }

        // ---------------------------------------------
        // INSERT REGISTRATION
        // ---------------------------------------------

        const [result] =
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
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    pendingStatusId,
                    id_customer,
                    id_sim,
                    id_agent,
                    registered_at || new Date(),
                    notes || null,
                ]
            );

        const newId = result.insertId;

        // ---------------------------------------------
        // Return created registration
        // ---------------------------------------------

        const [rows] =
            await connection.query(
                `
                SELECT
                    r.id_registration,
                    r.id_registration_status,
                    rs.status_name AS registration_status,

                    r.id_customer,

                    CONCAT(
                        COALESCE(c.first_name, ''),
                        ' ',
                        COALESCE(c.last_name, '')
                    ) AS customer_name,

                    c.passport_number,
                    c.passport_photo,

                    r.id_sim,

                    s.phone_number,
                    s.iccid,
                    s.imsi,

                    st.sim_type,

                    s.id_package,

                    p.package_name,
                    p.data_gb AS package_data_gb,
                    p.validity_days AS package_validity_days,
                    p.price AS package_price,

                    r.id_agent,
                    a.agent_name,

                    r.registered_at,
                    r.reviewed_by,
                    u.username AS reviewed_by_username,

                    r.reviewed_at,
                    r.notes,
                    r.created_at,
                    r.updated_at

                FROM registrations r

                LEFT JOIN registrations_status rs
                    ON r.id_registration_status =
                       rs.id_registration_status

                LEFT JOIN customers c
                    ON r.id_customer =
                       c.id_customer

                LEFT JOIN sim_cards s
                    ON r.id_sim =
                       s.id_sim

                LEFT JOIN sim_types st
                    ON s.id_sim_type =
                       st.id_sim_type

                LEFT JOIN packages p
                    ON s.id_package =
                       p.id_package

                LEFT JOIN agents a
                    ON r.id_agent =
                       a.id_agent

                LEFT JOIN users u
                    ON r.reviewed_by =
                       u.id_user

                WHERE r.id_registration = ?
                `,
                [newId]
            );

        await connection.commit();
        connection.release();

        await createAuditLog({
            req,
            action: "CREATE",
            targetEntity: "registrations",
            targetId: newId,
            metadata: {
                id_customer,
                id_sim,
                id_agent,
                id_registration_status:
                    pendingStatusId,
            },
        }).catch((error) => {
            console.error(
                "REGISTRATION AUDIT ERROR:",
                error
            );
        });

        return res.status(201).json({
            success: true,
            message:
                "Registration created successfully",
            data: rows[0],
        });
    } catch (error) {
        try {
            await connection.rollback();
        } catch {}

        connection.release();

        console.error(
            "CREATE REGISTRATION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message,
        });
    }
};

// =====================================================
// UPDATE REGISTRATION
// =====================================================
// Generic UPDATE is for editing Pending registration.
// Approve/Reject must use dedicated endpoints.
// =====================================================

const updateRegistration = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;

        const {
            id_registration_status,
            id_customer,
            id_sim,
            id_agent,
            notes,
        } = req.body;

        if (
            !id_registration_status ||
            !id_customer ||
            !id_sim ||
            !id_agent
        ) {
            connection.release();

            return res.status(400).json({
                success: false,
                message:
                    "id_registration_status, id_customer, id_sim and id_agent are required",
            });
        }

        const statusId =
            Number(id_registration_status);

        await connection.beginTransaction();

        // ---------------------------------------------
        // Find Pending / Approved / Rejected
        // ---------------------------------------------

        const statusRows =
            await findRegistrationStatusId(
                connection,
                [
                    "Pending",
                    "Approved",
                    "Rejected",
                ]
            );

        const pendingStatus =
            statusRows.find(
                (row) =>
                    normalizeStatus(
                        row.status_name
                    ) === "pending"
            );

        const approvedStatus =
            statusRows.find(
                (row) =>
                    normalizeStatus(
                        row.status_name
                    ) === "approved"
            );

        const rejectedStatus =
            statusRows.find(
                (row) =>
                    normalizeStatus(
                        row.status_name
                    ) === "rejected"
            );

        if (
            !pendingStatus ||
            !approvedStatus ||
            !rejectedStatus
        ) {
            throw new Error(
                "Registration statuses are not configured correctly"
            );
        }

        // ---------------------------------------------
        // Only Pending may be edited here
        // ---------------------------------------------

        if (
            statusId !==
            Number(pendingStatus.id_registration_status)
        ) {
            await connection.rollback();
            connection.release();

            return res.status(400).json({
                success: false,
                message:
                    "Use /approve or /reject endpoint to review registration",
            });
        }

        // ---------------------------------------------
        // Lock existing registration
        // ---------------------------------------------

        const [registrationRows] =
            await connection.query(
                `
                SELECT
                    id_registration,
                    id_registration_status,
                    id_sim
                FROM registrations
                WHERE id_registration = ?
                  AND deleted_at IS NULL
                FOR UPDATE
                `,
                [id]
            );

        if (!registrationRows.length) {
            await connection.rollback();
            connection.release();

            return res.status(404).json({
                success: false,
                message:
                    "Registration not found",
            });
        }

        if (
            Number(
                registrationRows[0]
                    .id_registration_status
            ) !==
            Number(
                pendingStatus.id_registration_status
            )
        ) {
            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    "Only Pending registrations can be edited",
            });
        }

        // ---------------------------------------------
        // Lock target SIM
        // ---------------------------------------------

        const [simRows] =
            await connection.query(
                `
                SELECT
                    s.id_sim,
                    s.id_sim_status,
                    ss.sim_status,
                    s.id_package

                FROM sim_cards s

                JOIN sim_status ss
                    ON s.id_sim_status =
                       ss.id_sim_status

                WHERE s.id_sim = ?
                  AND s.deleted_at IS NULL

                FOR UPDATE
                `,
                [id_sim]
            );

        if (!simRows.length) {
            await connection.rollback();
            connection.release();

            return res.status(404).json({
                success: false,
                message:
                    "Target SIM card not found",
            });
        }

        const targetSim = simRows[0];

        if (
            !isAvailableSimStatus(
                targetSim.sim_status
            ) &&
            Number(targetSim.id_sim) !==
                Number(
                    registrationRows[0]
                        .id_sim
                )
        ) {
            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    "Target SIM is not available",
            });
        }

        if (!targetSim.id_package) {
            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    "Target SIM does not have a Package assigned",
            });
        }

        // ---------------------------------------------
        // Prevent duplicate Pending registration
        // ---------------------------------------------

        const [duplicateRows] =
            await connection.query(
                `
                SELECT
                    id_registration

                FROM registrations

                WHERE id_sim = ?
                  AND id_registration_status = ?
                  AND id_registration <> ?
                  AND deleted_at IS NULL

                LIMIT 1
                `,
                [
                    id_sim,
                    pendingStatus.id_registration_status,
                    id,
                ]
            );

        if (duplicateRows.length) {
            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    "This SIM already has another pending registration",
            });
        }

        // ---------------------------------------------
        // Update
        // ---------------------------------------------

        await connection.query(
            `
            UPDATE registrations
            SET
                id_registration_status = ?,
                id_customer = ?,
                id_sim = ?,
                id_agent = ?,
                notes = ?,
                updated_at = NOW()

            WHERE id_registration = ?
            `,
            [
                pendingStatus.id_registration_status,
                id_customer,
                id_sim,
                id_agent,
                notes || null,
                id,
            ]
        );

        const [rows] =
            await connection.query(
                `
                SELECT
                    r.id_registration,
                    r.id_registration_status,
                    rs.status_name AS registration_status,

                    r.id_customer,

                    CONCAT(
                        COALESCE(c.first_name, ''),
                        ' ',
                        COALESCE(c.last_name, '')
                    ) AS customer_name,

                    c.passport_number,
                    c.passport_photo,

                    r.id_sim,
                    s.phone_number,
                    s.iccid,
                    s.imsi,

                    st.sim_type,

                    s.id_package,

                    p.package_name,
                    p.data_gb AS package_data_gb,
                    p.validity_days AS package_validity_days,
                    p.price AS package_price,

                    r.id_agent,
                    a.agent_name,

                    r.registered_at,
                    r.reviewed_by,
                    u.username AS reviewed_by_username,

                    r.reviewed_at,
                    r.notes,
                    r.created_at,
                    r.updated_at

                FROM registrations r

                LEFT JOIN registrations_status rs
                    ON r.id_registration_status =
                       rs.id_registration_status

                LEFT JOIN customers c
                    ON r.id_customer =
                       c.id_customer

                LEFT JOIN sim_cards s
                    ON r.id_sim =
                       s.id_sim

                LEFT JOIN sim_types st
                    ON s.id_sim_type =
                       st.id_sim_type

                LEFT JOIN packages p
                    ON s.id_package =
                       p.id_package

                LEFT JOIN agents a
                    ON r.id_agent =
                       a.id_agent

                LEFT JOIN users u
                    ON r.reviewed_by =
                       u.id_user

                WHERE r.id_registration = ?
                `,
                [id]
            );

        await connection.commit();
        connection.release();

        await createAuditLog({
            req,
            action: "UPDATE",
            targetEntity: "registrations",
            targetId: id,
            metadata: {
                id_customer,
                id_sim,
                id_agent,
                id_registration_status:
                    pendingStatus.id_registration_status,
            },
        }).catch((error) => {
            console.error(
                "UPDATE REGISTRATION AUDIT ERROR:",
                error
            );
        });

        return res.json({
            success: true,
            message:
                "Registration updated successfully",
            data: rows[0],
        });
    } catch (error) {
        try {
            await connection.rollback();
        } catch {}

        connection.release();

        console.error(
            "UPDATE REGISTRATION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message,
        });
    }
};

// =====================================================
// DELETE REGISTRATION
// =====================================================

const deleteRegistration = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] =
            await pool.query(
                `
                SELECT
                    id_registration,
                    id_registration_status,
                    id_sim
                FROM registrations
                WHERE id_registration = ?
                  AND deleted_at IS NULL
                LIMIT 1
                `,
                [id]
            );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message:
                    "Registration not found",
            });
        }

        const [result] =
            await pool.query(
                `
                UPDATE registrations
                SET
                    deleted_at = NOW(),
                    updated_at = NOW()

                WHERE id_registration = ?
                  AND deleted_at IS NULL
                `,
                [id]
            );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Registration not found",
            });
        }

        await createAuditLog({
            req,
            action: "DELETE",
            targetEntity: "registrations",
            targetId: id,
            metadata: {
                id_sim: rows[0].id_sim,
            },
        }).catch((error) => {
            console.error(
                "DELETE REGISTRATION AUDIT ERROR:",
                error
            );
        });

        return res.json({
            success: true,
            message:
                "Registration deleted successfully",
        });
    } catch (error) {
        console.error(
            "DELETE REGISTRATION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Database error",
        });
    }
};

// =====================================================
// REVIEW REGISTRATION
// =====================================================

const reviewRegistration = async (
    req,
    res,
    approved
) => {
    const connection =
        await pool.getConnection();

    try {
        const { id } = req.params;
        const note =
            req.body?.notes || null;

        const roleId =
            Number(req.user?.id_role);

        // ---------------------------------------------
        // Only Super Admin/Admin role 1
        // ---------------------------------------------

        if (roleId !== 1) {
            connection.release();

            return res.status(403).json({
                success: false,
                message:
                    "Only Admin can approve or reject registrations",
            });
        }

        await connection.beginTransaction();

        // ---------------------------------------------
        // Get registration
        // ---------------------------------------------

        const [rows] =
            await connection.query(
                `
                SELECT
                    r.id_registration,
                    r.id_sim,
                    r.id_registration_status,

                    s.id_sim_status,
                    ss.sim_status

                FROM registrations r

                JOIN sim_cards s
                    ON r.id_sim = s.id_sim

                JOIN sim_status ss
                    ON s.id_sim_status =
                       ss.id_sim_status

                WHERE r.id_registration = ?
                  AND r.deleted_at IS NULL

                FOR UPDATE
                `,
                [id]
            );

        if (!rows.length) {
            await connection.rollback();
            connection.release();

            return res.status(404).json({
                success: false,
                message:
                    "Registration not found",
            });
        }

        // ---------------------------------------------
        // Find registration status IDs
        // ---------------------------------------------

        const registrationStatusRows =
            await findRegistrationStatusId(
                connection,
                [
                    "Pending",
                    "Approved",
                    "Rejected",
                ]
            );

        const pendingStatus =
            registrationStatusRows.find(
                (row) =>
                    normalizeStatus(
                        row.status_name
                    ) === "pending"
            );

        const approvedStatus =
            registrationStatusRows.find(
                (row) =>
                    normalizeStatus(
                        row.status_name
                    ) === "approved"
            );

        const rejectedStatus =
            registrationStatusRows.find(
                (row) =>
                    normalizeStatus(
                        row.status_name
                    ) === "rejected"
            );

        if (
            !pendingStatus ||
            !approvedStatus ||
            !rejectedStatus
        ) {
            throw new Error(
                "Approved/Rejected/Pending registration statuses are not configured"
            );
        }

        // ---------------------------------------------
        // Only Pending can be reviewed
        // ---------------------------------------------

        if (
            Number(
                rows[0].id_registration_status
            ) !==
            Number(
                pendingStatus.id_registration_status
            )
        ) {
            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    "Only Pending registrations can be reviewed",
            });
        }

        // ---------------------------------------------
        // Find target SIM status
        // ---------------------------------------------

        let targetSimStatusId;

        if (approved) {
            targetSimStatusId =
                await findSimStatusId(
                    connection,
                    [
                        "registered",
                        "active",
                    ]
                );
        } else {
            targetSimStatusId =
                await findSimStatusId(
                    connection,
                    [
                        "available",
                        "ready for sale",
                        "ready_to_sale",
                        "ready-to-sale",
                        "ວ່າງ",
                        "ພ້ອມຂາຍ",
                    ]
                );
        }

        if (!targetSimStatusId) {
            throw new Error(
                approved
                    ? "Registered SIM status is not configured"
                    : "Available SIM status is not configured"
            );
        }

        // ---------------------------------------------
        // IMPORTANT:
        // registration status ID
        // and SIM status ID are DIFFERENT.
        // ---------------------------------------------

        const targetRegistrationStatusId =
            approved
                ? approvedStatus.id_registration_status
                : rejectedStatus.id_registration_status;

        // ---------------------------------------------
        // UPDATE REGISTRATION
        // ---------------------------------------------

        await connection.query(
            `
            UPDATE registrations

            SET
                id_registration_status = ?,
                reviewed_by = ?,
                reviewed_at = NOW(),
                notes = COALESCE(?, notes),
                updated_at = NOW()

            WHERE id_registration = ?
            `,
            [
                targetRegistrationStatusId,
                req.user.id_user,
                note,
                id,
            ]
        );

        // ---------------------------------------------
        // UPDATE SIM
        // ---------------------------------------------

        await connection.query(
            `
            UPDATE sim_cards

            SET
                id_sim_status = ?,
                updated_at = NOW()

            WHERE id_sim = ?
            `,
            [
                targetSimStatusId,
                rows[0].id_sim,
            ]
        );

        await connection.commit();
        connection.release();

        // ---------------------------------------------
        // AUDIT
        // ---------------------------------------------

        await createAuditLog({
            req,
            action:
                approved
                    ? "APPROVE"
                    : "REJECT",
            targetEntity:
                "registrations",
            targetId: id,
            metadata: {
                id_sim:
                    rows[0].id_sim,

                reviewed_by:
                    req.user.id_user,

                registration_status:
                    targetRegistrationStatusId,

                sim_status:
                    targetSimStatusId,
            },
        }).catch((error) => {
            console.error(
                "REVIEW AUDIT ERROR:",
                error
            );
        });

        return res.json({
            success: true,
            message:
                approved
                    ? "Registration approved successfully"
                    : "Registration rejected successfully",
        });
    } catch (error) {
        try {
            await connection.rollback();
        } catch {}

        connection.release();

        console.error(
            "REVIEW REGISTRATION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Database error",
        });
    }
};

// =====================================================
// APPROVE
// =====================================================

const approveRegistration = (
    req,
    res
) =>
    reviewRegistration(
        req,
        res,
        true
    );

// =====================================================
// REJECT
// =====================================================

const rejectRegistration = (
    req,
    res
) =>
    reviewRegistration(
        req,
        res,
        false
    );

// =====================================================
// EXPORT
// =====================================================

module.exports = {
    getAllRegistrations,
    getAvailableSims,
    getRegistrationById,
    createRegistration,
    updateRegistration,
    deleteRegistration,
    approveRegistration,
    rejectRegistration,
};