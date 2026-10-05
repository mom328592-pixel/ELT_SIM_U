const express = require('express');
const router = express.Router();
const { getAvailableSims } = require('../controllers/sims.controller');

const {
    getAllSims,
    getSimById,
    createSim,
    updateSim,
    deleteSim
} = require("../controllers/sims.controller");


/**
 * @openapi
 * /sim:
 *   get:
 *     summary: Get all SIM cards
 *     tags:
 *       - SIM Cards
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SIM cards retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", getAllSims);


/**
 * @openapi
 * /sim/{id}:
 *   get:
 *     summary: Get SIM card by ID
 *     tags:
 *       - SIM Cards
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: SIM card retrieved successfully
 *       404:
 *         description: SIM card not found
 */
router.get("/:id", getSimById);


/**
 * @openapi
 * /sim:
 *   post:
 *     summary: Create SIM card
 *     tags:
 *       - SIM Cards
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - iccid
 *               - imsi
 *             properties:
 *               iccid:
 *                 type: string
 *                 example: "8985601234567890301"
 *               imsi:
 *                 type: string
 *                 example: "460001234567901"
 *               qr_code:
 *                 type: string
 *                 example: "QR-001"
 *               package:
 *                 type: string
 *                 example: "30 Days"
 *               phone_number:
 *                 type: string
 *                 example: "02088880001"
 *               id_sim_type:
 *                 type: integer
 *                 example: 2
 *               id_sim_status:
 *                 type: integer
 *                 example: 1
 *               imported_by:
 *                 type: integer
 *                 example: 1
 *               id_file:
 *                 type: integer
 *                 example: 2
 *               imported_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-08-24T10:00:00Z"
 *               link_url:
 *                 type: string
 *                 example: "https://example.com/sim/001"
 *     responses:
 *       201:
 *         description: SIM card created successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: File history not found
 *       409:
 *         description: ICCID or IMSI already exists
 */
router.post("/", createSim);


/**
 * @openapi
 * /sim/{id}:
 *   put:
 *     summary: Update SIM card
 *     tags:
 *       - SIM Cards
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - iccid
 *               - imsi
 *             properties:
 *               iccid:
 *                 type: string
 *                 example: "8985601234567890301"
 *               imsi:
 *                 type: string
 *                 example: "460001234567901"
 *               qr_code:
 *                 type: string
 *                 example: "QR-001"
 *               package:
 *                 type: string
 *                 example: "30 Days"
 *               phone_number:
 *                 type: string
 *                 example: "02088880001"
 *               id_sim_type:
 *                 type: integer
 *                 example: 2
 *               id_sim_status:
 *                 type: integer
 *                 example: 1
 *               imported_by:
 *                 type: integer
 *                 example: 1
 *               id_file:
 *                 type: integer
 *                 example: 2
 *               imported_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-08-24T10:00:00Z"
 *               link_url:
 *                 type: string
 *                 example: "https://example.com/sim/001"
 *     responses:
 *       200:
 *         description: SIM card updated successfully
 *       404:
 *         description: SIM card or file history not found
 *       409:
 *         description: ICCID or IMSI already exists
 */
router.put("/:id", updateSim);


/**
 * @openapi
 * /sim/{id}:
 *   delete:
 *     summary: Delete SIM card
 *     tags:
 *       - SIM Cards
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: SIM card deleted successfully
 *       404:
 *         description: SIM card not found
 */
router.delete("/:id", deleteSim);


module.exports = router;