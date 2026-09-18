const express = require("express");
const router = express.Router();

const {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
} = require("../controllers/roles.controller");

/**
 * @openapi
 * /roles:
 *   get:
 *     summary: Get all roles
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 */

router.get("/", getAllRoles);
router.get("/:id", getRoleById);
router.post("/", createRole);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

module.exports = router;