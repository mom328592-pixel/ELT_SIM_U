const express = require("express");

const router = express.Router();

const {
    approveRegistration,
    rejectRegistration,
} = require("../controllers/registrations.controller");

/**
 * @openapi
 * /registrations/{id}/approve:
 *   put:
 *     summary: Approve registration
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
 *         description: Registration approved successfully
 *       403:
 *         description: Only Admin can approve
 *       404:
 *         description: Registration not found
 *       409:
 *         description: Registration is not pending
 */
router.put(
    "/:id/approve",
    approveRegistration
);

/**
 * @openapi
 * /registrations/{id}/reject:
 *   put:
 *     summary: Reject registration
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
 *         description: Registration rejected successfully
 *       403:
 *         description: Only Admin can reject
 *       404:
 *         description: Registration not found
 *       409:
 *         description: Registration is not pending
 */
router.put(
    "/:id/reject",
    rejectRegistration
);

module.exports = router;