const express = require("express");

const router = express.Router();

const {
    getMyAgentDashboard,
} = require(
    "../controllers/agent-portal.controller"
);

// ======================================================
// AGENT DASHBOARD
// ======================================================

router.get(
    "/dashboard",
    getMyAgentDashboard
);

module.exports = router;