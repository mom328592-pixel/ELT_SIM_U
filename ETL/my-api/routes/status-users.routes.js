const express = require("express");
const router = express.Router();

const {
    getAllStatusUsers
} = require("../controllers/status-users.controller");

/**
 * @openapi
 * /status-users:
 *   get:
 *     summary: Get all user statuses
 *     tags:
 *       - User Status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statuses retrieved successfully
 */
router.get("/", getAllStatusUsers);

module.exports = router;