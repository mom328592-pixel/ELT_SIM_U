const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// =====================================================
// TRUST PROXY
// =====================================================

app.set("trust proxy", 1);

// =====================================================
// RATE LIMITER
// =====================================================

const rateLimit =
    require(
        "express-rate-limit"
    );

const loginLimiter =
    rateLimit({
        windowMs:
            15 * 60 * 1000,

        max: 10,

        standardHeaders:
            true,

        legacyHeaders:
            false,

        message: {
            success: false,
            message:
                "Too many login attempts. Please try again later.",
        },
    });

// =====================================================
// ROUTES
// =====================================================

const rolesRoutes =
    require(
        "./routes/roles.routes"
    );

const usersRoutes =
    require(
        "./routes/users.routes"
    );

const agentsRoutes =
    require(
        "./routes/agents.routes"
    );

const simsRoutes =
    require(
        "./routes/sims.routes"
    );

const customersRoutes =
    require(
        "./routes/customers.routes"
    );

const registrationsRoutes =
    require(
        "./routes/registrations.routes"
    );

const authRoutes =
    require(
        "./routes/auth.routes"
    );

const simFileRoutes =
    require(
        "./routes/sim-file.routes"
    );

const profileRoutes =
    require(
        "./routes/profile.routes"
    );

const auditLogsRoutes =
    require(
        "./routes/audit-logs.routes"
    );

const statusUsersRoutes =
    require(
        "./routes/status-users.routes"
    );

const reportsRoutes =
    require(
        "./routes/reports.routes"
    );

const exportRoutes =
    require(
        "./routes/export.routes"
    );

const simFileHistoryRoutes =
    require(
        "./routes/sim-file-history.routes"
    );

const simTypesRoutes =
    require(
        "./routes/sim-types.routes"
    );

const simStatusRoutes =
    require(
        "./routes/sim-status.routes"
    );

const registrationStatusRoutes =
    require(
        "./routes/registration-status.routes"
    );

const userStatusRoutes =
    require(
        "./routes/user-status.routes"
    );

const sessionRoutes =
    require(
        "./routes/session.routes"
    );

const publicRegistrationRoutes =
    require(
        "./routes/public-registration.routes"
    );

const passportOcrRoutes =
    require(
        "./routes/passport-ocr.routes"
    );

const packagesRoutes =
    require(
        "./routes/packages.routes"
    );

const searchRoutes =
    require(
        "./routes/search.routes"
    );

const uploadsRoutes =
    require(
        "./routes/uploads.routes"
    );

const registrationReviewRoutes =
    require(
        "./routes/registration-review.routes"
    );

// =====================================================
// SWAGGER
// =====================================================

const swaggerUi =
    require(
        "swagger-ui-express"
    );

const swaggerSpec =
    require("./swagger");

// =====================================================
// AUTH MIDDLEWARE
// =====================================================

const authMiddlewareRaw =
    require(
        "./middlewares/auth.middleware"
    );

const authenticateToken =
    typeof authMiddlewareRaw ===
    "function"
        ? authMiddlewareRaw
        : authMiddlewareRaw.authenticateToken;

const authorizeRoles =
    require(
        "./middlewares/role.middleware"
    );

// =====================================================
// VERIFY MIDDLEWARES
// =====================================================

if (
    typeof authenticateToken !==
    "function"
) {
    throw new Error(
        "auth.middleware must export authenticateToken or a middleware function"
    );
}

if (
    typeof authorizeRoles !==
    "function"
) {
    throw new Error(
        "role.middleware must export authorizeRoles as a function"
    );
}

// =====================================================
// DEBUG
// =====================================================

console.log(
    "authenticateToken:",
    typeof authenticateToken
);

console.log(
    "authorizeRoles(1):",
    typeof authorizeRoles(1)
);

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://eltsimu.vercel.app",
];

app.use(
    cors({
        origin:
            function (
                origin,
                callback
            ) {
                if (!origin) {
                    return callback(
                        null,
                        true
                    );
                }

                if (
                    allowedOrigins.includes(
                        origin
                    )
                ) {
                    return callback(
                        null,
                        true
                    );
                }

                const isVercelPreview =
                    /^https:\/\/eltsimu-[a-z0-9-]+\.vercel\.app$/i.test(
                        origin
                    );

                if (
                    isVercelPreview
                ) {
                    return callback(
                        null,
                        true
                    );
                }

                return callback(
                    new Error(
                        "Not allowed by CORS"
                    )
                );
            },

        credentials: true,

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization",
        ],

        optionsSuccessStatus: 204,
    })
);

// =====================================================
// BODY
// =====================================================

app.use(
    express.json({
        limit: "10mb",
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb",
    })
);

// =====================================================
// HEALTH
// =====================================================

app.get(
    "/health",
    async (
        req,
        res
    ) => {
        try {
            const pool =
                require("./db");

            await pool.query(
                "SELECT 1"
            );

            return res.json({
                success: true,
                status: "ok",
                database: "ok",
                time:
                    new Date().toISOString(),
            });
        } catch (error) {
            console.error(
                "HEALTH CHECK ERROR:",
                error
            );

            return res.status(503).json(
                {
                    success: false,
                    status: "error",
                    database:
                        "unavailable",
                    message:
                        "Database connection failed",
                }
            );
        }
    }
);

// =====================================================
// SWAGGER
// =====================================================

app.get(
    "/api-docs.json",
    (
        req,
        res
    ) => {
        return res.json(
            swaggerSpec
        );
    }
);

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(
        swaggerSpec,
        {
            swaggerOptions: {
                persistAuthorization:
                    true,
            },
        }
    )
);

