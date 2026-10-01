const express = require("express");

const router = express.Router();

const upload = require(
    "../middlewares/passport-upload.middleware"
);

const {
    getRegistrationOptions,
    createPublicRegistration
} = require(
    "../controllers/public-registration.controller"
);


// ======================================================
// GET REGISTRATION OPTIONS
// ======================================================

router.get(
    "/registration-options/:agentToken",
    getRegistrationOptions
);


// ======================================================
// CREATE REGISTRATION
// ======================================================

router.post(
    "/registrations",
    upload.single("passport"),
    createPublicRegistration
);


module.exports = router;