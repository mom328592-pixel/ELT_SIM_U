const express = require("express");
const router = express.Router();

const {
    getAllAuditLogs,
    getAuditLogById
} = require("../controllers/audit-logs.controller");

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags:
 *       - Audit Logs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 */
router.get("/", getAllAuditLogs);

/**
 * @openapi
 * /audit-logs/{id}:
 *   get:
 *     summary: Get audit log by ID
 *     tags:
 *       - Audit Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Audit log retrieved successfully
 *       404:
 *         description: Audit log not found
 */
router.get("/:id", getAuditLogById);

module.exports = router;