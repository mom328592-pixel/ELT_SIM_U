const pool = require("../db");
const { createAuditLog } = require("../utils/audit");
const XLSX = require("xlsx");

// Helper to convert cell values safely into trimmed string
const toText = (value) => {
    if (value === null || value === undefined) return "";
    const text = String(value).trim();
    if (/e\+?/i.test(text)) {
        throw new Error("ICCID/IMSI must be stored as Excel Text, not scientific notation");
    }
    return text;
};

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
            SELECT id_agent, agent_name
            FROM agents
            WHERE id_agent = ? AND deleted_at IS NULL
        `, [id_agent]);

        if (agentRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }

        const [result] = await pool.query(`
            INSERT INTO history_sim_card_file (file_name, id_agent)
            VALUES (?, ?)
        `, [file_name, id_agent]);

        const newId = result.insertId;

        // CREATE AUDIT LOG
        await createAuditLog({
            req,
            action: "CREATE",
            targetEntity: "history_sim_card_file",
            targetId: newId,
            metadata: { file_name, id_agent }
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
// IMPORT MULTIPLE SIMS (JSON)
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
            SELECT id_file, file_name, id_agent
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
                throw new Error("Each SIM must contain iccid and imsi");
            }

            const [result] = await connection.query(`
                INSERT INTO sim_cards (
                    iccid,
                    imsi,
                    qr_code,
                    id_package,
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
                sim.id_package || null,
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

        console.error("POST /sim-files/:id/import ERROR:", error);

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
            WHERE id_file = ? AND deleted_at IS NULL
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
// UPLOAD EXCEL / CSV FILE
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

        // PARSE EXCEL / CSV
        const workbook = XLSX.read(req.file.buffer, { type: "buffer", raw: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: true });

        if (rows.length === 0) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: "File contains no data"
            });
        }

        await connection.beginTransaction();

        // 1. CREATE FILE HISTORY RECORD
        const [fileResult] = await connection.query(
            `INSERT INTO history_sim_card_file (file_name, id_agent) VALUES (?, ?)`,
            [req.file.originalname, id_agent]
        );
        const id_file = fileResult.insertId;

        const importedSims = [];
        const errors = [];

        // 2. PROCESS ROWS
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            // Case-insensitive header lookup
            const getVal = (key) => {
                const foundKey = Object.keys(row).find(
                    k => k.trim().toLowerCase() === key.toLowerCase()
                );
                return foundKey ? row[foundKey] : null;
            };

            try {
                const iccid = toText(getVal("iccid"));
                const imsi = toText(getVal("imsi"));
                const phone = toText(getVal("phone_number") || getVal("phone"));
                const qrCode = toText(getVal("qr_code") || getVal("qr"));
                const activationCode = toText(getVal("activation_code"));
                const idPackage = getVal("id_package");
                const idSimType = getVal("id_sim_type");
                const idSimStatus = getVal("id_sim_status") || 1;

                if (!iccid || !imsi) {
                    errors.push({
                        row: i + 2,
                        message: "iccid and imsi are required"
                    });
                    continue;
                }

                if (!idPackage) {
                    errors.push({
                        row: i + 2,
                        message: "id_package is required"
                    });
                    continue;
                }

                const [result] = await connection.query(`
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
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `, [
                    iccid,
                    imsi,
                    qrCode || null,
                    activationCode || null,
                    phone || null,
                    idSimType || null,
                    Number(idPackage),
                    Number(idSimStatus),
                    req.user ? req.user.id_user : null,
                    id_file
                ]);

                importedSims.push({
                    id_sim: result.insertId,
                    row: i + 2,
                    iccid,
                    imsi,
                    phone_number: phone || null
                });

            } catch (error) {
                errors.push({
                    row: i + 2,
                    message: error.message
                });
            }
        }

        // ROLLBACK IF NO VALID SIMS STORED
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

        res.status(201).json({
            success: true,
            message: "File uploaded and SIMs imported successfully",
            data: {
                id_file,
                file_name: req.file.originalname,
                total_rows: rows.length,
                imported_count: importedSims.length,
                failed_count: errors.length,
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

module.exports = {
    getAllFiles,
    getFileById,
    createFile,
    importSims,
    uploadSimFile,
    deleteFile
};