// =====================================================
// ROOT
// =====================================================

app.get(
    "/",
    (
        req,
        res
    ) => {
        return res.json({
            success: true,
            message:
                "SIM Management API is running",
        });
    }
);

// =====================================================
// AUTH
// =====================================================

app.use(
    "/auth/login",
    loginLimiter
);

app.use(
    "/auth",
    authRoutes
);

// =====================================================
// ROLE MANAGEMENT
// =====================================================

app.use(
    "/roles",
    authenticateToken,
    authorizeRoles(1),
    rolesRoutes
);

app.use(
    "/users",
    authenticateToken,
    authorizeRoles(1),
    usersRoutes
);

// =====================================================
// AGENTS
// ROLE 1 + ROLE 2
// =====================================================

app.use(
    "/agents",
    authenticateToken,
    authorizeRoles(1, 2),
    agentsRoutes
);

// =====================================================
// AGENT PORTAL
// ROLE 3 ONLY
// =====================================================
// =====================================================
// SIM FILE HISTORY
// =====================================================

app.use(
    "/sim-files/history",
    authenticateToken,
    authorizeRoles(1, 2),
    simFileHistoryRoutes
);

// =====================================================
// SIM FILE IMPORT
// =====================================================

app.use(
    "/sim-files",
    authenticateToken,
    authorizeRoles(1, 2),
    simFileRoutes
);

// =====================================================
// SIM MANAGEMENT
// ROLE 1 + ROLE 2 ONLY
// =====================================================

app.use(
    "/sims",
    authenticateToken,
    authorizeRoles(1, 2),
    simsRoutes
);

// =====================================================
// CUSTOMER MANAGEMENT
// ROLE 1 + ROLE 2 ONLY
// =====================================================

app.use(
    "/customers",
    authenticateToken,
    authorizeRoles(1, 2),
    customersRoutes
);

// =====================================================
// REGISTRATIONS
// ROLE 1 + ROLE 2 ONLY
// =====================================================

app.use(
    "/registrations",
    authenticateToken,
    authorizeRoles(1, 2),
    registrationsRoutes
);

// =====================================================
// APPROVE / REJECT
// ROLE 1 ONLY
// =====================================================

app.use(
    "/registrations",
    authenticateToken,
    authorizeRoles(1),
    registrationReviewRoutes
);

// =====================================================
// STATUS USERS
// =====================================================

app.use(
    "/status-users",
    authenticateToken,
    authorizeRoles(1),
    statusUsersRoutes
);

// =====================================================
// AUDIT LOGS
// =====================================================

app.use(
    "/audit-logs",
    authenticateToken,
    authorizeRoles(1),
    auditLogsRoutes
);

// =====================================================
// REPORTS
// =====================================================

app.use(
    "/reports",
    authenticateToken,
    authorizeRoles(1, 2),
    reportsRoutes
);

// =====================================================
// PROFILE SESSIONS
// =====================================================

app.use(
    "/profile/sessions",
    authenticateToken,
    sessionRoutes
);

// =====================================================
// PROFILE
// =====================================================

app.use(
    "/profile",
    authenticateToken,
    profileRoutes
);

// =====================================================
// EXPORT
// =====================================================

app.use(
    "/export",
    authenticateToken,
    authorizeRoles(1, 2),
    exportRoutes
);

// =====================================================
// PACKAGES
// =====================================================

app.use(
    "/packages",
    authenticateToken,
    authorizeRoles(1, 2),
    packagesRoutes
);

// =====================================================
// SEARCH
// =====================================================

app.use(
    "/search",
    authenticateToken,
    authorizeRoles(1, 2),
    searchRoutes
);

// =====================================================
// UPLOADS
// =====================================================

app.use(
    "/uploads",
    authenticateToken,
    authorizeRoles(1, 2),
    uploadsRoutes
);

// =====================================================
// SIM TYPES
// =====================================================

app.use(
    "/sim-types",
    authenticateToken,
    authorizeRoles(1),
    simTypesRoutes
);

// =====================================================
// SIM STATUS
// =====================================================

app.use(
    "/sim-status",
    authenticateToken,
    authorizeRoles(1),
    simStatusRoutes
);

// =====================================================
// REGISTRATION STATUS
// =====================================================

app.use(
    "/registration-status",
    authenticateToken,
    authorizeRoles(1),
    registrationStatusRoutes
);

// =====================================================
// USER STATUS
// =====================================================

app.use(
    "/user-status",
    authenticateToken,
    authorizeRoles(1),
    userStatusRoutes
);

// =====================================================
// PUBLIC CUSTOMER REGISTRATION
// NO LOGIN
// =====================================================

app.use(
    "/public",
    publicRegistrationRoutes
);

app.use(
    "/public",
    passportOcrRoutes
);

// =====================================================
// NOT FOUND
// =====================================================

app.use(
    (
        req,
        res
    ) => {
        return res.status(404).json({
            success: false,
            message:
                `Route not found: ${req.method} ${req.originalUrl}`,
        });
    }
);

// =====================================================
// GLOBAL ERROR
// =====================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        console.error(
            "SERVER ERROR:",
            error
        );

        if (
            res.headersSent
        ) {
            return next(
                error
            );
        }

        if (
            error.message ===
            "Not allowed by CORS"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Origin not allowed by CORS",
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Internal server error",
        });
    }
);

// =====================================================
// START
// =====================================================

const PORT =
    process.env.PORT ||
    3000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `Server is running on port ${PORT}`
        );
    }
);