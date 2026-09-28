
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// =====================================================
// IMPORT ROUTES
// =====================================================

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
const paymentsRoutes = require("./routes/payments.routes");
const searchRoutes = require("./routes/search.routes");
const uploadsRoutes = require("./routes/uploads.routes");

// =====================================================
// SWAGGER
// =====================================================

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

// =====================================================
// MIDDLEWARES
// =====================================================

const authMiddlewareRaw = require("./middlewares/auth.middleware");

const authenticateToken =
  typeof authMiddlewareRaw === "function"
    ? authMiddlewareRaw
    : authMiddlewareRaw.authenticateToken;

const authorizeRoles = require("./middlewares/role.middleware");

// =====================================================
// RATE LIMITER
// =====================================================

const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many login attempts. Please try again later."
  }
});

// =====================================================
// DEBUG
// =====================================================

console.log(
  "1. authenticateToken:",
  typeof authenticateToken
);

console.log(
  "2. authorizeRoles(1):",
  typeof authorizeRoles(1)
);

console.log(
  "3. rolesRoutes:",
  typeof rolesRoutes
);

// =====================================================
// APP
// =====================================================

const app = express();

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
  "https://eltsimu.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {

      // Allow requests without Origin
      // Example: Postman / server-to-server
      if (!origin) {
        return callback(null, true);
      }

      // Production Vercel
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Vercel Preview deployments
      const isVercelPreview =
        /^https:\/\/eltsimu-[a-z0-9-]+\.vercel\.app$/.test(origin);

      if (isVercelPreview) {
        return callback(null, true);
      }

      console.log("CORS BLOCKED:", origin);

      return callback(
        new Error("Not allowed by CORS")
      );
    },

    credentials: true
  })
);

// =====================================================
// BASIC MIDDLEWARE
// =====================================================

app.set("trust proxy", 1);

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

// =====================================================
// STATIC UPLOADS
// =====================================================

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/health", async (req, res) => {

  try {

    const pool = require("./db");

    await pool.query("SELECT 1");

    res.json({
      success: true,
      status: "ok",
      database: "ok",
      time: new Date().toISOString()
    });

  } catch (error) {

    console.error(
      "HEALTH CHECK ERROR:",
      error
    );

    res.status(503).json({
      success: false,
      status: "error",
      database: "unavailable",
      message: error.message
    });
  }
});

// =====================================================
// API DOCS JSON
// =====================================================

app.get("/api-docs.json", (req, res) => {

  res.json(swaggerSpec);

});

// =====================================================
// SWAGGER UI
// =====================================================

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      persistAuthorization: true
    }
  })
);

// =====================================================
// ROOT TEST
// =====================================================

app.get("/", (req, res) => {

  res.json({
    success: true,
    message: "SIM Management API is running"
  });

});

// =====================================================
// AUTH API
// =====================================================
//
// Login:
// POST /auth/login
//
// Refresh:
// POST /auth/refresh
//
// Logout:
// POST /auth/logout
//
// Me:
// GET /auth/me
//
// Change password:
// PUT /auth/change-password
//
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
// MANAGEMENT ROUTES
// =====================================================

// Roles
app.use(
  "/roles",
  authenticateToken,
  authorizeRoles(1),
  rolesRoutes
);

// Users
app.use(
  "/users",
  authenticateToken,
  authorizeRoles(1),
  usersRoutes
);

// Agents
app.use(
  "/agents",
  authenticateToken,
  authorizeRoles(1, 2),
  agentsRoutes
);

// =====================================================
// SIM FILE & HISTORY
// =====================================================

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

// =====================================================
// SIM & CUSTOMERS
// =====================================================

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

// Registration review - Admin only
app.use(
  "/registrations",
  authenticateToken,
  authorizeRoles(1),
  require("./routes/registration-review.routes")
);

// =====================================================
// SYSTEM CONFIG & LOGS
// =====================================================

