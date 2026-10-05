const pool = require("../db");
const { createAuditLog } = require("../utils/audit");


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
                    c.first_name,
                    ' ',
                    c.last_name
                ) AS customer_name,

                c.passport_number,

                r.id_sim,

                s.phone_number,
                s.iccid,
                s.imsi,

                s.id_sim_type,
                st.sim_type,

                s.id_package,

                p.package_name,
                p.data_gb AS package_data_gb,
                p.validity_days AS package_duration_days,
                p.price AS package_price,
                NULL AS package_currency,

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

            LEFT JOIN packages p
                ON s.id_package = p.id_package

            LEFT JOIN agents a
                ON r.id_agent = a.id_agent

            LEFT JOIN users u
                ON r.reviewed_by = u.id_user

            WHERE r.deleted_at IS NULL

            ORDER BY r.created_at DESC
        `);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error(
            "GET ALL REGISTRATIONS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error"
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
                message: "SIM type is required"
            });
        }

       const [rows] = await pool.query(`
    SELECT
        s.id_sim,
        s.phone_number,
        s.iccid,
        s.imsi,

        s.id_sim_type,
        st.sim_type,

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

      AND LOWER(ss.sim_status) IN (
          'available',
          'ready for sale',
          'ວ່າງ',
          'ພ້ອມຂາຍ'
      )

      AND s.deleted_at IS NULL

      AND s.id_package IS NOT NULL

    ORDER BY s.id_sim ASC
`, [id_sim_type]);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error(
            "GET AVAILABLE SIMS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// GET REGISTRATION BY ID
// =====================================================

const getRegistrationById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(`
    SELECT
        r.id_registration,
        r.id_registration_status,
        rs.status_name AS registration_status,

        r.id_customer,

        CONCAT(
            c.first_name,
            ' ',
            c.last_name
        ) AS customer_name,

        c.passport_number,

        r.id_sim,

        s.phone_number,
        s.iccid,
        s.imsi,

        s.id_sim_type,
        st.sim_type,

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
`, [id]);

        if (!rows.length) {
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
        console.error(
            "GET REGISTRATION BY ID ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// CREATE REGISTRATION
// =====================================================

const createRegistration = async (req, res) => {
    const connection =
        await pool.getConnection();

    try {
        const {
    id_registration_status = 1,
    id_customer,
    id_sim,
    id_agent,
    registered_at,
    notes
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
                    "id_customer, id_sim and id_agent are required"
            });
        }

        await connection.beginTransaction();


        // ---------------------------------------------
        // Lock SIM
        // ---------------------------------------------

        const [simRows] =
            await connection.query(`
                SELECT
                    s.id_sim,
                    s.iccid,
                    s.imsi,
                    s.id_package,
                    s.id_sim_type,

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
            `, [id_sim]);


        if (!simRows.length) {
            await connection.rollback();
            connection.release();

            return res.status(404).json({
                success: false,
                message: "SIM card not found"
            });
        }


        const sim = simRows[0];


        // ---------------------------------------------
        // Check SIM Available
        // ---------------------------------------------

        if (
            String(sim.sim_status)
                .toLowerCase() !==
            "available"
        ) {
            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    `SIM is not available. Current status: ${sim.sim_status}`
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
                    "This SIM does not have a Package assigned"
            });
        }


        // ---------------------------------------------
        // INSERT REGISTRATION
        // ---------------------------------------------
        // NOTE:
        // NO id_package here.
        // Package comes from sim_cards.id_package.
        // ---------------------------------------------

        const [result] = await connection.query(`
    INSERT INTO registrations (
        id_registration_status,
        id_customer,
        id_sim,
        id_agent,
        registered_at,
        notes
    )
    VALUES (?, ?, ?, ?, ?, ?)
