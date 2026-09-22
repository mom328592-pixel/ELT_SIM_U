const pool = require("../db");
// =========================
// GET ALL SIM CARDS
// =========================
const getAllSims = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                s.id_sim,
                s.iccid,
                s.imsi,
                s.qr_code,
                s.id_package,
                p.package_name,
                p.duration_days AS package_duration_days,
                p.price AS package_price,
                p.currency AS package_currency,
                s.package,
                s.phone_number,

                s.id_sim_type,
                st.sim_type,

                s.id_sim_status,
                ss.sim_status,

                s.imported_by,
                u.username AS imported_by_username,

                s.id_file,
                f.file_name,
                f.id_agent,
                a.agent_name,

                s.imported_at,
                s.link_url,
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

            WHERE s.deleted_at IS NULL

            ORDER BY s.id_sim ASC
        `);

        res.json({
            success: true,
            message: "SIM cards retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error("GET /sim ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =========================
// GET SIM BY ID
// =========================
const getSimById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(`
            SELECT
                s.id_sim,
                s.iccid,
                s.imsi,
                s.qr_code,
                s.id_package,
                p.package_name,
                p.duration_days AS package_duration_days,
                p.price AS package_price,
                p.currency AS package_currency,
                s.package,
                s.phone_number,

                s.id_sim_type,
                st.sim_type,

                s.id_sim_status,
                ss.sim_status,

                s.imported_by,
                u.username AS imported_by_username,

                s.id_file,
                f.file_name,
                f.id_agent,
                a.agent_name,

                s.imported_at,
                s.link_url,
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

            WHERE s.id_sim = ?
              AND s.deleted_at IS NULL
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "SIM card not found"
            });
        }

        res.json({
            success: true,
            message: "SIM card retrieved successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("GET /sim/:id ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =========================
// CREATE SIM CARD
// =========================
const createSim = async (req, res) => {
    try {
        const {
            iccid,
            imsi,
            qr_code,
            package: simPackage,
            id_package,
            phone_number,
            id_sim_type,
            id_sim_status,
            imported_by,
            id_file,
            imported_at,
            link_url
        } = req.body;

        if (!iccid || !imsi) {
            return res.status(400).json({
                success: false,
                message: "iccid and imsi are required"
            });
        }

        // Check file if id_file is provided
        if (id_file) {
            const [fileRows] = await pool.query(`
                SELECT id_file, file_name, id_agent
                FROM history_sim_card_file
                WHERE id_file = ?
            `, [id_file]);

            if (fileRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "File history not found"
                });
            }
        }

        const [result] = await pool.query(`
            INSERT INTO sim_cards (
                iccid,
                imsi,
                qr_code,
                id_package,
                package,
                phone_number,
                id_sim_type,
                id_sim_status,
                imported_by,
                id_file,
                imported_at,
                link_url
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            iccid,
            imsi,
            qr_code || null,
            id_package || null,
            simPackage || null,
            phone_number || null,
            id_sim_type || null,
            id_sim_status || null,
            imported_by || null,
            id_file || null,
            imported_at || null,
            link_url || null
        ]);

        const [rows] = await pool.query(`
            SELECT
                s.id_sim,
                s.iccid,
                s.imsi,
                s.qr_code,
                s.id_package,
                p.package_name,
                p.duration_days AS package_duration_days,
                p.price AS package_price,
                p.currency AS package_currency,
                s.package,
                s.phone_number,

                s.id_sim_type,
                st.sim_type,

                s.id_sim_status,
                ss.sim_status,

                s.imported_by,
                u.username AS imported_by_username,

                s.id_file,
                f.file_name,
                f.id_agent,
                a.agent_name,

                s.imported_at,
                s.link_url,
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

            WHERE s.id_sim = ?
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: "SIM card created successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("POST /sim ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "ICCID or IMSI already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =========================
// UPDATE SIM CARD
// =========================
const updateSim = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            iccid,
            imsi,
            qr_code,
            package: simPackage,
            id_package,
            phone_number,
            id_sim_type,
            id_sim_status,
            imported_by,
            id_file,
            imported_at,
            link_url
        } = req.body;

        if (!iccid || !imsi) {
            return res.status(400).json({
                success: false,
                message: "iccid and imsi are required"
            });
        }

        // Check file
        if (id_file) {
            const [fileRows] = await pool.query(`
                SELECT id_file
                FROM history_sim_card_file
                WHERE id_file = ?
            `, [id_file]);

            if (fileRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "File history not found"
                });
            }
        }

        const [result] = await pool.query(`
            UPDATE sim_cards
            SET
                iccid = ?,
                imsi = ?,
                qr_code = ?,
                id_package = ?,
                package = ?,
                phone_number = ?,
                id_sim_type = ?,
                id_sim_status = ?,
                imported_by = ?,
                id_file = ?,
                imported_at = ?,
                link_url = ?
            WHERE id_sim = ?
              AND deleted_at IS NULL
        `, [
            iccid,
            imsi,
            qr_code || null,
            id_package || null,
            simPackage || null,
            phone_number || null,
            id_sim_type || null,
            id_sim_status || null,
            imported_by || null,
            id_file || null,
            imported_at || null,
            link_url || null,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "SIM card not found"
            });
        }

        const [rows] = await pool.query(`
            SELECT
                s.id_sim,
                s.iccid,
                s.imsi,
                s.qr_code,
                s.id_package,
                p.package_name,
                p.duration_days AS package_duration_days,
                p.price AS package_price,
                p.currency AS package_currency,
                s.package,
                s.phone_number,

                s.id_sim_type,
                st.sim_type,

                s.id_sim_status,
                ss.sim_status,

                s.imported_by,
                u.username AS imported_by_username,

                s.id_file,
                f.file_name,
                f.id_agent,
                a.agent_name,

                s.imported_at,
                s.link_url,
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

            WHERE s.id_sim = ?
        `, [id]);

        res.json({
            success: true,
            message: "SIM card updated successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("PUT /sim/:id ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "ICCID or IMSI already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =========================
// DELETE SIM CARD
// =========================
const deleteSim = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(`
            UPDATE sim_cards
            SET deleted_at = NOW()
            WHERE id_sim = ?
              AND deleted_at IS NULL
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "SIM card not found"
            });
        }

        res.json({
            success: true,
            message: "SIM card deleted successfully"
        });

    } catch (error) {
        console.error("DELETE /sim/:id ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};
// =========================
// GET AVAILABLE SIM CARDS
// =========================
const getAvailableSims = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                s.id_sim,
                s.iccid,
                s.imsi,
                s.qr_code,
                s.id_package,
                p.package_name,
                p.duration_days AS package_duration_days,
                p.price AS package_price,
                p.currency AS package_currency,
                s.package,
                s.phone_number,
                s.id_sim_type,
                st.sim_type,
                s.id_sim_status,
                ss.sim_status,
                s.imported_at,
                s.link_url,
                s.created_at,
                s.updated_at
            FROM sim_cards s

            LEFT JOIN packages p
                ON s.id_package = p.id_package

            LEFT JOIN sim_types st
                ON s.id_sim_type = st.id_sim_type

            LEFT JOIN sim_status ss
                ON s.id_sim_status = ss.id_sim_status

            WHERE s.deleted_at IS NULL
              AND (
                  LOWER(ss.sim_status) = 'available'
                  OR LOWER(ss.sim_status) = 'ວ່າງ'
              )

            ORDER BY s.id_sim ASC
        `);

        res.json({
            success: true,
            message: "Available SIM cards retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error("GET /public/sims/available ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


module.exports = {
    getAvailableSims,
    getAllSims,
    getSimById,
    createSim,
    updateSim,
    deleteSim
};