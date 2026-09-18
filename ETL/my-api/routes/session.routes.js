const express = require("express");
const router = express.Router();

const {
    getMySessions,
    revokeSession,
    revokeAllSessions
} = require("../controllers/session.controller");

router.get(
    "/",
    getMySessions
);

router.delete(
    "/:id",
    revokeSession
);

router.post(
    "/revoke-all",
    revokeAllSessions
);

module.exports = router;