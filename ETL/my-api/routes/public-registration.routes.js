const express = require("express");

const router = express.Router();

const {
    getRegistrationOptions,
    getAvailableSims,
    createPublicRegistration
} = require(
    "../controllers/public-registration.controller"
);


// GET options
router.get(
    "/registration-options",
    getRegistrationOptions
);


// GET available SIM
router.get(
    "/sims/available",
    getAvailableSims
);


// CREATE
router.post(
    "/registrations",
    createPublicRegistration
);


module.exports = router;