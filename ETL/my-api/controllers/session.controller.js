const pool = require("../db");

const getMySessions = async (req, res) => {
    try {
        const userId = req.user.id_user;

        const [rows] = await pool.query(
    `
    SELECT
        id_refresh_token,
        issued_at,
        expires_at,
        last_activity_at,
        revoked,
        ip_address,
        user_agent,
        device_name
    FROM refresh_tokens
    WHERE id_user = ?
      AND revoked = 0
      AND expires_at > NOW()
    ORDER BY last_activity_at DESC
    `,
    [userId]
);

        res.json({
            success: true,
            message: "Sessions retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error(
            "GET /profile/sessions ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


const revokeSession = async (req, res) => {
    try {
        const userId = req.user.id_user;
        const { id } = req.params;

        const [result] = await pool.query(
            `
            UPDATE refresh_tokens
            SET
                revoked = 1,
                last_activity_at = NOW()
            WHERE id_refresh_token = ?
              AND id_user = ?
              AND revoked = 0
            `,
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Session not found"
            });
        }

        res.json({
            success: true,
            message: "Session revoked successfully"
        });

    } catch (error) {
        console.error(
            "DELETE /profile/sessions/:id ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


const revokeAllSessions = async (req, res) => {
    try {
        const userId = req.user.id_user;

        await pool.query(
            `
            UPDATE refresh_tokens
            SET
                revoked = 1,
                last_activity_at = NOW()
            WHERE id_user = ?
              AND revoked = 0
            `,
            [userId]
        );

        res.json({
            success: true,
            message: "All sessions revoked successfully"
        });

    } catch (error) {
        console.error(
            "POST /profile/sessions/revoke-all ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


module.exports = {
    getMySessions,
    revokeSession,
    revokeAllSessions
};