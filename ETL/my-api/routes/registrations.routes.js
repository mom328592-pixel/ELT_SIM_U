const express = require('express');
const router = express.Router();

// 1. ตรวจสอบให้มั่นใจว่า controller มีการ export ฟังก์ชันเหล่านี้ไว้อย่างถูกต้อง
const {
  getAllRegistrations,
  getRegistrationById,
  createRegistration,
  updateRegistration,
  deleteRegistration
} = require("../controllers/registrations.controller");

/**
 * @openapi
 * /registrations:
 *   get:
 *     summary: Get all registrations
 *     tags:
 *       - Registrations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Registrations retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", getAllRegistrations);

/**
 * @openapi
 * /registrations/{id}:
 *   get:
 *     summary: Get registration by ID
 *     tags:
 *       - Registrations
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
 *         description: Registration retrieved successfully
 *       404:
 *         description: Registration not found
 */
router.get("/:id", getRegistrationById);

/**
 * @openapi
 * /registrations:
 *   post:
 *     summary: Create SIM registration
 *     tags:
 *       - Registrations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_customer
 *               - id_sim
 *               - id_agent
 *             properties:
 *               id_registration_status:
 *                 type: integer
 *                 example: 1
 *                 description: 1=Pending, 2=Approved, 3=Rejected
 *               id_customer:
 *                 type: integer
 *                 example: 1
 *               id_sim:
 *                 type: integer
 *                 example: 1
 *               id_agent:
 *                 type: integer
 *                 example: 1
 *               registered_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-08-24T14:00:00Z"
 *               reviewed_by:
 *                 type: integer
 *                 example: 1
 *               reviewed_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-08-24T14:10:00Z"
 *               notes:
 *                 type: string
 *                 example: Initial SIM registration
 *     responses:
 *       201:
 *         description: Registration created successfully
 *       400:
 *         description: Required fields are missing
 *       404:
 *         description: Customer, SIM, Agent, Status or Reviewer not found
 */
router.post("/", createRegistration);

/**
 * @openapi
 * /registrations/{id}:
 *   put:
 *     summary: Update registration
 *     tags:
 *       - Registrations
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
 *               - id_customer
 *               - id_sim
 *               - id_agent
 *             properties:
 *               id_registration_status:
 *                 type: integer
 *                 example: 2
 *                 description: 1=Pending, 2=Approved, 3=Rejected
 *               id_customer:
 *                 type: integer
 *                 example: 1
 *               id_sim:
 *                 type: integer
 *                 example: 1
 *               id_agent:
 *                 type: integer
 *                 example: 1
 *               reviewed_by:
 *                 type: integer
 *                 example: 1
 *               reviewed_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-08-24T14:10:00Z"
 *               notes:
 *                 type: string
 *                 example: Registration approved
 *     responses:
 *       200:
 *         description: Registration updated successfully
 *       404:
 *         description: Registration or related data not found
 */
router.put("/:id", updateRegistration);

/**
 * @openapi
 * /registrations/{id}:
 *   delete:
 *     summary: Delete registration
 *     tags:
 *       - Registrations
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
 *         description: Registration deleted successfully
 *       404:
 *         description: Registration not found
 */
router.delete("/:id", deleteRegistration);

// ส่งออก router อยู่ด้านล่างสุดของไฟล์เสมอ
module.exports = router;