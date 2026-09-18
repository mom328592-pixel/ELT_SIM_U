const express = require("express");
const router = express.Router();

const {
    getAllAgents,
    getAgentById,
    createAgent,
    updateAgent,
    deleteAgent
} = require("../controllers/agents.controller");

/**
 * @openapi
 * /agents:
 *   get:
 *     summary: Get all agents
 *     tags:
 *       - Agents
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agents retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", getAllAgents);


/**
 * @openapi
 * /agents/{id}:
 *   get:
 *     summary: Get agent by ID
 *     tags:
 *       - Agents
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
 *         description: Agent retrieved successfully
 *       404:
 *         description: Agent not found
 */
router.get("/:id", getAgentById);


/**
 * @openapi
 * /agents:
 *   post:
 *     summary: Create agent
 *     tags:
 *       - Agents
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agent_name
 *             properties:
 *               agent_name:
 *                 type: string
 *                 example: Vientiane Mobile Shop
 *               contact_phone:
 *                 type: string
 *                 example: "02055556666"
 *               contact_email:
 *                 type: string
 *                 example: agent@example.com
 *               address:
 *                 type: string
 *                 example: Vientiane Capital, Laos
 *               created_by:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Agent created successfully
 *       400:
 *         description: Invalid request
 */
router.post("/", createAgent);


/**
 * @openapi
 * /agents/{id}:
 *   put:
 *     summary: Update agent
 *     tags:
 *       - Agents
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
 *               - agent_name
 *             properties:
 *               agent_name:
 *                 type: string
 *                 example: Vientiane Mobile Shop
 *               contact_phone:
 *                 type: string
 *                 example: "02055556666"
 *               contact_email:
 *                 type: string
 *                 example: agent@example.com
 *               address:
 *                 type: string
 *                 example: Vientiane Capital, Laos
 *     responses:
 *       200:
 *         description: Agent updated successfully
 *       404:
 *         description: Agent not found
 */
router.put("/:id", updateAgent);


/**
 * @openapi
 * /agents/{id}:
 *   delete:
 *     summary: Delete agent
 *     tags:
 *       - Agents
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
 *         description: Agent deleted successfully
 *       404:
 *         description: Agent not found
 */
router.delete("/:id", deleteAgent);


module.exports = router;