const express = require("express");
const cors = require("cors");
require("dotenv").config();

// IMPORT ROUTES
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
const publicRegistrationRoutes =
    require("./routes/public-registration.routes");
const passportOcrRoutes = require("./routes/passport-ocr.routes");
const packagesRoutes = require("./routes/packages.routes");
const paymentsRoutes = require("./routes/payments.routes");
const searchRoutes = require("./routes/search.routes");
const uploadsRoutes = require("./routes/uploads.routes");
// SWAGGER
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

// MIDDLEWARES
const authMiddlewareRaw = require("./middlewares/auth.middleware");
// ກວດສອບອັດໂຕໂນມັດວ່າ auth.middleware ເປັນ Direct Function ຫຼື Object
const authenticateToken = typeof authMiddlewareRaw === "function" 
    ? authMiddlewareRaw 
    : authMiddlewareRaw.authenticateToken;

const authorizeRoles = require("./middlewares/role.middleware");

// RATE LIMITER
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

// LOG DEBUG
console.log("1. authenticateToken:", typeof authenticateToken);
console.log("2. authorizeRoles(1):", typeof authorizeRoles(1));
console.log("3. rolesRoutes:", typeof rolesRoutes);

const app = express();

app.use(cors({
    origin: "https://eltsimu.vercel.app"
}));

app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(require("path").join(__dirname, "uploads")));
app.get("/health", async (req,res)=>{ try { const pool=require("./db"); await pool.query("SELECT 1"); res.json({success:true,status:"ok",database:"ok",time:new Date().toISOString()}); } catch(e){ res.status(503).json({success:false,status:"error",database:"unavailable",message:e.message}); }});

// API DOCS
app.get("/api-docs.json", (req, res) => {
    res.json(swaggerSpec);
});

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
        swaggerOptions: {
            persistAuthorization: true
        }
    })
);

// TEST API
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "SIM Management API is running"
    });
});

// AUTH API
app.use("/auth/login", loginLimiter);
app.use("/auth", authRoutes);

// MANAGEMENT ROUTES
app.use("/roles", authenticateToken, authorizeRoles(1), rolesRoutes);
app.use("/users", authenticateToken, authorizeRoles(1), usersRoutes);
app.use("/agents", authenticateToken, authorizeRoles(1, 2), agentsRoutes);

// SIM FILE & HISTORY
app.use("/sim-files/history", authenticateToken, authorizeRoles(1, 2), simFileHistoryRoutes);
app.use("/sim-files", authenticateToken, authorizeRoles(1, 2), simFileRoutes);

// SIM & CUSTOMERS
app.use("/sims", authenticateToken, authorizeRoles(1, 2, 3), simsRoutes);
app.use("/customers", authenticateToken, authorizeRoles(1, 2, 3), customersRoutes);
app.use("/registrations", authenticateToken, authorizeRoles(1, 2, 3), registrationsRoutes);
app.use("/registrations", authenticateToken, authorizeRoles(1), require("./routes/registration-review.routes"));

// SYSTEM CONFIG & LOGS
app.use("/status-users", authenticateToken, authorizeRoles(1), statusUsersRoutes);
app.use("/audit-logs", authenticateToken, authorizeRoles(1), auditLogsRoutes);
app.use("/reports", authenticateToken, authorizeRoles(1), reportsRoutes);
app.use("/profile/sessions", authenticateToken, sessionRoutes);
app.use("/profile", authenticateToken, profileRoutes);
app.use("/export", authenticateToken, authorizeRoles(1, 2, 3), exportRoutes);
app.use("/notifications", authenticateToken, notificationsRoutes);

app.use("/packages", authenticateToken, authorizeRoles(1, 2), packagesRoutes);
app.use("/payments", authenticateToken, authorizeRoles(1, 2, 3), paymentsRoutes);
app.use("/search", authenticateToken, authorizeRoles(1, 2, 3), searchRoutes);
app.use("/uploads", authenticateToken, authorizeRoles(1, 2, 3), uploadsRoutes);

// MASTER DATA ROUTES
app.use("/sim-types", simTypesRoutes);
app.use("/sim-status", authenticateToken, authorizeRoles(1), simStatusRoutes);
app.use("/registration-status", authenticateToken, authorizeRoles(1), registrationStatusRoutes);
app.use("/user-status", authenticateToken, authorizeRoles(1), userStatusRoutes);

app.use(
    "/public",
    publicRegistrationRoutes
);
app.use(
    "/public",
    passportOcrRoutes
);
// START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});