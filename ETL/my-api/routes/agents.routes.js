const express = require("express");

const router = express.Router();

const {
    getAllAgents,
    getAgentById,
    createAgent,
    createAgentAccount,
    updateAgent,
    regeneratePublicLink,
    deleteAgent,
} = require("../controllers/agents.controller");

// ======================================================
// GET ALL
// ======================================================

router.get(
    "/",
    getAllAgents
);

// ======================================================
// CREATE AGENT + LOGIN
// ======================================================

router.post(
    "/",
    createAgent
);

// ======================================================
// CREATE LOGIN FOR EXISTING AGENT
// ======================================================

router.post(
    "/:id/account",
    createAgentAccount
);

// ======================================================
// REGENERATE PUBLIC LINK
// ======================================================

router.post(
    "/:id/public-link",
    regeneratePublicLink
);

// ======================================================
// GET BY ID
// ======================================================

router.get(
    "/:id",
    getAgentById
);

// ======================================================
// UPDATE
// ======================================================

router.put(
    "/:id",
    updateAgent
);

// ======================================================
// DELETE
// ======================================================

router.delete(
    "/:id",
    deleteAgent
);

module.exports = router;