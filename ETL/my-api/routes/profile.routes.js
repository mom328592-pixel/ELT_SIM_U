const express = require("express");
const router = express.Router();

const {
    getMyProfile,
    updateMyProfile,
    changeMyPassword
} = require("../controllers/profile.controller");


/**
 * @openapi
 * /profile:
 *   get:
 *     summary: Get my profile
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 */
router.get("/", getMyProfile);


/**
 * @openapi
 * /profile:
 *   put:
 *     summary: Update my profile
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 */
router.put("/", updateMyProfile);


/**
 * @openapi
 * /profile/password:
 *   put:
 *     summary: Change my password
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 */
router.put(
    "/password",
    changeMyPassword
);


module.exports = router;