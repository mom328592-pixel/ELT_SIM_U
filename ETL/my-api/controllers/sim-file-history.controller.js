const pool = require("../db");

const getFileHistory = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                hf.id_file,
                hf.file_name,
                hf.id_agent,
                a.agent_name,
                hf.created_at,
                hf.updated_at,
                COUNT(s.id_sim) AS total_sim
            FROM history_sim_card_file hf
            LEFT JOIN agents a
                ON hf.id_agent = a.id_agent
            LEFT JOIN sim_cards s
                ON hf.id_file = s.id_file
               AND s.deleted_at IS NULL
            GROUP BY
                hf.id_file,
                hf.file_name,
                hf.id_agent,
                a.agent_name,
                hf.created_at,
                hf.updated_at
            ORDER BY hf.id_file DESC
        `);

        return res.json({
            success: true,
            message: "File history retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error("GET /sim-files/history ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

const getFileHistoryById = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. ປ້ອງກັນບໍ່ໃຫ້ String ທີ່ບໍ່ແມ່ນຕົວເລກ (ເຊັ່ນ: "history") ຫຼຸດເຂົ້າມາ Query
        if (isNaN(id) || Number(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid file ID parameter"
            });
        }

        // 2. ດຶງຂໍ້ມູນໄຟລ໌ history
        const [rows] = await pool.query(`
            SELECT
                hf.id_file,
                hf.file_name,
                hf.id_agent,
                a.agent_name,
                hf.created_at,
                hf.updated_at
            FROM history_sim_card_file hf
            LEFT JOIN agents a
                ON hf.id_agent = a.id_agent
            WHERE hf.id_file = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "File history not found"
            });
        }

        // 3. ດຶງຂໍ້ມູນ SIM Cards (JOIN ເອົາ sim_status_name ເພື່ອສະແດງ badge ຢູ່ Frontend)
        const [sims] = await pool.query(`
            SELECT
                s.id_sim,
                s.iccid,
                s.imsi,
                s.phone_number,
                s.id_sim_type,
                s.id_sim_status,
                st.id_sim_status AS sim_status_name,
                s.package,
                s.qr_code,
                s.imported_at,
                s.created_at
            FROM sim_cards s
            LEFT JOIN sim_status st
                ON s.id_sim_status = st.id_sim_status
            WHERE s.id_file = ?
              AND s.deleted_at IS NULL
            ORDER BY s.id_sim ASC
        `, [id]);

        return res.json({
            success: true,
            message: "File history retrieved successfully",
            data: {
                ...rows[0],
                sims
            }
        });

    } catch (error) {
        console.error("GET /sim-files/history/:id ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};
const deleteFileHistory = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;

        await connection.beginTransaction();

        // Check file
        const [fileRows] = await connection.query(
            `
            SELECT
                id_file,
                file_name
            FROM history_sim_card_file
            WHERE id_file = ?
            `,
            [id]
        );

        if (fileRows.length === 0) {
            await connection.rollback();
            connection.release();

            return res.status(404).json({
                success: false,
                message: "File history not found"
            });
        }

        // Soft delete SIMs belonging to this file
        await connection.query(
            `
            UPDATE sim_cards
            SET deleted_at = NOW()
            WHERE id_file = ?
              AND deleted_at IS NULL
            `,
            [id]
        );

        // Delete file history
        await connection.query(
            `
            DELETE FROM history_sim_card_file
            WHERE id_file = ?
            `,
            [id]
        );

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: "File history deleted successfully",
            data: {
                id_file: Number(id),
                file_name: fileRows[0].file_name
            }
        });

    } catch (error) {
        try {
            await connection.rollback();
        } catch {}

        connection.release();

        console.error(
            "DELETE /sim-files/history/:id ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

module.exports = {
    getFileHistory,
    getFileHistoryById,
    deleteFileHistory
};