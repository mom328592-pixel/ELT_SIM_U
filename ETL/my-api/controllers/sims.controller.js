const pool = require("../db");
const { createAuditLog } = require("../utils/audit");

// =====================================================
// COMMON SELECT
// =====================================================

const SIM_SELECT = `
    SELECT
        s.id_sim,
        s.iccid,
        s.imsi,
        s.qr_code,
        s.activation_code,
        s.phone_number,

        s.id_sim_type,
        st.sim_type,

        s.id_package,
        p.package_name,
        p.description AS package_description,
        p.data_gb AS package_data_gb,
        p.validity_days AS package_duration_days,
        p.price AS package_price,

        s.id_sim_status,
        ss.sim_status,

        s.imported_by,
        u.username AS imported_by_username,

        s.id_file,
        f.file_name,
        f.id_agent,
        a.agent_name,

        s.imported_at,
        s.created_at,
        s.updated_at

    FROM sim_cards s

    LEFT JOIN packages p
        ON s.id_package = p.id_package

    LEFT JOIN sim_types st
        ON s.id_sim_type = st.id_sim_type

    LEFT JOIN sim_status ss
        ON s.id_sim_status = ss.id_sim_status

    LEFT JOIN users u
        ON s.imported_by = u.id_user

    LEFT JOIN history_sim_card_file f
        ON s.id_file = f.id_file

    LEFT JOIN agents a
        ON f.id_agent = a.id_agent
`;


// =====================================================
// NORMALIZE STATUS
// =====================================================

const normalizeStatus = (value) => {
    return String(value || "")
        .trim()
        .toLowerCase();
};


// =====================================================
// AVAILABLE STATUS
// =====================================================

const isAvailableStatus = (value) => {
    return [
        "available",
        "ready for sale",
        "ready_to_sale",
        "ready-to-sale",
        "ວ່າງ",
        "ພ້ອມຂາຍ"
    ].includes(normalizeStatus(value));
};


// =====================================================
// VALIDATE PACKAGE
// =====================================================

