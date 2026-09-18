const pool = require("../db");

const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id_user;

        const [rows] = await pool.query(
            `
            SELECT
                id_notification,
                title,
                message,
                type,
                is_read,
                created_at
            FROM notifications
            WHERE id_user = ?
            ORDER BY created_at DESC
            LIMIT 50
            `,
            [userId]
        );

        res.json({
            success: true,
            message: "Notifications retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error(
            "GET /notifications ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id_user;

        const [[result]] = await pool.query(
            `
            SELECT COUNT(*) AS unread_count
            FROM notifications
            WHERE id_user = ?
              AND is_read = 0
            `,
            [userId]
        );

        res.json({
            success: true,
            message: "Unread notification count retrieved successfully",
            data: {
                unread_count: Number(
                    result.unread_count || 0
                )
            }
        });

    } catch (error) {
        console.error(
            "GET /notifications/unread-count ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


const markNotificationAsRead = async (
    req,
    res
) => {
    try {
        const userId = req.user.id_user;
        const { id } = req.params;

        const [result] = await pool.query(
            `
            UPDATE notifications
            SET is_read = 1
            WHERE id_notification = ?
              AND id_user = ?
            `,
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        res.json({
            success: true,
            message: "Notification marked as read"
        });

    } catch (error) {
        console.error(
            "PUT /notifications/:id ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


const markAllNotificationsAsRead = async (
    req,
    res
) => {
    try {
        const userId = req.user.id_user;

        await pool.query(
            `
            UPDATE notifications
            SET is_read = 1
            WHERE id_user = ?
              AND is_read = 0
            `,
            [userId]
        );

        res.json({
            success: true,
            message:
                "All notifications marked as read"
        });

    } catch (error) {
        console.error(
            "PUT /notifications/read-all ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


const deleteNotification = async (
    req,
    res
) => {
    try {
        const userId = req.user.id_user;
        const { id } = req.params;

        const [result] = await pool.query(
            `
            DELETE FROM notifications
            WHERE id_notification = ?
              AND id_user = ?
            `,
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        res.json({
            success: true,
            message: "Notification deleted successfully"
        });

    } catch (error) {
        console.error(
            "DELETE /notifications/:id ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


const createNotification = async ({
    idUser,
    title,
    message,
    type = "info"
}) => {
    try {
        await pool.query(
            `
            INSERT INTO notifications (
                id_user,
                title,
                message,
                type
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                idUser,
                title,
                message,
                type
            ]
        );
    } catch (error) {
        console.error(
            "CREATE NOTIFICATION ERROR:",
            error.message
        );
    }
};
const createNotificationsForUsers = async ({
    userIds,
    title,
    message,
    type = "info"
}) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        return;
    }

    const values = userIds.map((userId) => [
        userId,
        title,
        message,
        type
    ]);

    try {
        await pool.query(
            `
            INSERT INTO notifications (
                id_user,
                title,
                message,
                type
            )
            VALUES ?
            `,
            [values]
        );
    } catch (error) {
        console.error(
            "CREATE MULTIPLE NOTIFICATIONS ERROR:",
            error.message
        );
    }
};


module.exports = {
    getMyNotifications,
    getUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    createNotification,
    createNotificationsForUsers
};