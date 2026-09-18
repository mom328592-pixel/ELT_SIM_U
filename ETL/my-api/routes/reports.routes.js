const express = require("express");
const router = express.Router();

const {
    getDashboardReports
} = require("../controllers/reports.controller");

/**
 * @openapi
 * /reports/dashboard:
 *   get:
 *     summary: Get dashboard reports
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard reports retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/dashboard", getDashboardReports);

module.exports = router;