`, [
    id_registration_status,
    id_customer,
    id_sim,
    id_agent,
    registered_at || new Date(),
    notes || null
]);


        const newId = result.insertId;


        // ---------------------------------------------
        // Return SIM to registered workflow
        // Pending registration remains available
        // until approval.
        // ---------------------------------------------

        const [rows] =
            await connection.query(`
                SELECT
                    r.id_registration,
                    r.id_registration_status,

                    rs.status_name
                        AS registration_status,

                    r.id_customer,

                    CONCAT(
                        c.first_name,
                        ' ',
                        c.last_name
                    ) AS customer_name,

                    c.passport_number,

                    r.id_sim,

                    s.phone_number,
                    s.iccid,
                    s.imsi,

                    st.sim_type,

                    s.id_package,

                    p.package_name,
                    p.data_gb
                        AS package_data_gb,
                    p.validity_days
                        AS package_validity_days,
                    p.price
                        AS package_price,

                    r.id_agent,
                    a.agent_name,

                    r.registered_at,
                    r.reviewed_by,
                    u.username
                        AS reviewed_by_username,

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
            `, [newId]);


        await connection.commit();
        connection.release();


        // ---------------------------------------------
        // AUDIT LOG
        // ---------------------------------------------

        await createAuditLog({
            req,
            action: "CREATE",
            targetEntity: "registrations",
            targetId: newId,
            metadata: {
                id_customer,
                id_sim,
                id_agent,
                id_registration_status
            }
        }).catch(error => {
            console.error(
                "Audit Log Error:",
                error
            );
        });


        res.status(201).json({
            success: true,
            message:
                "Registration created successfully",
            data: rows[0]
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

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =====================================================
// UPDATE REGISTRATION
// =====================================================

const updateRegistration = async (req, res) => {
    const connection =
        await pool.getConnection();

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
                    "id_registration_status, id_customer, id_sim and id_agent are required"
            });
        }


        const statusId =
            Number(id_registration_status);


        // Only Admin can approve/reject
        if (
            [2, 3].includes(statusId) &&
            Number(req.user?.id_role) !== 1
        ) {
            connection.release();

            return res.status(403).json({
                success: false,
                message:
                    "Only Admin can approve or reject registrations"
            });
        }


        await connection.beginTransaction();


        const [registrationRows] =
            await connection.query(`
                SELECT
                    id_registration,
                    id_agent
                FROM registrations
                WHERE id_registration = ?
                  AND deleted_at IS NULL
                FOR UPDATE
            `, [id]);


        if (!registrationRows.length) {
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

                reviewed_at =
                    CASE
                        WHEN ? IN (2, 3)
                        THEN NOW()
                        ELSE reviewed_at
                    END,

                notes = ?,
                updated_at = NOW()

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


        // ---------------------------------------------
        // APPROVE
        // ---------------------------------------------

        if (statusId === 2) {

            await connection.query(`
                UPDATE sim_cards
                SET
                    id_sim_status = 2,
                    updated_at = NOW()
                WHERE id_sim = ?
            `, [id_sim]);

            auditAction = "APPROVE";
        }


        // ---------------------------------------------
        // REJECT
        // ---------------------------------------------

        else if (statusId === 3) {

            await connection.query(`
                UPDATE sim_cards
                SET
                    id_sim_status = 1,
                    updated_at = NOW()
                WHERE id_sim = ?
            `, [id_sim]);

            auditAction = "REJECT";
        }


        const [rows] =
            await connection.query(`
                SELECT
                    r.id_registration,
                    r.id_registration_status,

                    rs.status_name
                        AS registration_status,

                    r.id_customer,

                    CONCAT(
                        c.first_name,
                        ' ',
                        c.last_name
                    ) AS customer_name,

                    c.passport_number,

                    r.id_sim,

                    s.phone_number,
                    s.iccid,
                    s.imsi,

                    st.sim_type,

                    s.id_package,

                    p.package_name,
                    p.data_gb
                        AS package_data_gb,
                    p.validity_days
                        AS package_validity_days,
                    p.price
                        AS package_price,

                    r.id_agent,
                    a.agent_name,

                    r.registered_at,
                    r.reviewed_by,

                    u.username
                        AS reviewed_by_username,

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
            `, [id]);


        await connection.commit();
        connection.release();


        // ---------------------------------------------
        // AUDIT ONLY
        // NO NOTIFICATION
        // ---------------------------------------------

        createAuditLog({
            req,
            action: auditAction,
            targetEntity: "registrations",
            targetId: id,
            metadata: {
                id_customer,
                id_sim,
                id_agent,
                id_registration_status:
                    statusId
            }
        }).catch(error => {
            console.error(
                "Audit log failed:",
                error
            );
        });


        res.json({
            success: true,

            message:
                statusId === 2
                    ? "Registration approved successfully"
                    : statusId === 3
                    ? "Registration rejected successfully"
                    : "Registration updated successfully",

            data: rows[0]
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

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =====================================================
// DELETE REGISTRATION
// =====================================================

const deleteRegistration = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] =
            await pool.query(`
                UPDATE registrations

                SET deleted_at = NOW()

                WHERE id_registration = ?

                  AND deleted_at IS NULL
            `, [id]);


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
            message:
                "Registration deleted successfully"
        });

    } catch (error) {

        console.error(
            "DELETE REGISTRATION ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// APPROVE / REJECT HELPER
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


        await connection.beginTransaction();


        const [rows] =
            await connection.query(`
                SELECT
                    r.id_registration,
                    r.id_sim,
                    r.id_registration_status,
                    s.id_sim_status

                FROM registrations r

                JOIN sim_cards s
                    ON r.id_sim = s.id_sim

                WHERE r.id_registration = ?

                  AND r.deleted_at IS NULL

                FOR UPDATE
            `, [id]);


        if (!rows.length) {

            await connection.rollback();
            connection.release();

            return res.status(404).json({
                success: false,
                message:
                    "Registration not found"
            });
        }


        const [registrationStatusRows] =
    await connection.query(`
        SELECT
            id_registration_status,
            status_name
        FROM registrations_status
        WHERE LOWER(status_name) IN (
            'approved',
            'rejected'
        )
    `);

const approvedStatus =
    registrationStatusRows.find(
        row =>
            row.status_name.toLowerCase() ===
            "approved"
    );

const rejectedStatus =
    registrationStatusRows.find(
        row =>
            row.status_name.toLowerCase() ===
            "rejected"
    );

if (!approvedStatus || !rejectedStatus) {

    throw new Error(
        "Approved/Rejected registration statuses are not configured"
    );
}

const targetSimStatusName =
    approved
        ? "registered"
        : "available";

const [simStatusRows] =
    await connection.query(`
        SELECT id_sim_status
        FROM sim_status
        WHERE LOWER(sim_status) = ?
        LIMIT 1
    `, [targetSimStatusName]);

if (!simStatusRows.length) {
    throw new Error(
        `${targetSimStatusName} SIM status is not configured`
    );
}

const targetStatus =
    simStatusRows[0].id_sim_status;


        if (
            Number(
                rows[0].id_registration_status
            ) !== 1
        ) {

            await connection.rollback();
            connection.release();

            return res.status(409).json({
                success: false,
                message:
                    "Only Pending registrations can be reviewed"
            });
        }


        // ---------------------------------------------
        // UPDATE REGISTRATION
        // ---------------------------------------------

        await connection.query(`
    UPDATE registrations
    SET
        id_registration_status = ?,
        reviewed_by = ?,
        reviewed_at = NOW(),
        notes = COALESCE(?, notes),
        updated_at = NOW()
    WHERE id_registration = ?