const validatePackage = async (
    connection,
    id_package,
    id_sim_type
) => {
    if (!id_package) {
        return null;
    }

    const [rows] = await connection.query(
        `
        SELECT
            p.id_package,
            p.package_name,
            p.sim_type AS package_sim_type,
            p.status
        FROM packages p
        WHERE p.id_package = ?
          AND p.status = 1
        LIMIT 1
        `,
        [id_package]
    );

    if (!rows.length) {
        throw new Error("Package not found or inactive");
    }

    if (id_sim_type) {
        const [typeRows] = await connection.query(
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

        if (!typeRows.length) {
            throw new Error("SIM type not found");
        }

        const packageType = normalizeStatus(
            rows[0].package_sim_type
        );

        const simType = normalizeStatus(
            typeRows[0].sim_type
        );

        if (
            packageType &&
            simType &&
            packageType !== simType
        ) {
            throw new Error(
                `Package "${rows[0].package_name}" does not belong to SIM type "${typeRows[0].sim_type}"`
            );
        }
    }

    return rows[0];
};


// =====================================================
// GET ALL SIMS
// =====================================================

const getAllSims = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            ${SIM_SELECT}
            WHERE s.deleted_at IS NULL
            ORDER BY s.id_sim ASC
        `);

        return res.json({
            success: true,
            message: "SIM cards retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error("GET ALL SIMS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// GET SIM BY ID
// =====================================================

const getSimById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            `
            ${SIM_SELECT}
            WHERE s.id_sim = ?
              AND s.deleted_at IS NULL
            LIMIT 1
            `,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "SIM card not found"
            });
        }

        return res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error("GET SIM BY ID ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// CREATE SIM
// =====================================================

const createSim = async (req, res) => {
    let connection;

    try {
        const {
            iccid,
            imsi,
            qr_code,
            activation_code,
            id_package,
            phone_number,
            id_sim_type,
            id_sim_status,
            id_file,
            imported_at
        } = req.body;

        const cleanIccid = String(iccid || "").trim();
        const cleanImsi = String(imsi || "").trim();

        if (!cleanIccid) {
            return res.status(400).json({
                success: false,
                message: "ICCID is required"
            });
        }

        if (!cleanImsi) {
            return res.status(400).json({
                success: false,
                message: "IMSI is required"
            });
        }

        if (!id_package) {
            return res.status(400).json({
                success: false,
                message: "Package is required for SIM"
            });
        }

        connection = await pool.getConnection();

        await validatePackage(
            connection,
            Number(id_package),
            id_sim_type
        );

        if (id_file) {
            const [fileRows] = await connection.query(
                `
                SELECT id_file
                FROM history_sim_card_file
                WHERE id_file = ?
                LIMIT 1
                `,
                [id_file]
            );

            if (!fileRows.length) {
                return res.status(404).json({
                    success: false,
                    message: "File history not found"
                });
            }
        }

        const [result] = await connection.query(
            `
            INSERT INTO sim_cards (
                iccid,
                imsi,
                qr_code,
                activation_code,
                phone_number,
                id_sim_type,
                id_package,
                id_sim_status,
                imported_by,
                id_file,
                imported_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                cleanIccid,
                cleanImsi,
                qr_code || null,
                activation_code || null,
                phone_number || null,
                id_sim_type || null,
                Number(id_package),
                id_sim_status || 1,
                req.user?.id_user || null,
                id_file || null,
                imported_at || null
            ]
        );

        const [rows] = await connection.query(
            `
            ${SIM_SELECT}
            WHERE s.id_sim = ?
            LIMIT 1
            `,
            [result.insertId]
        );

        await createAuditLog({
            req,
            action: "CREATE",
            targetEntity: "sim_cards",
            targetId: result.insertId,
            metadata: {
                iccid: cleanIccid,
                imsi: cleanImsi,
                id_package: Number(id_package)
            }
        });

        return res.status(201).json({
            success: true,
            message: "SIM card created successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("CREATE SIM ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "ICCID or IMSI already exists"
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};


// =====================================================
// UPDATE SIM
// =====================================================

const updateSim = async (req, res) => {
    let connection;

    try {
        const { id } = req.params;

        const {
            iccid,
            imsi,
            qr_code,
            activation_code,
            id_package,
            phone_number,
            id_sim_type,
            id_sim_status,
            id_file,
            imported_at
        } = req.body;

        const cleanIccid = String(iccid || "").trim();
        const cleanImsi = String(imsi || "").trim();

        if (!cleanIccid) {
            return res.status(400).json({
                success: false,
                message: "ICCID is required"
            });
        }

        if (!cleanImsi) {
            return res.status(400).json({
                success: false,
                message: "IMSI is required"
            });
        }

        if (!id_package) {
            return res.status(400).json({
                success: false,
                message: "Package is required for SIM"
            });
        }

        connection = await pool.getConnection();

        const [oldRows] = await connection.query(
            `
            SELECT *
            FROM sim_cards
            WHERE id_sim = ?
              AND deleted_at IS NULL
            FOR UPDATE
            `,
            [id]
        );

        if (!oldRows.length) {
            return res.status(404).json({
                success: false,
                message: "SIM card not found"
            });
        }

        await validatePackage(
            connection,
            Number(id_package),
            id_sim_type
        );

        if (id_file) {
            const [fileRows] = await connection.query(
                `
                SELECT id_file
                FROM history_sim_card_file
                WHERE id_file = ?
                LIMIT 1
                `,
                [id_file]
            );

            if (!fileRows.length) {
                return res.status(404).json({
                    success: false,
                    message: "File history not found"
                });
            }
        }

        await connection.query(
            `
            UPDATE sim_cards
            SET
                iccid = ?,
                imsi = ?,
                qr_code = ?,
                activation_code = ?,
                phone_number = ?,
                id_sim_type = ?,
                id_package = ?,
                id_sim_status = ?,
                imported_by = COALESCE(?, imported_by),
                id_file = ?,
                imported_at = ?,
                updated_at = NOW()
            WHERE id_sim = ?
              AND deleted_at IS NULL
            `,
            [
                cleanIccid,
                cleanImsi,
                qr_code || null,
                activation_code || null,
                phone_number || null,
                id_sim_type || null,
                Number(id_package),
                id_sim_status || 1,
                req.user?.id_user || null,
                id_file || null,
                imported_at || null,
                id
            ]
        );

        const [rows] = await connection.query(
            `
            ${SIM_SELECT}
            WHERE s.id_sim = ?
            LIMIT 1
            `,
            [id]
        );

        await createAuditLog({
            req,
            action: "UPDATE",
            targetEntity: "sim_cards",
            targetId: id,
            metadata: {
                old: {
                    iccid: oldRows[0].iccid,
                    imsi: oldRows[0].imsi,
                    id_package: oldRows[0].id_package
                },
                new: {
                    iccid: cleanIccid,
                    imsi: cleanImsi,
                    id_package: Number(id_package)
                }
            }
        });

        return res.json({
            success: true,
            message: "SIM card updated successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("UPDATE SIM ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "ICCID or IMSI already exists"
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};


// =====================================================
// DELETE SIM
// =====================================================

const deleteSim = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            `
            SELECT
                s.id_sim,
                ss.sim_status,
                COUNT(r.id_registration) AS registration_count
            FROM sim_cards s
            LEFT JOIN sim_status ss
                ON s.id_sim_status = ss.id_sim_status
            LEFT JOIN registrations r
                ON r.id_sim = s.id_sim
               AND r.deleted_at IS NULL
            WHERE s.id_sim = ?
              AND s.deleted_at IS NULL
            GROUP BY
                s.id_sim,
                ss.sim_status
            `,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "SIM card not found"
            });
        }

        if (!isAvailableStatus(rows[0].sim_status)) {
            return res.status(409).json({
                success: false,
                message:
                    "Only unused/available SIM cards can be deleted"
            });
        }

        if (Number(rows[0].registration_count) > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "Cannot delete a SIM that has a registration"
            });
        }

        await pool.query(
            `
            UPDATE sim_cards
            SET deleted_at = NOW()
            WHERE id_sim = ?
              AND deleted_at IS NULL
            `,
            [id]
        );

        await createAuditLog({
            req,
            action: "DELETE",
            targetEntity: "sim_cards",
            targetId: id
        });

        return res.json({
            success: true,
            message: "SIM card deleted successfully"
        });

    } catch (error) {
        console.error("DELETE SIM ERROR:", error);

        return res.status(500).json({
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

        const [rows] = await pool.query(
            `
            SELECT
                s.id_sim,
                s.iccid,
                s.imsi,
                s.phone_number,

                s.id_sim_type,
                st.sim_type,

                s.id_package,
                p.package_name,
                p.data_gb AS package_data_gb,
                p.validity_days AS package_duration_days,
                p.price AS package_price,

                s.id_sim_status,
                ss.sim_status

            FROM sim_cards s

            INNER JOIN sim_status ss
                ON s.id_sim_status = ss.id_sim_status

            LEFT JOIN sim_types st
                ON s.id_sim_type = st.id_sim_type

            LEFT JOIN packages p
                ON s.id_package = p.id_package

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

            ORDER BY s.id_sim ASC
            `,
            [id_sim_type]
        );

        return res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error("GET AVAILABLE SIMS ERROR:", error);

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
    getAvailableSims,
    getAllSims,
    getSimById,
    createSim,
    updateSim,
    deleteSim
};