const pool = require("../db");
const { createAuditLog } = require("../utils/audit");

// =========================
// GET ALL FILE HISTORY
// =========================
const getAllFiles = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                f.id_file,
                f.file_name,
                f.id_agent,
                a.agent_name,
                f.created_at,
                f.updated_at
            FROM history_sim_card_file f
            LEFT JOIN agents a
                ON f.id_agent = a.id_agent
            ORDER BY f.id_file DESC
        `);

        res.json({
            success: true,
            message: "SIM file history retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error("GET /sim-files ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// =========================
// GET FILE BY ID
// =========================
const getFileById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(`
            SELECT
                f.id_file,
                f.file_name,
                f.id_agent,
                a.agent_name,
                f.created_at,
                f.updated_at
            FROM history_sim_card_file f
            LEFT JOIN agents a
                ON f.id_agent = a.id_agent
            WHERE f.id_file = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "File history not found"
            });
        }

        res.json({
            success: true,
            message: "SIM file history retrieved successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("GET /sim-files/:id ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// =========================
// CREATE FILE HISTORY
// =========================
const createFile = async (req, res) => {
    try {
        const { file_name, id_agent } = req.body;

        if (!file_name || !id_agent) {
            return res.status(400).json({
                success: false,
                message: "file_name and id_agent are required"
            });
        }

        const [agentRows] = await pool.query(`
            SELECT
                id_agent,
                agent_name
            FROM agents
            WHERE id_agent = ?
              AND deleted_at IS NULL
        `, [id_agent]);

        if (agentRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }

        const [result] = await pool.query(`
            INSERT INTO history_sim_card_file (
                file_name,
                id_agent
            )
            VALUES (?, ?)
        `, [file_name, id_agent]);

        const newId = result.insertId;

        // CREATE AUDIT LOG
        await createAuditLog({
            req,
            action: "CREATE",
            targetEntity: "history_sim_card_file",
            targetId: newId,
            metadata: {
                file_name,
                id_agent
            }
        });

        const [rows] = await pool.query(`
            SELECT
                f.id_file,
                f.file_name,
                f.id_agent,
                a.agent_name,
                f.created_at,
                f.updated_at
            FROM history_sim_card_file f
            LEFT JOIN agents a
                ON f.id_agent = a.id_agent
            WHERE f.id_file = ?
        `, [newId]);

        res.status(201).json({
            success: true,
            message: "SIM file history created successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("POST /sim-files ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// =========================
// IMPORT MULTIPLE SIMS
// =========================
const importSims = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;
        const { sims } = req.body;

        if (!Array.isArray(sims) || sims.length === 0) {
            connection.release();

            return res.status(400).json({
                success: false,
                message: "sims must be a non-empty array"
            });
        }

        const [fileRows] = await connection.query(`
            SELECT
                id_file,
                file_name,
                id_agent
            FROM history_sim_card_file
            WHERE id_file = ?
        `, [id]);

        if (fileRows.length === 0) {
            connection.release();

            return res.status(404).json({
                success: false,
                message: "File history not found"
            });
        }

        await connection.beginTransaction();

        const importedSims = [];

        for (const sim of sims) {

            if (!sim.iccid || !sim.imsi) {
                throw new Error(
                    "Each SIM must contain iccid and imsi"
                );
            }

            const [result] = await connection.query(`
                INSERT INTO sim_cards (
                    iccid,
                    imsi,
                    qr_code,
                    package,
                    phone_number,
                    id_sim_type,
                    id_sim_status,
                    imported_by,
                    id_file,
                    imported_at,
                    link_url
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
            `, [
                sim.iccid,
                sim.imsi,
                sim.qr_code || null,
                sim.package || null,
                sim.phone_number || null,
                sim.id_sim_type || null,
                sim.id_sim_status || 1,
                sim.imported_by || null,
                id,
                sim.link_url || null
            ]);

            importedSims.push({
                id_sim: result.insertId,
                iccid: sim.iccid,
                imsi: sim.imsi,
                phone_number: sim.phone_number || null
            });
        }

        // CREATE AUDIT LOG
        await createAuditLog({
            req,
            action: "IMPORT",
            targetEntity: "sim_cards",
            targetId: Number(id),
            metadata: {
                file_name: fileRows[0].file_name,
                imported_count: importedSims.length
            }
        });

        await connection.commit();
        connection.release();

        res.status(201).json({
            success: true,
            message: "SIMs imported successfully",
            data: {
                id_file: Number(id),
                file_name: fileRows[0].file_name,
                total_imported: importedSims.length,
                sims: importedSims
            }
        });

    } catch (error) {

        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error("Rollback error:", rollbackError);
        }

        connection.release();

        console.error(
            "POST /sim-files/:id/import ERROR:",
            error
        );

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Duplicate ICCID or IMSI found"
            });
        }

        res.status(500).json({
            success: false,
            message: "Import failed",
            error: error.message
        });
    }
};

