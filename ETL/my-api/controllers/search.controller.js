const pool = require("../db");


// ======================================================
// SEARCH CUSTOMERS
// ======================================================

const searchCustomers = async (req, res) => {
    try {

        const q = (req.query.q || "").trim();

        if (!q) {
            return res.status(400).json({
                success: false,
                message: "q is required"
            });
        }

        const like = `%${q}%`;

        const [rows] = await pool.query(`
            SELECT
                id_customer,
                first_name,
                last_name,
                passport_number,
                nationality,
                date_of_birth,
                phone_number,
                passport_photo,
                selfie_photo,
                created_at,
                updated_at
            FROM customers
            WHERE
                first_name LIKE ?
                OR last_name LIKE ?
                OR passport_number LIKE ?
                OR phone_number LIKE ?
            ORDER BY id_customer DESC
        `, [
            like,
            like,
            like,
            like
        ]);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {

        console.error(
            "SEARCH CUSTOMERS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// ======================================================
// SEARCH SIMS
// ======================================================

const searchSims = async (req, res) => {
    try {

        const q = (req.query.q || "").trim();

        if (!q) {
            return res.status(400).json({
                success: false,
                message: "q is required"
            });
        }

        const like = `%${q}%`;

        const [rows] = await pool.query(`
            SELECT
                s.id_sim,
                s.iccid,
                s.imsi,
                s.phone_number,

                s.id_sim_type,
                st.sim_type,

                s.id_sim_status,
                ss.status_name AS sim_status,

                s.qr_code,
                s.activation_code,
                s.link_url

            FROM sim_cards s

            LEFT JOIN sim_types st
                ON s.id_sim_type = st.id_sim_type

            LEFT JOIN sim_status ss
                ON s.id_sim_status = ss.id_sim_status

            WHERE
                s.deleted_at IS NULL

                AND (
                    s.iccid LIKE ?
                    OR s.imsi LIKE ?
                    OR s.phone_number LIKE ?
                    OR ss.status_name LIKE ?
                    OR st.sim_type LIKE ?
                )

            ORDER BY s.id_sim DESC
        `, [
            like,
            like,
            like,
            like,
            like
        ]);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {

        console.error(
            "SEARCH SIMS ERROR:",
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
    searchCustomers,
    searchSims
};