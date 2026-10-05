const express = require("express");

const router = express.Router();

const upload = require(
    "../middlewares/passport-upload.middleware"
);

const {
    getRegistrationOptions,
    createPublicRegistration,
    getPublicRegistrationStatus
} = require(
    "../controllers/public-registration.controller"
);


// Registration options
router.get(
    "/registration-options/:agentToken",
    getRegistrationOptions
);


// Create registration
router.post(
    "/registrations",
    upload.single("passport"),
    createPublicRegistration
);


// Check result after submission
router.get(
    "/registration-status/:agentToken/:id",
    getPublicRegistrationStatus
);


module.exports = router;