// Status Users
app.use(
  "/status-users",
  authenticateToken,
  authorizeRoles(1),
  statusUsersRoutes
);

// Audit Logs
app.use(
  "/audit-logs",
  authenticateToken,
  authorizeRoles(1),
  auditLogsRoutes
);

// Reports
app.use(
  "/reports",
  authenticateToken,
  authorizeRoles(1),
  reportsRoutes
);

// =====================================================
// PROFILE
// =====================================================

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

// =====================================================
// EXPORT
// =====================================================

app.use(
  "/export",
  authenticateToken,
  authorizeRoles(1, 2, 3),
  exportRoutes
);

// =====================================================
// NOTIFICATIONS
// =====================================================

app.use(
  "/notifications",
  authenticateToken,
  notificationsRoutes
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
// PAYMENTS
// =====================================================

app.use(
  "/payments",
  authenticateToken,
  authorizeRoles(1, 2, 3),
  paymentsRoutes
);

// =====================================================
// SEARCH
// =====================================================

app.use(
  "/search",
  authenticateToken,
  authorizeRoles(1, 2, 3),
  searchRoutes
);

// =====================================================
// UPLOADS API
// =====================================================

app.use(
  "/uploads",
  authenticateToken,
  authorizeRoles(1, 2, 3),
  uploadsRoutes
);

// =====================================================
// MASTER DATA
// =====================================================

// SIM Types
app.use(
  "/sim-types",
  simTypesRoutes
);

// SIM Status
app.use(
  "/sim-status",
  authenticateToken,
  authorizeRoles(1),
  simStatusRoutes
);

// Registration Status
app.use(
  "/registration-status",
  authenticateToken,
  authorizeRoles(1),
  registrationStatusRoutes
);

// User Status
app.use(
  "/user-status",
  authenticateToken,
  authorizeRoles(1),
  userStatusRoutes
);

// =====================================================
// PUBLIC REGISTRATION
// =====================================================

app.use(
  "/public",
  publicRegistrationRoutes
);

// =====================================================
// PASSPORT OCR
// =====================================================

app.use(
  "/public",
  passportOcrRoutes
);

// =====================================================
// 404 HANDLER
// =====================================================
//
// ຖ້າ Frontend ເອີ້ນ URL ຜິດ
// ຈະສົ່ງ JSON ແທນ HTML
//
// =====================================================

app.use((req, res) => {

  console.log(
    "404 NOT FOUND:",
    req.method,
    req.originalUrl
  );

  res.status(404).json({
    success: false,
    message: "Route not found",
    method: req.method,
    path: req.originalUrl
  });

});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================
//
// ສຳຄັນສຳລັບ error 500
// ຈະບໍ່ປ່ອຍ HTML <!DOCTYPE html>
// ກັບໄປໃຫ້ Frontend
//
// =====================================================

app.use((err, req, res, next) => {

  console.error(
    "===================================="
  );

  console.error(
    "GLOBAL SERVER ERROR"
  );

  console.error(
    "METHOD:",
    req.method
  );

  console.error(
    "URL:",
    req.originalUrl
  );

  console.error(
    "ERROR:",
    err
  );

  console.error(
    "===================================="
  );

  if (res.headersSent) {
    return next(err);
  }

  // CORS error
  if (
    err.message === "Not allowed by CORS"
  ) {

    return res.status(403).json({
      success: false,
      message: "CORS origin not allowed"
    });

  }

  // General server error
  return res.status(
    err.status || 500
  ).json({
    success: false,
    message:
      err.message ||
      "Internal Server Error"
  });

});

// =====================================================
// START SERVER
// =====================================================

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "===================================="
    );

    console.log(
      `Server is running on port ${PORT}`
    );

    console.log(
      `Health: /health`
    );

    console.log(
      `Swagger: /api-docs`
    );

    console.log(
      `Login: POST /auth/login`
    );

    console.log(
      "===================================="
    );

  }
);

