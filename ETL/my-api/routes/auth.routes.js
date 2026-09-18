const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const {
    login,
    refreshAccessToken,
    logout,
    logoutAllDevices
} = require("../controllers/auth.controller");

const authMiddleware = require("../middlewares/auth.middleware");
const authenticateToken = typeof authMiddleware === "function" ? authMiddleware : authMiddleware.authenticateToken;

// Rate limiter ສະເພາະ Route Login (ປ້ອງກັນ Brute Force Attack)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 ນາທີ
    max: 10, // ອະນຸຍາດ 10 ຄັ້ງຕໍ່ IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts. Please try again later."
    }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid username or password
 *       403:
 *         description: User account is inactive
 *       429:
 *         description: Too many login attempts
 */
router.post("/login", loginLimiter, login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post("/refresh", refreshAccessToken);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout current session
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 *       400:
 *         description: Refresh token is required
 */
router.post("/logout", logout);

/**
 * @openapi
 * /auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All sessions have been revoked
 *       401:
 *         description: Unauthorized
 */
router.post("/logout-all", authenticateToken, logoutAllDevices);

module.exports = router;