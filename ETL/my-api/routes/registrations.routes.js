const express = require("express");

const router = express.Router();

const {
    getAllRegistrations,
    getRegistrationById,
    createRegistration,
    updateRegistration,
    deleteRegistration,
} = require("../controllers/registrations.controller");

// =====================================================
// GET ALL REGISTRATIONS
// GET /registrations
// =====================================================

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
 */
router.get("/", getAllRegistrations);

// =====================================================
// GET REGISTRATION BY ID
// GET /registrations/:id
// =====================================================

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
 *     responses:
 *       200:
 *         description: Registration retrieved successfully
 *       404:
 *         description: Registration not found
 */
router.get("/:id", getRegistrationById);

// =====================================================
// CREATE REGISTRATION
// POST /registrations
// =====================================================

/**
 * @openapi
 * /registrations:
 *   post:
 *     summary: Create SIM registration
 *     tags:
 *       - Registrations
 *     security:
 *       - bearerAuth: []
 */
router.post("/", createRegistration);

// =====================================================
// UPDATE PENDING REGISTRATION
// PUT /registrations/:id
//
// NOTE:
// This endpoint is ONLY for editing Pending registrations.
// Approve / Reject use dedicated endpoints.
// =====================================================

/**
 * @openapi
 * /registrations/{id}:
 *   put:
 *     summary: Update pending registration
 *     tags:
 *       - Registrations
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id", updateRegistration);

// =====================================================
// DELETE REGISTRATION
// DELETE /registrations/:id
// =====================================================

/**
 * @openapi
 * /registrations/{id}:
 *   delete:
 *     summary: Delete registration
 *     tags:
 *       - Registrations
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", deleteRegistration);

module.exports = router;