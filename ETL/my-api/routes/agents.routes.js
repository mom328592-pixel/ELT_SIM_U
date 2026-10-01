const express = require("express");

const router = express.Router();

const {
    getAllAgents,
    getAgentById,
    createAgent,
    updateAgent,
    regeneratePublicLink,
    deleteAgent
} = require("../controllers/agents.controller");


// GET ALL
router.get("/", getAllAgents);


// CREATE
router.post("/", createAgent);


// REGENERATE PUBLIC LINK
router.post(
    "/:id/public-link",
    regeneratePublicLink
);


// GET BY ID
router.get("/:id", getAgentById);


// UPDATE
router.put("/:id", updateAgent);


// DELETE
router.delete("/:id", deleteAgent);


module.exports = router;