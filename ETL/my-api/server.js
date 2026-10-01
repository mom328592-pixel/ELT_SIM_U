
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Trust the reverse proxy used by Render.
// Keep this setting if your deployment is behind one proxy.
app.set("trust proxy", 1);

// ========================================
// RATE LIMITER
// ========================================
const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

// ========================================
// IMPORT ROUTES
// ========================================
const rolesRoutes = require("./routes/roles.routes");
const usersRoutes = require("./routes/users.routes");
const agentsRoutes = require("./routes/agents.routes");
const simsRoutes = require("./routes/sims.routes");
const customersRoutes = require("./routes/customers.routes");
const registrationsRoutes = require("./routes/registrations.routes");
const authRoutes = require("./routes/auth.routes");
const simFileRoutes = require("./routes/sim-file.routes");
const profileRoutes = require("./routes/profile.routes");
const auditLogsRoutes = require("./routes/audit-logs.routes");
const statusUsersRoutes = require("./routes/status-users.routes");
const reportsRoutes = require("./routes/reports.routes");
const exportRoutes = require("./routes/export.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const simFileHistoryRoutes = require("./routes/sim-file-history.routes");
const simTypesRoutes = require("./routes/sim-types.routes");
const simStatusRoutes = require("./routes/sim-status.routes");
const registrationStatusRoutes = require("./routes/registration-status.routes");
const userStatusRoutes = require("./routes/user-status.routes");
const sessionRoutes = require("./routes/session.routes");
const publicRegistrationRoutes = require("./routes/public-registration.routes");
const passportOcrRoutes = require("./routes/passport-ocr.routes");
const packagesRoutes = require("./routes/packages.routes");
const searchRoutes = require("./routes/search.routes");
const uploadsRoutes = require("./routes/uploads.routes");
const registrationReviewRoutes = require("./routes/registration-review.routes");

// ========================================
// SWAGGER
// ========================================
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

// ========================================
// AUTH MIDDLEWARES
// ========================================
const authMiddlewareRaw = require("./middlewares/auth.middleware");

const authenticateToken =
  typeof authMiddlewareRaw === "function"
    ? authMiddlewareRaw
    : authMiddlewareRaw.authenticateToken;

const authorizeRoles = require("./middlewares/role.middleware");

// Verify middleware exports.
if (typeof authenticateToken !== "function") {
  throw new Error(
    "auth.middleware must export authenticateToken or a middleware function"
  );
}

if (typeof authorizeRoles !== "function") {
  throw new Error(
    "role.middleware must export authorizeRoles as a function"
  );
}

// ========================================
// DEBUG
// ========================================
console.log("authenticateToken:", typeof authenticateToken);
console.log("authorizeRoles(1):", typeof authorizeRoles(1));

// ========================================
// CORS — CONFIGURE ONLY ONCE
// ========================================
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://eltsimu.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Requests without Origin, e.g. some server-to-server calls.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow Vercel preview URLs for this project.
      const isVercelPreview =
        /^https:\/\/eltsimu-[a-z0-9-]+\.vercel\.app$/i.test(origin);

      if (isVercelPreview) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
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

// ========================================
// BODY PARSING & STATIC FILES
// ========================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ========================================
// HEALTH CHECK
// ========================================
app.get("/health", async (req, res) => {
  try {
    const pool = require("./db");
    await pool.query("SELECT 1");

    return res.json({
      success: true,
      status: "ok",
      database: "ok",
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("HEALTH CHECK ERROR:", error);

    return res.status(503).json({
      success: false,
      status: "error",
      database: "unavailable",
      message: "Database connection failed",
    });
  }
});

// ========================================
// API DOCUMENTATION
// ========================================
app.get("/api-docs.json", (req, res) => {
  res.json(swaggerSpec);
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

// ========================================
// ROOT
// ========================================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SIM Management API is running",
  });
});

// ========================================
// AUTH API
// ========================================
// If auth.routes.js already defines its own login limiter,
// remove one of the duplicate limiters to avoid double limiting.
app.use("/auth/login", loginLimiter);
app.use("/auth", authRoutes);

// ========================================
// MANAGEMENT ROUTES
// ========================================
app.use("/roles", authenticateToken, authorizeRoles(1), rolesRoutes);
app.use("/users", authenticateToken, authorizeRoles(1), usersRoutes);
app.use("/agents", authenticateToken, authorizeRoles(1, 2), agentsRoutes);

// ========================================
// SIM FILES & HISTORY
// ========================================
app.use(
  "/sim-files/history",
  authenticateToken,
  authorizeRoles(1, 2),
  simFileHistoryRoutes
);

app.use(
  "/sim-files",
  authenticateToken,
  authorizeRoles(1, 2),
  simFileRoutes
);

// ========================================
// SIMS, CUSTOMERS & REGISTRATIONS
// ========================================
app.use(
  "/sims",
  authenticateToken,
  authorizeRoles(1, 2, 3),
  simsRoutes
);

app.use(
  "/customers",
  authenticateToken,
  authorizeRoles(1, 2, 3),
  customersRoutes
);

app.use(
  "/registrations",
  authenticateToken,
  authorizeRoles(1, 2, 3),
  registrationsRoutes
);

// Registration review endpoints for administrators.
app.use(
  "/registrations",
  authenticateToken,
  authorizeRoles(1),
  registrationReviewRoutes
);

// ========================================
// SYSTEM SETTINGS, LOGS & REPORTS
// ========================================
app.use(
  "/status-users",
  authenticateToken,
  authorizeRoles(1),
  statusUsersRoutes
);

app.use(
  "/audit-logs",
  authenticateToken,
  authorizeRoles(1),
  auditLogsRoutes
);

app.use(
  "/reports",
  authenticateToken,
  authorizeRoles(1),
  reportsRoutes
);

app.use(
  "/profile/sessions",
  authenticateToken,
  sessionRoutes
);

app.use(
  "/profile",
  authenticateToken,
  profileRoutes
);

app.use(
  "/export",
  authenticateToken,
  authorizeRoles(1, 2, 3),
  exportRoutes
);

app.use(
  "/notifications",
  authenticateToken,
  notificationsRoutes
);

app.use(
  "/packages",
  authenticateToken,
  authorizeRoles(1, 2),
  packagesRoutes
);

app.use(
  "/search",
  authenticateToken,
  authorizeRoles(1, 2, 3),
  searchRoutes
);

app.use(
  "/uploads",
  authenticateToken,
  authorizeRoles(1, 2, 3),
  uploadsRoutes
);

// ========================================
// MASTER DATA
// ========================================
app.use("/sim-types", simTypesRoutes);

app.use(
  "/sim-status",
  authenticateToken,
  authorizeRoles(1),
  simStatusRoutes
);

app.use(
  "/registration-status",
  authenticateToken,
  authorizeRoles(1),
  registrationStatusRoutes
);

app.use(
  "/user-status",
  authenticateToken,
  authorizeRoles(1),
  userStatusRoutes
);

// ========================================
// PUBLIC REGISTRATION & PASSPORT OCR
// ========================================
app.use("/public", publicRegistrationRoutes);
app.use("/public", passportOcrRoutes);

// ========================================
// NOT FOUND
// ========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ========================================
// ERROR HANDLER
// ========================================
app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  if (res.headersSent) {
    return next(error);
  }

  // CORS errors should also return a JSON response.
  if (error.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "Origin not allowed by CORS",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// ========================================
// START SERVER
// ========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});