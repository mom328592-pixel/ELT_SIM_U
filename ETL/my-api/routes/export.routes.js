const express = require("express");
const router = express.Router();

const {
    exportRegistrations,
    exportCustomers,
    exportSims
} = require("../controllers/export.controller");


/**
 * @openapi
 * /export/registrations:
 *   get:
 *     summary: Export registrations to Excel
 *     tags:
 *       - Export
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel file
 */
router.get(
    "/registrations",
    exportRegistrations
);


/**
 * @openapi
 * /export/customers:
 *   get:
 *     summary: Export customers to Excel
 *     tags:
 *       - Export
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel file
 */
router.get(
    "/customers",
    exportCustomers
);


/**
 * @openapi
 * /export/sims:
 *   get:
 *     summary: Export SIM cards to Excel
 *     tags:
 *       - Export
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel file
 */
router.get(
    "/sims",
    exportSims
);


module.exports = router;