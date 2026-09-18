const express = require("express");

const router = express.Router();

const {
    getMyNotifications,
    getUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
} = require(
    "../controllers/notifications.controller"
);


/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: Get my notifications
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/",
    getMyNotifications
);


/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/unread-count",
    getUnreadCount
);


/**
 * @openapi
 * /notifications/{id}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 */
router.put(
    "/:id/read",
    markNotificationAsRead
);


/**
 * @openapi
 * /notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 */
router.put(
    "/read-all",
    markAllNotificationsAsRead
);


/**
 * @openapi
 * /notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 */
router.delete(
    "/:id",
    deleteNotification
);


module.exports = router;