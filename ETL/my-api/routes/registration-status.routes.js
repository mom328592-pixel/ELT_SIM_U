const express = require("express");
const router = express.Router();

const {
    getAllRegistrationStatuses,
    createRegistrationStatus,
    updateRegistrationStatus,
    deleteRegistrationStatus
} = require("../controllers/registration-status.controller");

router.get(
    "/",
    getAllRegistrationStatuses
);

router.post(
    "/",
    createRegistrationStatus
);

router.put(
    "/:id",
    updateRegistrationStatus
);

router.delete(
    "/:id",
    deleteRegistrationStatus
);

module.exports = router;