`, [
    targetStatus,
    req.user.id_user,
    note,
    id
]);

await connection.query(`
    UPDATE sim_cards
    SET
        id_sim_status = ?,
        updated_at = NOW()
    WHERE id_sim = ?
`, [
    targetSimStatus,
    rows[0].id_sim
]);

        // ---------------------------------------------
        // UPDATE SIM STATUS
        // ---------------------------------------------

        await connection.query(`
            UPDATE sim_cards

            SET
                id_sim_status = ?,
                updated_at = NOW()

            WHERE id_sim = ?
        `, [
            simStatus,
            rows[0].id_sim
        ]);


        await connection.commit();
        connection.release();


        // ---------------------------------------------
        // AUDIT LOG
        // NO NOTIFICATION
        // ---------------------------------------------

        createAuditLog({
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
                    rows[0].id_sim
            }

        }).catch(error => {
            console.error(
                "Audit Log Error:",
                error
            );
        });


        res.json({
            success: true,

            message:
                approved
                    ? "Registration approved successfully"
                    : "Registration rejected successfully"
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

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =====================================================
// APPROVE
// =====================================================

const approveRegistration =
    (req, res) =>
        reviewRegistration(
            req,
            res,
            true
        );


// =====================================================
// REJECT
// =====================================================

const rejectRegistration =
    (req, res) =>
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
    rejectRegistration
};