// =========================
// DELETE FILE HISTORY
// =========================
const deleteFile = async (req, res) => {
    try {
        const { id } = req.params;

        const [simRows] = await pool.query(`
            SELECT id_sim
            FROM sim_cards
            WHERE id_file = ?
              AND deleted_at IS NULL
            LIMIT 1
        `, [id]);

        if (simRows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete file because SIM cards are linked to it"
            });
        }

        const [result] = await pool.query(`
            DELETE FROM history_sim_card_file
            WHERE id_file = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "File history not found"
            });
        }

        // CREATE AUDIT LOG
        await createAuditLog({
            req,
            action: "DELETE",
            targetEntity: "history_sim_card_file",
            targetId: id
        });

        res.json({
            success: true,
            message: "SIM file history deleted successfully"
        });

    } catch (error) {
        console.error("DELETE /sim-files/:id ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// =========================
// UPLOAD EXCEL / CSV FILE (FIXED)
// =========================
const uploadSimFile = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        if (!req.file) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Please upload a file"
            });
        }

        const { id_agent } = req.body;

        if (!id_agent) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: "id_agent is required"
            });
        }

        // CHECK AGENT
        const [agentRows] = await connection.query(
            `SELECT id_agent, agent_name FROM agents WHERE id_agent = ? AND deleted_at IS NULL`,
            [id_agent]
        );

        if (agentRows.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }

        // READ EXCEL / CSV
        const XLSX = require("xlsx");
        const workbook = XLSX.read(req.file.buffer, { type: "buffer", raw: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // ດຶງຂໍ້ມູນເປັນ JSON
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });

        if (rows.length === 0) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: "File contains no data"
            });
        }

        await connection.beginTransaction();

        // CREATE FILE HISTORY
        const [fileResult] = await connection.query(
            `INSERT INTO history_sim_card_file (file_name, id_agent) VALUES (?, ?)`,
            [req.file.originalname, id_agent]
        );

        const id_file = fileResult.insertId;
        const importedSims = [];
        const errors = [];

        // IMPORT EACH ROW
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            // 1. ດຶງຂໍ້ມູນຈາກ Flexible Header Matching
            const getVal = (key) => {
                const foundKey = Object.keys(row).find(
                    k => k.trim().toLowerCase() === key.toLowerCase()
                );
                return foundKey ? row[foundKey] : null;
            };

            const rawIccid = getVal("iccid");
            const rawImsi = getVal("imsi");
            const rawPhone = getVal("phone_number") || getVal("phone");
            const rawQr = getVal("qr_code") || getVal("qr");
            const rawPackage = getVal("package");
            const rawSimType = getVal("id_sim_type");
            const rawSimStatus = getVal("id_sim_status");

            // Check required fields
            if (!rawIccid || !rawImsi) {
                errors.push({
                    row: i + 2,
                    message: "iccid and imsi are required ( Check your Excel column header names )"
                });
                continue;
            }

            const iccid = String(rawIccid).trim();
            const imsi = String(rawImsi).trim();
            const phone_number = rawPhone ? String(rawPhone).trim() : null;

            try {
                const [result] = await connection.query(
                    `
                    INSERT INTO sim_cards (
                        iccid,
                        imsi,
                        qr_code,
                        package,
                        phone_number,
                        id_sim_type,
                        id_sim_status,
                        imported_by,
                        id_file,
                        imported_at,
                        link_url
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
                    `,
                    [
                        iccid,
                        imsi,
                        rawQr || null,
                        rawPackage || null,
                        phone_number,
                        rawSimType || 2, // Default type
                        rawSimStatus || 1, // Default status
                        req.user ? req.user.id_user : null,
                        id_file,
                        getVal("link_url") || null
                    ]
                );

                importedSims.push({
                    id_sim: result.insertId,
                    row: i + 2,
                    iccid,
                    imsi,
                    phone_number
                });

            } catch (error) {
                console.error(`Row ${i + 2} Insert Failed:`, error.message);
                
                if (error.code === "ER_DUP_ENTRY") {
                    errors.push({
                        row: i + 2,
                        iccid,
                        imsi,
                        message: "Duplicate ICCID or IMSI"
                    });
                } else {
                    errors.push({
                        row: i + 2,
                        iccid,
                        imsi,
                        message: error.message
                    });
                }
            }
        }

        // ຖ້າບໍ່ມີແຖວໃດ Insert ໄດ້ເລີຍ ให้ Rollback
        if (importedSims.length === 0) {
            await connection.rollback();
            connection.release();

            return res.status(400).json({
                success: false,
                message: "No SIM cards were imported. Check your Excel column headers or data validity.",
                errors
            });
        }

        // CREATE AUDIT LOG
        await createAuditLog({
            req,
            action: "IMPORT",
            targetEntity: "sim_cards",
            targetId: id_file,
            metadata: {
                file_name: req.file.originalname,
                total_rows: rows.length,
                imported_count: importedSims.length,
                failed_count: errors.length
            }
        });

        await connection.commit();
        connection.release();

        // 🟢 ເພີ່ມ key Standard (total, valid, invalid) ໃຫ້ Frontend ນໍາໄປສະແດງຜົນໃນ Card ໄດ້ເລີຍ
        res.status(201).json({
            success: true,
            message: "File uploaded and SIMs imported successfully",
            data: {
                id_file,
                file_name: req.file.originalname,
                // ແບບເດີມ
                total_rows: rows.length,
                imported_count: importedSims.length,
                failed_count: errors.length,
                // ແບບມາດຕະຖານ ທີ່ Frontend Card มັກເອົາໄປ Binding directly
                total: rows.length,
                valid: importedSims.length,
                invalid: errors.length,
                imported_sims: importedSims,
                errors
            }
        });

    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error("Rollback error:", rollbackError);
        }

        connection.release();

        console.error("POST /sim-files/upload ERROR:", error);

        res.status(500).json({
            success: false,
            message: "File upload failed",
            error: error.message
        });
    }
};

// =========================
// EXPORT
// =========================
module.exports = {
    getAllFiles,
    getFileById,
    createFile,
    importSims,
    uploadSimFile,
    deleteFile
};