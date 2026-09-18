const pool = require("../db");

const getAllStatusUsers = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                id_status_user,
                status_name,
                description,
                created_at,
                updated_at
            FROM status_user
            ORDER BY id_status_user ASC
        `);

        res.json({
            success: true,
            message: "User statuses retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error("GET /status-users ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

module.exports = {
    getAllStatusUsers
};