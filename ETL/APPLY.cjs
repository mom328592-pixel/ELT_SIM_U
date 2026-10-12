#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const apiDir = path.join(root, 'ETL', 'my-api');
const frontendDir = path.join(root, 'ETL', 'sim-frontend');

if (
  !fs.existsSync(path.join(apiDir, 'server.js')) ||
  !fs.existsSync(path.join(frontendDir, 'src', 'App.jsx'))
) {
  console.error(
    'ERROR: Run this command with the ELT_SIM_U repository root as the current directory.'
  );
  process.exit(1);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function write(rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(
    full,
    content.replace(/\r?\n/g, '\n'),
    'utf8'
  );
}

function requireReplace(source, regex, replacement, label) {
  if (!regex.test(source)) {
    throw new Error(
      `Could not locate expected code for: ${label}. ` +
      'No commit has been made; inspect the file before proceeding.'
    );
  }

  return source.replace(regex, replacement);
}

// =====================================================
// 1. GLOBAL CSS RESET
// =====================================================

write(
  'ETL/sim-frontend/src/index.css',
  `/* Global reset — component styling lives in App.css. */
:root {
  font-family: Inter, "Noto Sans Lao", ui-sans-serif, system-ui,
    -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #0f172a;
  background: #f5f7fb;
  color-scheme: light;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  min-width: 0;
  min-height: 100%;
  margin: 0;
}

body {
  min-height: 100vh;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

a {
  color: inherit;
}
`
);

// =====================================================
// 2. FRONTEND ROLE PERMISSIONS
// Manager: Dashboard, Reports, Profile.
// Admin/Staff: daily management operations.
// =====================================================

let app = read('ETL/sim-frontend/src/App.jsx');

app = app.replace(
  /onClick=\{\(\) => \{\s*const user =\s*JSON\.parse\(\s*localStorage\.getItem\(\s*"user"\s*\)\s*\|\| "null"\s*\);\s*window\.location\.replace\("\/dashboard"\);\s*\}\}/,
  'onClick={() => window.location.replace("/dashboard")}'
);

app = app.replace(
  /const roleId =\s*Number\(\s*userData\.id_role \?\?\s*userData\.role_id\s*\);\s*\n\s*showToast\(/,
  'showToast('
);

function setRouteRoles(source, route, roles) {
  const marker = `path="${route}"`;
  const start = source.indexOf(marker);

  if (start < 0) {
    throw new Error(`App.jsx is missing route ${route}`);
  }

  const next = source.indexOf('path="', start + marker.length);
  const stop = next < 0 ? source.length : next;
  const segment = source.slice(start, stop);

  if (!/allowedRoles=\{\s*\[/.test(segment)) {
    throw new Error(`No allowedRoles found for ${route}`);
  }

  const nextSegment = segment.replace(
    /allowedRoles=\{\s*\[[\s\S]*?\]\s*\}/,
    `allowedRoles={[\n                                ${roles.join(',\n                                ')},\n                            ]}`
  );

  return (
    source.slice(0, start) +
    nextSegment +
    source.slice(stop)
  );
}

app = setRouteRoles(app, '/registrations', [1, 2]);
app = setRouteRoles(app, '/sim-center', [1, 2]);
app = setRouteRoles(app, '/management', [1, 2]);
app = setRouteRoles(app, '/reports', [1, 2, 3]);
app = setRouteRoles(app, '/settings', [1, 2, 3]);

write('ETL/sim-frontend/src/App.jsx', app);

let sidebar = read('ETL/sim-frontend/src/components/Sidebar.jsx');

sidebar = requireReplace(
  sidebar,
  /\{canSee\(1, 2\) && \(\s*<NavLink\s+to="\/reports"/,
  '{canSee(1, 2, 3) && (\n                    <NavLink\n                        to="/reports"',
  'Manager Reports menu'
);

sidebar = requireReplace(
  sidebar,
  /\{canSee\(1, 2\) && \(\s*<NavLink\s+to="\/settings"/,
  '{canSee(1, 2, 3) && (\n                    <NavLink\n                        to="/settings"',
  'Manager Settings menu'
);

write('ETL/sim-frontend/src/components/Sidebar.jsx', sidebar);

// =====================================================
// 3. REMOVE DUPLICATE LOGIN LOCK CHECK
// Role 3 is Manager, not Agent.
// =====================================================

let auth = read('ETL/my-api/controllers/auth.controller.js');

auth = requireReplace(
  auth,
  /\n\s*if \(\n\s*user\.locked_until &&\n\s*new Date\(user\.locked_until\) >\n\s*new Date\(\)\n\s*\) \{\n\s*return res\.status\(423\)\.json\(\{\n\s*success: false,\n\s*message:\n\s*"Account temporarily locked\. Please try again later\.",\n\s*\}\);\n\s*\}\n/,
  '\n',
  'duplicate login-lock block'
);

auth = auth.replace(
  /\/\/ =================================================\n\/\/ AGENT LOGIN DISABLED\n\/\/ Agents use the public registration link only\.\n\/\/ =================================================\n\n\/\/ ---------------------------------------------\n\/\/ ACCOUNT LOCK CHECK\n\/\/ ----------------------------------------\n/,
  '\n'
);

write('ETL/my-api/controllers/auth.controller.js', auth);

// =====================================================
// 4. BACKEND SECURITY HEADERS AND ROLE PERMISSIONS
// =====================================================

let server = read('ETL/my-api/server.js');

server = requireReplace(
  server,
  /const cors = require\("cors"\);/,
  'const cors = require("cors");\nconst helmet = require("helmet");',
  'Helmet import'
);

server = requireReplace(
  server,
  /app\.set\("trust proxy", 1\);/,
  `app.set("trust proxy", 1);

// Security headers. CSP is disabled because Swagger UI contains inline assets.
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    })
);`,
  'Helmet middleware'
);

server = requireReplace(
  server,
  /app\.use\(\s*"\/registrations",\s*authenticateToken,\s*authorizeRoles\(1, 2\),\s*registrationsRoutes\s*\);/,
  'app.use(\n    "/registrations",\n    authenticateToken,\n    registrationsRoutes\n);',
  'registration router mount'
);

server = requireReplace(
  server,
  /app\.use\(\s*"\/reports",\s*authenticateToken,\s*authorizeRoles\(1, 2\),\s*reportsRoutes\s*\);/,
  'app.use(\n    "/reports",\n    authenticateToken,\n    authorizeRoles(1, 2, 3),\n    reportsRoutes\n);',
  'reports router mount'
);

server = server.replace(
  /\/\/ =====================================================\n\/\/ AGENT PORTAL\n\/\/ ROLE 3 ONLY\n\/\/ =====================================================\n/,
  ''
);

write('ETL/my-api/server.js', server);

// Route-level permission checks for registrations.
let registrationsRoutes = read('ETL/my-api/routes/registrations.routes.js');

if (
  !registrationsRoutes.includes(
    'const authorizeRoles = require("../middlewares/role.middleware");'
  )
) {
  registrationsRoutes = requireReplace(
    registrationsRoutes,
    /const router = express\.Router\(\);/,
    'const router = express.Router();\nconst authorizeRoles = require("../middlewares/role.middleware");',
    'registration role middleware import'
  );
}

for (const [before, after, label] of [
  [
    'router.get("/", getAllRegistrations);',
    'router.get("/", authorizeRoles(1, 2, 3), getAllRegistrations);',
    'registration list GET permission'
  ],
  [
    'router.get("/:id", getRegistrationById);',
    'router.get("/:id", authorizeRoles(1, 2, 3), getRegistrationById);',
    'registration detail GET permission'
  ],
  [
    'router.post("/", createRegistration);',
    'router.post("/", authorizeRoles(1, 2), createRegistration);',
    'registration create permission'
  ],
  [
    'router.put("/:id", updateRegistration);',
    'router.put("/:id", authorizeRoles(1, 2), updateRegistration);',
    'registration update permission'
  ],
  [
    'router.delete("/:id", deleteRegistration);',
    'router.delete("/:id", authorizeRoles(1, 2), deleteRegistration);',
    'registration delete permission'
  ],
]) {
  if (registrationsRoutes.includes(before)) {
    registrationsRoutes = registrationsRoutes.replace(before, after);
  } else if (!registrationsRoutes.includes(after)) {
    throw new Error(`Could not apply ${label}`);
  }
}

write(
  'ETL/my-api/routes/registrations.routes.js',
  registrationsRoutes
);

// =====================================================
// 5. PASSPORT IMAGE UPLOAD
// =====================================================

write(
  'ETL/my-api/middlewares/passport-upload.middleware.js',
  `const multer = require("multer");
const fs = require("fs");
const path = require("path");

const uploadDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "passport-" + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  },
});

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);

const fileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const validExtension = allowedExtensions.has(extension);
  const validMime =
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/octet-stream";

  if (validExtension && validMime) {
    return cb(null, true);
  }

  return cb(
    new Error("Only JPG, JPEG, PNG, WEBP, HEIC or HEIF passport images are allowed"),
    false
  );
};

module.exports = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});
`
);

// =====================================================
// 6. MYSQL SCHEMA FIX
// Quote conversion + dependency ordering.
// =====================================================

let schema = read('ETL/my-api/database/01_schema.sql');

const matches = [
  ...schema.matchAll(
    /CREATE TABLE\s+"([^"]+)"\s*\([\s\S]*?^\);/gm
  )
];

if (matches.length !== 14) {
  throw new Error(
    `Expected 14 CREATE TABLE blocks in 01_schema.sql; found ${matches.length}`
  );
}

const tables = matches.map(m => ({
  name: m[1],
  sql: m[0]
}));

const knownTables = new Set(tables.map(t => t.name));

const deps = (table) =>
  [
    ...table.sql.matchAll(/REFERENCES\s+"([^"]+)"/g)
  ]
    .map(m => m[1])
    .filter(name => knownTables.has(name) && name !== table.name);

const pending = [...tables];
const ordered = [];

while (pending.length) {
  const index = pending.findIndex(table =>
    deps(table).every(dep =>
      ordered.some(done => done.name === dep)
    )
  );

  if (index < 0) {
    throw new Error(
      `Unresolved/cyclic foreign-key dependency in schema: ` +
      pending.map(t => t.name).join(', ')
    );
  }

  ordered.push(pending.splice(index, 1)[0]);
}

schema =
  'SET FOREIGN_KEY_CHECKS = 0;\n\n' +
  ordered
    .map(t => t.sql.replace(/"([^"\n]+)"/g, '`$1`'))
    .join('\n\n') +
  '\n\nSET FOREIGN_KEY_CHECKS = 1;\n';

if (schema.includes('"')) {
  throw new Error('SQL still contains double-quoted identifiers after conversion');
}

write('ETL/my-api/database/01_schema.sql', schema);

// =====================================================
// 7. GITIGNORE, SAFE ENV TEMPLATE, SECURITY NOTES
// =====================================================

write(
  '.gitignore',
  `# Secrets and local environment files
.env
.env.*
!.env.example

# Dependencies and build output
**/node_modules/
**/dist/
**/coverage/

# Customer identity documents and runtime uploads
ETL/my-api/uploads/
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

# Local editor files
.vscode/
.idea/
.DS_Store
`
);

write(
  'ETL/my-api/.env.example',
  `# Copy this file to .env for local development or use hosting environment variables.
# Never commit real credentials.

DB_HOST=your-mysql-host
DB_USER=your-mysql-user
DB_PASSWORD=replace-with-a-unique-strong-password
DB_NAME=sim1
DB_PORT=3306
PORT=3000
FRONTEND_URL=https://your-frontend-domain.example

JWT_SECRET=replace-with-a-random-secret-at-least-64-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=replace-with-a-different-random-secret-at-least-64-characters
JWT_REFRESH_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_DAYS=7
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_MINUTES=15
`
);

write(
  'ETL/SECURITY_REMEDIATION.md',
  `# Security and operational notes

## Required actions after credentials or customer documents have appeared in a public repository

1. Rotate the MySQL/database password in the provider, then update the API hosting environment variables.
2. Replace JWT_SECRET and JWT_REFRESH_SECRET with different high-entropy values, update hosting variables, and redeploy. Existing sessions will become invalid.
3. Restrict repository access while reviewing the exposure. Removing files from the latest commit does not remove old commits, forks, or clones.
4. Keep .env, node_modules, and ETL/my-api/uploads/ out of Git.

## History cleanup

Back up the repository, then use git filter-repo to remove the old ETL/my-api/.env and ETL/my-api/uploads/ paths from all reachable commits. Coordinate before force-pushing because collaborators will need to resynchronize. Credential rotation remains required after history cleanup.
`
);

// Untrack sensitive/generated paths from Git, but preserve local files.
try {
  execFileSync(
    'git',
    [
      'rm', '--cached', '-r', '-f', '--ignore-unmatch', '--',
      'ETL/my-api/.env',
      'ETL/my-api/node_modules',
      'ETL/my-api/uploads'
    ],
    { cwd: root, stdio: 'inherit' }
  );
} catch (error) {
  throw new Error(
    'Files were edited, but `git rm --cached` could not untrack local secrets/dependencies/uploads. ' +
    'Run it manually after reviewing git status.'
  );
}

// =====================================================
// 8. AGENT DASHBOARD TOKENS AND ROUTES
// =====================================================

let agentsController = read('ETL/my-api/controllers/agents.controller.js');

agentsController = requireReplace(
  agentsController,
  /const getPublicUrl = \(token\) =>[^\n]*\n/,
  'const normalizeFrontendUrl = () => FRONTEND_URL.endsWith("/") ? FRONTEND_URL.slice(0, -1) : FRONTEND_URL;\n' +
  'const getPublicUrl = (token) => normalizeFrontendUrl() + "/customer-registration/" + token;\n' +
  'const getDashboardUrl = (token) => normalizeFrontendUrl() + "/agent-dashboard/" + token;\n',
  'Agent dashboard URL helper'
);

agentsController = agentsController.replace(
  /CONCAT\(\s*\?,\s*'\/customer-registration\/',\s*a\.public_token\s*\)\s+AS public_url,/g,
  match =>
    `${match}

                CONCAT(
                    ?,
                    '/agent-dashboard/',
                    a.agent_report_token
                ) AS dashboard_url,`
);

if ((agentsController.match(/AS dashboard_url/g) || []).length !== 2) {
  throw new Error('Could not add dashboard_url to both Agent SELECT queries');
}

agentsController = agentsController.replace(
  String.raw`[FRONTEND_URL.replace(/\/$/, "")]`,
  String.raw`[FRONTEND_URL.replace(/\/$/, ""), FRONTEND_URL.replace(/\/$/, "")]`
);

if (
  !agentsController.includes(
    String.raw`FRONTEND_URL.replace(/\/$/, ""),
                FRONTEND_URL.replace(/\/$/, ""),
                id,`
  )
) {
  agentsController = agentsController.replace(
    String.raw`FRONTEND_URL.replace(/\/$/, ""),
                id,`,
    String.raw`FRONTEND_URL.replace(/\/$/, ""),
                FRONTEND_URL.replace(/\/$/, ""),
                id,`
  );
}

agentsController = requireReplace(
  agentsController,
  /const publicToken =\s*generatePublicToken\(\);/,
  'const publicToken = generatePublicToken();\n\n        const dashboardToken = generatePublicToken();',
  'Generate separate Agent dashboard token'
);

agentsController = requireReplace(
  agentsController,
  /public_token,\s*created_by\s*\)\s*VALUES \(\?, \?, \?, \?, \?, \?\)/,
  'public_token,\n                    agent_report_token,\n                    created_by\n                )\n                VALUES (?, ?, ?, ?, ?, ?, ?)',
  'Agent create SQL fields'
);

agentsController = requireReplace(
  agentsController,
  /publicToken,\s*req\.user\?\.id_user \|\| null,/,
  'publicToken,\n                    dashboardToken,\n                    req.user?.id_user || null,',
  'Agent create SQL values'
);

agentsController = requireReplace(
  agentsController,
  /public_url:\s*getPublicUrl\(\s*publicToken\s*\),/,
  'public_url: getPublicUrl(publicToken),\n                dashboard_url: getDashboardUrl(dashboardToken),',
  'Agent create dashboard URL response'
);

// Insert a separate dashboard-link regeneration handler.
if (!agentsController.includes('const regenerateDashboardLink =')) {
  const insertAt = agentsController.indexOf(
    '// ======================================================\n// DELETE AGENT'
  );

  if (insertAt < 0) {
    throw new Error('Could not find Agent DELETE section');
  }

  const handler = `// ======================================================
// REGENERATE AGENT DASHBOARD LINK
// ======================================================

const regenerateDashboardLink = async (req, res) => {
    try {
        const { id } = req.params;
        const dashboardToken = generatePublicToken();

        const [result] = await pool.query(
            \`UPDATE agents
             SET agent_report_token = ?, updated_at = NOW()
             WHERE id_agent = ? AND deleted_at IS NULL\`,
            [dashboardToken, id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }

        await createAuditLog({
            req,
            action: "REGENERATE_AGENT_DASHBOARD_LINK",
            targetEntity: "agents",
            targetId: id,
            metadata: { dashboard_token_regenerated: true }
        });

        return res.json({
            success: true,
            message: "Agent dashboard link regenerated successfully",
            data: { dashboard_url: getDashboardUrl(dashboardToken) }
        });
    } catch (error) {
        console.error("POST /agents/:id/dashboard-link ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};

`;

  agentsController =
    agentsController.slice(0, insertAt) +
    handler +
    agentsController.slice(insertAt);
}

agentsController = requireReplace(
  agentsController,
  /regeneratePublicLink,\s*deleteAgent,/,
  'regeneratePublicLink,\n    regenerateDashboardLink,\n    deleteAgent,',
  'Export Agent dashboard regeneration handler'
);

write(
  'ETL/my-api/controllers/agents.controller.js',
  agentsController
);

let agentsRoutes = read('ETL/my-api/routes/agents.routes.js');

agentsRoutes = requireReplace(
  agentsRoutes,
  /regeneratePublicLink,\s*deleteAgent,/,
  'regeneratePublicLink,\n    regenerateDashboardLink,\n    deleteAgent,',
  'Import Agent dashboard regeneration handler'
);

agentsRoutes = requireReplace(
  agentsRoutes,
  /router\.post\(\s*"\/:id\/public-link",\s*regeneratePublicLink\s*\);/,
  'router.post("/:id/public-link", regeneratePublicLink);\n\nrouter.post("/:id/dashboard-link", regenerateDashboardLink);',
  'Agent dashboard regeneration route'
);

write('ETL/my-api/routes/agents.routes.js', agentsRoutes);

// =====================================================
// PUBLIC AGENT DASHBOARD API
// Returns aggregate counts only; no Passport/ICCID/IMSI.
// =====================================================

write(
  'ETL/my-api/controllers/agent-dashboard.controller.js',
  `const pool = require("../db");

// Read-only, aggregate-only Agent dashboard.
// Never return customer names, passport details, ICCID, or IMSI.
const getPublicAgentDashboard = async (req, res) => {
  try {
    const { reportToken } = req.params;

    if (!reportToken || !/^[a-f0-9]{64}$/i.test(reportToken)) {
      return res.status(404).json({
        success: false,
        message: "Agent dashboard link is invalid or expired"
      });
    }

    const [agents] = await pool.query(
      \`SELECT id_agent, agent_name
       FROM agents
       WHERE agent_report_token = ? AND deleted_at IS NULL
       LIMIT 1\`,
      [reportToken]
    );

    if (!agents.length) {
      return res.status(404).json({
        success: false,
        message: "Agent dashboard link is invalid or expired"
      });
    }

    const agent = agents[0];

    const [[summary]] = await pool.query(
      \`SELECT
        COUNT(r.id_registration) AS total_registrations,
        COUNT(DISTINCT r.id_customer) AS total_customers,
        COALESCE(SUM(CASE WHEN LOWER(TRIM(rs.status_name)) = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN LOWER(TRIM(rs.status_name)) = 'approved' THEN 1 ELSE 0 END), 0) AS approved,
        COALESCE(SUM(CASE WHEN LOWER(TRIM(rs.status_name)) = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected,
        COALESCE(SUM(CASE WHEN DATE(r.registered_at) = CURDATE() THEN 1 ELSE 0 END), 0) AS today,
        COALESCE(SUM(CASE WHEN YEARWEEK(r.registered_at, 3) = YEARWEEK(CURDATE(), 3) THEN 1 ELSE 0 END), 0) AS this_week,
        COALESCE(SUM(CASE WHEN YEAR(r.registered_at) = YEAR(CURDATE()) AND MONTH(r.registered_at) = MONTH(CURDATE()) THEN 1 ELSE 0 END), 0) AS this_month
       FROM registrations r
       LEFT JOIN registrations_status rs
         ON rs.id_registration_status = r.id_registration_status
       WHERE r.id_agent = ? AND r.deleted_at IS NULL\`,
      [agent.id_agent]
    );

    const [bySimType] = await pool.query(
      \`SELECT COALESCE(st.sim_type, 'Unknown') AS sim_type,
              COUNT(r.id_registration) AS registrations
       FROM registrations r
       LEFT JOIN sim_cards s ON s.id_sim = r.id_sim
       LEFT JOIN sim_types st ON st.id_sim_type = s.id_sim_type
       WHERE r.id_agent = ? AND r.deleted_at IS NULL
       GROUP BY st.sim_type
       ORDER BY registrations DESC\`,
      [agent.id_agent]
    );

    const [daily] = await pool.query(
      \`SELECT DATE(registered_at) AS date, COUNT(*) AS total
       FROM registrations
       WHERE id_agent = ?
         AND deleted_at IS NULL
         AND registered_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(registered_at)
       ORDER BY date ASC\`,
      [agent.id_agent]
    );

    const numberFields = [
      "total_registrations",
      "total_customers",
      "pending",
      "approved",
      "rejected",
      "today",
      "this_week",
      "this_month"
    ];

    const data = { agent_name: agent.agent_name };

    for (const key of numberFields) {
      data[key] = Number(summary?.[key] || 0);
    }

    data.by_sim_type = bySimType.map(row => ({
      sim_type: row.sim_type,
      registrations: Number(row.registrations || 0)
    }));

    data.daily = daily.map(row => ({
      date: row.date,
      total: Number(row.total || 0)
    }));

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");

    return res.json({ success: true, data });
  } catch (error) {
    console.error("PUBLIC AGENT DASHBOARD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load Agent dashboard"
    });
  }
};

module.exports = { getPublicAgentDashboard };
`
);

// Add public dashboard endpoint and update public registration status URL.
let publicRoutes = read('ETL/my-api/routes/public-registration.routes.js');

if (!publicRoutes.includes('getPublicAgentDashboard')) {
  publicRoutes = requireReplace(
    publicRoutes,
    /const \{\s*getRegistrationOptions,\s*createPublicRegistration,\s*getPublicRegistrationStatus\s*\} = require\(\s*"\.\.\/controllers\/public-registration\.controller"\s*\);/,
    'const {\n    getRegistrationOptions,\n    createPublicRegistration,\n    getPublicRegistrationStatus\n} = require("../controllers/public-registration.controller");\n\nconst { getPublicAgentDashboard } = require("../controllers/agent-dashboard.controller");',
    'Import public Agent dashboard controller'
  );

  publicRoutes = requireReplace(
    publicRoutes,
    /\/\/ Registration options/,
    'router.get("/agent-dashboard/:reportToken", getPublicAgentDashboard);\n\n// Registration options',
    'Public Agent dashboard endpoint'
  );
}

publicRoutes = requireReplace(
  publicRoutes,
  /router\.get\(\s*"\/registration-status\/:agentToken\/:id",\s*getPublicRegistrationStatus\s*\);/,
  'router.get("/registration-status/:statusToken", getPublicRegistrationStatus);',
  'Use per-registration random status token, not predictable registration ID'
);

write(
  'ETL/my-api/routes/public-registration.routes.js',
  publicRoutes
);

// =====================================================
// 9. PROTECT PUBLIC REGISTRATION STATUS
// =====================================================

let publicController = read(
  'ETL/my-api/controllers/public-registration.controller.js'
);

if (!publicController.includes('const crypto = require("crypto");')) {
  publicController = requireReplace(
    publicController,
    /const pool = require\("\.\.\/db"\);/,
    'const pool = require("../db");\nconst crypto = require("crypto");',
    'Crypto import for per-registration status token'
  );
}

publicController = requireReplace(
  publicController,
  /const \[registrationResult\] =\s*await connection\.query\(/,
  'const publicStatusToken = crypto.randomBytes(32).toString("hex");\n\n        const [registrationResult] =\n            await connection.query(',
  'Generate status token'
);

publicController = requireReplace(
  publicController,
  /INSERT INTO registrations \(\s*id_registration_status,\s*id_customer,\s*id_sim,\s*id_agent,\s*registered_at,\s*notes\s*\)\s*VALUES \(\?, \?, \?, \?, NOW\(\), \?\)/,
  'INSERT INTO registrations (\n                    id_registration_status,\n                    id_customer,\n                    id_sim,\n                    id_agent,\n                    public_status_token,\n                    registered_at,\n                    notes\n                )\n                VALUES (?, ?, ?, ?, ?, NOW(), ?)',
  'Save public status token on registration'
);

publicController = requireReplace(
  publicController,
  /\[\s*pendingStatus,\s*customerId,\s*sim\.id_sim,\s*agent\.id_agent,\s*"Customer self registration"\s*\]/,
  '[\n                    pendingStatus,\n                    customerId,\n                    sim.id_sim,\n                    agent.id_agent,\n                    publicStatusToken,\n                    "Customer self registration"\n                ]',
  'Provide status token SQL value'
);

publicController = requireReplace(
  publicController,
  /id_registration:\s*registrationResult\.insertId,\s*\n\s*id_customer:/,
  'id_registration: registrationResult.insertId,\n                status_token: publicStatusToken,\n\n                id_customer:',
  'Return status token to submitting customer'
);

publicController = publicController.replace(
  /\s*passport_number:\s*passport_number\.trim\(\),\s*\n/,
  '\n'
);

const statusStart = publicController.indexOf(
  'const getPublicRegistrationStatus'
);
const exportStart = publicController.indexOf(
  '// =====================================================\n// EXPORT',
  statusStart
);

if (statusStart < 0 || exportStart < 0) {
  throw new Error(
    'Could not locate existing public status function for privacy fix'
  );
}

const secureStatusFunction = `const getPublicRegistrationStatus = async (req, res) => {
    try {
        const { statusToken } = req.params;

        if (!statusToken || !/^[a-f0-9]{64}$/i.test(statusToken)) {
            return res.status(404).json({
                success: false,
                message: "Registration status link is invalid or expired"
            });
        }

        const [rows] = await pool.query(
            \`SELECT
                r.id_registration,
                rs.status_name AS registration_status,
                s.phone_number,
                st.sim_type,
                p.package_name,
                p.data_gb,
                p.validity_days,
                p.price,
                s.qr_code,
                s.activation_code,
                r.registered_at,
                r.reviewed_at
            FROM registrations r
            INNER JOIN registrations_status rs
                ON r.id_registration_status = rs.id_registration_status
            LEFT JOIN sim_cards s ON r.id_sim = s.id_sim
            LEFT JOIN sim_types st ON s.id_sim_type = st.id_sim_type
            LEFT JOIN packages p ON s.id_package = p.id_package
            WHERE r.public_status_token = ? AND r.deleted_at IS NULL
            LIMIT 1\`,
            [statusToken]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Registration status link is invalid or expired"
            });
        }

        const row = rows[0];
        const approved =
            String(row.registration_status || "").trim().toLowerCase() === "approved";

        const sim = approved ? {
            phone_number: row.phone_number,
            sim_type: row.sim_type,
            package_name: row.package_name,
            data_gb: row.data_gb,
            validity_days: row.validity_days,
            price: row.price,
            qr_code: row.qr_code,
            activation_code: row.activation_code
        } : null;

        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Referrer-Policy", "no-referrer");

        return res.json({
            success: true,
            data: {
                id_registration: row.id_registration,
                status: row.registration_status,
                sim,
                registered_at: row.registered_at,
                reviewed_at: row.reviewed_at
            }
        });
    } catch (error) {
        console.error("PUBLIC REGISTRATION STATUS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to check registration status"
        });
    }
};


`;

publicController =
  publicController.slice(0, statusStart) +
  secureStatusFunction +
  publicController.slice(exportStart);

write(
  'ETL/my-api/controllers/public-registration.controller.js',
  publicController
);

// =====================================================
// 10. ADD STATUS TOKENS TO INTERNAL REGISTRATION CREATION
// =====================================================

let internalRegistrationsController = read(
  'ETL/my-api/controllers/registrations.controller.js'
);

if (!internalRegistrationsController.includes('const crypto = require("crypto");')) {
  internalRegistrationsController = requireReplace(
    internalRegistrationsController,
    /const pool = require\("\.\.\/db"\);/,
    'const pool = require("../db");\nconst crypto = require("crypto");',
    'Crypto import for back-office registration status token'
  );
}

if (
  !internalRegistrationsController.includes(
    'const publicStatusToken = crypto.randomBytes(32).toString("hex");'
  )
) {
  const start = internalRegistrationsController.indexOf(
    '// INSERT REGISTRATION'
  );

  const end = internalRegistrationsController.indexOf(
    '// Return created registration',
    start
  );

  if (start < 0 || end < 0) {
    throw new Error('Could not locate manual registration INSERT block');
  }

  let block = internalRegistrationsController.slice(start, end);

  block = requireReplace(
    block,
    /const \[result\] =\s*await connection\.query\(/,
    'const publicStatusToken = crypto.randomBytes(32).toString("hex");\n\n        const [result] =\n            await connection.query(',
    'Generate back-office registration status token'
  );

  block = requireReplace(
    block,
    /INSERT INTO registrations \(\s*id_registration_status,\s*id_customer,\s*id_sim,\s*id_agent,\s*registered_at,\s*notes\s*\)\s*VALUES \(\?, \?, \?, \?, \?, \?\)/,
    'INSERT INTO registrations (\n                    id_registration_status,\n                    id_customer,\n                    id_sim,\n                    id_agent,\n                    public_status_token,\n                    registered_at,\n                    notes\n                )\n                VALUES (?, ?, ?, ?, ?, ?, ?)',
    'Add status token to manual registration INSERT'
  );

  block = requireReplace(
    block,
    /pendingStatusId,\s*id_customer,\s*id_sim,\s*id_agent,\s*registered_at \|\| new Date\(\),\s*notes \|\| null,/,
    'pendingStatusId,\n                    id_customer,\n                    id_sim,\n                    id_agent,\n                    publicStatusToken,\n                    registered_at || new Date(),\n                    notes || null,',
    'Provide status token in manual registration INSERT values'
  );

  internalRegistrationsController =
    internalRegistrationsController.slice(0, start) +
    block +
    internalRegistrationsController.slice(end);
}

write(
  'ETL/my-api/controllers/registrations.controller.js',
  internalRegistrationsController
);

// =====================================================
// 11. CUSTOMER REGISTRATION PAGE USES PRIVATE STATUS TOKEN
// =====================================================

let customerPage = read(
  'ETL/sim-frontend/src/pages/customer/CustomerRegistration.jsx'
);

customerPage = requireReplace(
  customerPage,
  /const \[\s*registrationId,\s*setRegistrationId,\s*\] = useState\(null\);/,
  'const [\n    registrationId,\n    setRegistrationId,\n  ] = useState(null);\n\n  const [statusToken, setStatusToken] = useState("");',
  'Customer status token state'
);

customerPage = customerPage.replace(
  /if \(\s*parsed\?\.registrationId\s*\) \{/,
  'if (parsed?.registrationId && parsed?.statusToken) {'
);

customerPage = requireReplace(
  customerPage,
  /setRegistrationId\(\s*parsed\.registrationId\s*\);/,
  'setRegistrationId(parsed.registrationId);\n        setStatusToken(parsed.statusToken);',
  'Resume status token from session'
);

customerPage = requireReplace(
  customerPage,
  /status:\s*registrationStatus,\s*\n\s*sim:\s*registeredSim,/,
  'status: registrationStatus,\n          statusToken,\n          sim: registeredSim,',
  'Persist status token'
);

customerPage = customerPage.replace(
  /registeredSim,\s*\n\s*\]\);/,
  'registeredSim,\n    statusToken,\n  ]);'
);

customerPage = customerPage.replace(
  /if \(\s*!registrationId \|\|\s*!agentToken\s*\) \{/,
  'if (!registrationId || !statusToken) {'
);

customerPage = requireReplace(
  customerPage,
  /`\$\{API_URL\}\/public\/registration-status\/\$\{encodeURIComponent\(\s*agentToken\s*\)\}\/\$\{registrationId\}`/,
  '`${API_URL}/public/registration-status/${encodeURIComponent(statusToken)}`',
  'Poll private status-token endpoint'
);

customerPage = customerPage.replace(
  /\[\s*registrationId,\s*agentToken,\s*\]/,
  '[registrationId, statusToken]'
);

customerPage = requireReplace(
  customerPage,
  /setRegistrationId\(\s*newRegistrationId\s*\);/,
  'setRegistrationId(newRegistrationId);\n        setStatusToken(registration.status_token || "");',
  'Store status token after submission'
);

write(
  'ETL/sim-frontend/src/pages/customer/CustomerRegistration.jsx',
  customerPage
);

// =====================================================
// 12. AGENT DASHBOARD PAGE
// =====================================================

write(
  'ETL/sim-frontend/src/pages/agent/AgentDashboard.jsx',
  `import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3000" : "https://eltsimu.onrender.com");

const number = value =>
  new Intl.NumberFormat().format(Number(value || 0));

function AgentDashboard() {
  const { reportToken } = useParams();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        API_URL + "/public/agent-dashboard/" +
        encodeURIComponent(reportToken || ""),
        {
          cache: "no-store",
          referrerPolicy: "no-referrer"
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || "This Agent dashboard link is invalid or expired."
        );
      }

      setReport(result.data || null);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err.message || "Unable to load Agent dashboard.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [reportToken]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (loading) {
    return (
      <main className="agent-dashboard-page">
        <div className="agent-dashboard-panel">
          Loading your report...
        </div>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="agent-dashboard-page">
        <div className="agent-dashboard-panel">
          <h1>Agent Dashboard</h1>
          <p className="agent-dashboard-error">
            {error || "Dashboard data is unavailable."}
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={loadReport}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const cards = [
    ["Customers", report.total_customers],
    ["Registrations", report.total_registrations],
    ["Pending review", report.pending],
    ["Approved", report.approved],
    ["Rejected", report.rejected]
  ];

  return (
    <main className="agent-dashboard-page">
      <header className="agent-dashboard-header">
        <div>
          <span className="agent-dashboard-eyebrow">
            ETL SIM REGISTRATION
          </span>
          <h1>{report.agent_name}</h1>
          <p>Agent registration summary</p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={loadReport}
        >
          Refresh report
        </button>
      </header>

      <section
        className="agent-dashboard-grid"
        aria-label="Registration summary"
      >
        {cards.map(([label, value]) => (
          <article
            className="agent-dashboard-card"
            key={label}
          >
            <span>{label}</span>
            <strong>{number(value)}</strong>
          </article>
        ))}
      </section>

      <section className="agent-dashboard-panel">
        <h2>Registration activity</h2>
        <div className="agent-dashboard-periods">
          <div>
            <span>Today</span>
            <strong>{number(report.today)}</strong>
          </div>
          <div>
            <span>This week</span>
            <strong>{number(report.this_week)}</strong>
          </div>
          <div>
            <span>This month</span>
            <strong>{number(report.this_month)}</strong>
          </div>
        </div>
      </section>

      <section className="agent-dashboard-panel">
        <h2>By SIM type</h2>
        {report.by_sim_type?.length ? (
          <div className="agent-dashboard-type-list">
            {report.by_sim_type.map(item => (
              <div key={item.sim_type}>
                <span>{item.sim_type}</span>
                <strong>{number(item.registrations)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p>No registrations recorded yet.</p>
        )}
      </section>

      <section className="agent-dashboard-panel">
        <h2>Last 7 days</h2>
        {report.daily?.length ? (
          <div className="agent-dashboard-daily">
            {report.daily.map(item => (
              <div key={String(item.date)}>
                <time>{String(item.date).slice(0, 10)}</time>
                <strong>{number(item.total)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p>No registrations recorded in the last 7 days.</p>
        )}

        {updatedAt && (
          <p className="agent-dashboard-updated">
            Updated {updatedAt.toLocaleString()}
          </p>
        )}

        <p className="agent-dashboard-note">
          This page only displays summary counts. Customer passport and identity details are not shown here.
        </p>
      </section>
    </main>
  );
}

export default AgentDashboard;
`
);

let appWithAgent = read('ETL/sim-frontend/src/App.jsx');

if (!appWithAgent.includes('from "./pages/agent/AgentDashboard"')) {
  appWithAgent = requireReplace(
    appWithAgent,
    /import CustomerRegistration from "\.\/pages\/customer\/CustomerRegistration";/,
    'import CustomerRegistration from "./pages/customer/CustomerRegistration";\nimport AgentDashboard from "./pages/agent/AgentDashboard";',
    'Import public Agent dashboard page'
  );
}

if (!appWithAgent.includes('path="/agent-dashboard/:reportToken"')) {
  appWithAgent = requireReplace(
    appWithAgent,
    /<Route\s+path="\/customer-registration\/:agentToken"[\s\S]*?\/>\s*\n\s*\{\/\* LOGIN \*\/\}/,
    segment => segment.replace(
      '{/* LOGIN */}',
      `<Route
                    path="/agent-dashboard/:reportToken"
                    element={
                        <CustomerLayout>
                            <AgentDashboard />
                        </CustomerLayout>
                    }
                />

                {/* LOGIN */}`
    ),
    'Add public Agent dashboard route'
  );
}

write('ETL/sim-frontend/src/App.jsx', appWithAgent);

// =====================================================
// 13. SHOW BOTH AGENT LINKS TO ETL ADMIN/STAFF
// =====================================================

let agentsPage = read(
  'ETL/sim-frontend/src/pages/admin/Agents.jsx'
);

if (!agentsPage.includes('const regenerateDashboardLink')) {
  const hook = agentsPage.indexOf(
    '    // =================================================\n    // REGENERATE\n'
  );

  if (hook < 0) {
    throw new Error('Could not find regenerate public link handler in Agents.jsx');
  }

  const code = `    // =================================================
    // AGENT DASHBOARD LINK (read-only; no Agent login)
    // =================================================

    const copyDashboardLink = async (agent) => {
        if (!agent.dashboard_url) return;

        try {
            await navigator.clipboard.writeText(agent.dashboard_url);
            setMessage("Agent dashboard link copied.");
            setError("");
        } catch {
            window.prompt("Copy Agent dashboard link:", agent.dashboard_url);
        }
    };

    const regenerateDashboardLink = async (agent) => {
        const ok = window.confirm(
            "Regenerate the dashboard link for \\"" +
            agent.agent_name +
            "\\"? The previous dashboard link will stop working."
        );

        if (!ok) return;

        try {
            setLinkActionId(agent.id_agent);
            setError("");

            await apiFetch(
                "/agents/" + agent.id_agent + "/dashboard-link",
                { method: "POST" }
            );

            setMessage(
                "Agent dashboard link regenerated. Share the new link with the Agent."
            );

            await loadAgents();
        } catch (err) {
            setError(
                err.message || "Failed to regenerate Agent dashboard link."
            );
        } finally {
            setLinkActionId(null);
        }
    };

`;

  agentsPage =
    agentsPage.slice(0, hook) +
    code +
    agentsPage.slice(hook);
}

agentsPage = agentsPage.replace(
  /window\.alert\([\s\S]*?"Agent created successfully\.\\n\\nPublic Registration Link:\\n"[\s\S]*?response\.data\.public_url[\s\S]*?\);/,
  'window.alert("Agent created successfully.\\n\\nCustomer registration link:\\n" + response.data.public_url + "\\n\\nRead-only Agent dashboard link:\\n" + (response.data.dashboard_url || "Unavailable"));'
);

if (!agentsPage.includes('<th>Agent Dashboard</th>')) {
  agentsPage = requireReplace(
    agentsPage,
    /<th>\s*Public Link\s*<\/th>/,
    '<th>Public Link</th>\n                                <th>Agent Dashboard</th>',
    'Agent dashboard column header'
  );

  agentsPage = agentsPage.replace('colSpan="5"', 'colSpan="6"');

  const anchor =
    '                                            <td>\n\n                                                <div\n                                                    className="agent-action-stack"';

  const pos = agentsPage.lastIndexOf(anchor);

  if (pos < 0) {
    throw new Error(
      'Could not locate Agent actions cell to insert dashboard link cell'
    );
  }

  const cell = `                                            <td>
                                                <div style={{ maxWidth: "280px", wordBreak: "break-all", fontSize: "12px" }}>
                                                    {agent.dashboard_url || "Dashboard link unavailable"}
                                                </div>
                                                <div className="agent-action-stack" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                                                    <button type="button" className="secondary-button" disabled={!agent.dashboard_url} onClick={() => window.open(agent.dashboard_url, "_blank", "noopener,noreferrer")}>Open dashboard</button>
                                                    <button type="button" className="secondary-button" disabled={!agent.dashboard_url} onClick={() => copyDashboardLink(agent)}>Copy link</button>
                                                    <button type="button" className="secondary-button" disabled={linkActionId === agent.id_agent} onClick={() => regenerateDashboardLink(agent)}>{linkActionId === agent.id_agent ? "Working..." : "Regenerate"}</button>
                                                </div>
                                            </td>

`;

  agentsPage =
    agentsPage.slice(0, pos) +
    cell +
    agentsPage.slice(pos);
}

write(
  'ETL/sim-frontend/src/pages/admin/Agents.jsx',
  agentsPage
);

// =====================================================
// 14. LET STAFF REVIEW REGISTRATIONS
// Deletion remains Admin-only.
// =====================================================

let registrationsPage = read(
  'ETL/sim-frontend/src/pages/admin/Registrations.jsx'
);

if (!registrationsPage.includes('const isReviewer =')) {
  registrationsPage = requireReplace(
    registrationsPage,
    /const isAdmin = currentRoleId === 1;/,
    'const isAdmin = currentRoleId === 1;\n  const isReviewer = [1, 2].includes(currentRoleId);',
    'Add Admin/Staff reviewer capability in UI'
  );
}

const approvalStart = registrationsPage.indexOf('const approveRegistration');
const rejectionStart = registrationsPage.indexOf('const rejectRegistration', approvalStart);

if (approvalStart < 0 || rejectionStart < 0) {
  throw new Error('Could not locate approval/rejection handlers in Registrations.jsx');
}

let approvalBlock = registrationsPage.slice(approvalStart, rejectionStart);

approvalBlock = requireReplace(
  approvalBlock,
  /if \(!isAdmin\) \{/,
  'if (!isReviewer) {',
  'Allow Staff in approval handler'
);

approvalBlock = approvalBlock.replace(
  'Only Admin can approve registrations.',
  'Only Admin or Staff can approve registrations.'
);

registrationsPage =
  registrationsPage.slice(0, approvalStart) +
  approvalBlock +
  registrationsPage.slice(rejectionStart);

const rejectionStart2 = registrationsPage.indexOf('const rejectRegistration');
const exportStart2 = registrationsPage.indexOf('// EXPORT', rejectionStart2);

if (rejectionStart2 < 0 || exportStart2 < 0) {
  throw new Error('Could not locate rejection handler in Registrations.jsx');
}

let rejectionBlock = registrationsPage.slice(rejectionStart2, exportStart2);

rejectionBlock = requireReplace(
  rejectionBlock,
  /if \(!isAdmin\) \{/,
  'if (!isReviewer) {',
  'Allow Staff in rejection handler'
);

rejectionBlock = rejectionBlock.replace(
  'Only Admin can reject registrations.',
  'Only Admin or Staff can reject registrations.'
);

registrationsPage =
  registrationsPage.slice(0, rejectionStart2) +
  rejectionBlock +
  registrationsPage.slice(exportStart2);

registrationsPage = registrationsPage.replace(
  /isPending &&\s*isAdmin &&/g,
  'isPending &&\n                                isReviewer &&'
);

registrationsPage = registrationsPage.replace(
  /"pending" &&\s*isAdmin &&/g,
  '"pending" &&\n                  isReviewer &&'
);

write(
  'ETL/sim-frontend/src/pages/admin/Registrations.jsx',
  registrationsPage
);

// =====================================================
// 15. AGENT DASHBOARD RESPONSIVE STYLES
// =====================================================

let appCss = read('ETL/sim-frontend/src/App.css');

if (!appCss.includes('/* Agent read-only dashboard */')) {
  appCss += `

/* Agent read-only dashboard */
.agent-dashboard-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: clamp(18px, 4vw, 40px);
  color: #101828;
}

.agent-dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.agent-dashboard-header h1 {
  margin: 8px 0 4px;
  font-size: clamp(26px, 4vw, 36px);
}

.agent-dashboard-header p {
  margin: 0;
  color: #667085;
}

.agent-dashboard-eyebrow {
  color: #475467;
  font-size: 12px;
  letter-spacing: .14em;
  font-weight: 800;
}

.agent-dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.agent-dashboard-card,
.agent-dashboard-panel {
  background: #fff;
  border: 1px solid #e4e7ec;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 3px 12px rgba(16,24,40,.04);
}

.agent-dashboard-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.agent-dashboard-card span,
.agent-dashboard-periods span {
  color: #667085;
  font-size: 14px;
}

.agent-dashboard-card strong {
  font-size: 30px;
  letter-spacing: -.03em;
}

.agent-dashboard-panel {
  margin-bottom: 18px;
}

.agent-dashboard-panel h2 {
  margin: 0 0 16px;
  font-size: 19px;
}

.agent-dashboard-periods,
.agent-dashboard-type-list,
.agent-dashboard-daily {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.agent-dashboard-periods > div,
.agent-dashboard-type-list > div,
.agent-dashboard-daily > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  border: 1px solid #eaecf0;
  border-radius: 10px;
  padding: 13px;
}

.agent-dashboard-periods strong,
.agent-dashboard-type-list strong,
.agent-dashboard-daily strong {
  font-size: 18px;
}

.agent-dashboard-daily time {
  color: #667085;
  font-size: 13px;
}

.agent-dashboard-updated,
.agent-dashboard-note {
  color: #667085;
  font-size: 12px;
  margin: 16px 0 0;
}

.agent-dashboard-note {
  border-top: 1px solid #eaecf0;
  padding-top: 12px;
}

.agent-dashboard-error {
  color: #b42318;
}

@media (max-width: 600px) {
  .agent-dashboard-page {
    padding: 14px;
  }

  .agent-dashboard-header > button {
    width: 100%;
  }

  .agent-dashboard-card,
  .agent-dashboard-panel {
    padding: 16px;
  }
}
`;
}

write('ETL/sim-frontend/src/App.css', appCss);

// Prevent bearer link tokens leaking in Referer headers.
let indexHtml = read('ETL/sim-frontend/index.html');

if (!/<meta\s+name=["']referrer["']/i.test(indexHtml)) {
  indexHtml = requireReplace(
    indexHtml,
    /<head>/i,
    '<head>\n    <meta name="referrer" content="no-referrer" />',
    'Add no-referrer policy for public bearer links'
  );
}

indexHtml = indexHtml.replace(
  /<title>\s*sim-frontend\s*<\/title>/i,
  '<title>ETL SIM | SIM Registration</title>'
);

write('ETL/sim-frontend/index.html', indexHtml);

// =====================================================
// 16. PERMIT STAFF TO REVIEW REGISTRATIONS
// =====================================================

let serverWithReview = read('ETL/my-api/server.js');

serverWithReview = requireReplace(
  serverWithReview,
  /app\.use\(\s*"\/registrations",\s*authenticateToken,\s*authorizeRoles\(1\),\s*registrationReviewRoutes\s*\);/,
  'app.use("/registrations", authenticateToken, authorizeRoles(1, 2), registrationReviewRoutes);',
  'Permit Staff to reach registration review routes'
);

write('ETL/my-api/server.js', serverWithReview);

let regController = read(
  'ETL/my-api/controllers/registrations.controller.js'
);

regController = requireReplace(
  regController,
  /if \(roleId !== 1\) \{/,
  'if (![1, 2].includes(roleId)) {',
  'Allow Admin and Staff to approve/reject registrations'
);

regController = regController.replace(
  'Only Admin can approve or reject registrations',
  'Only Admin or Staff can approve or reject registrations'
);

write(
  'ETL/my-api/controllers/registrations.controller.js',
  regController
);

// =====================================================
// 17. AUDIT AUTHENTICATED API ACTIONS
// Do not record request bodies or search values.
// =====================================================

let authMiddleware = read(
  'ETL/my-api/middlewares/auth.middleware.js'
);

if (!authMiddleware.includes('AUDIT_AUTHENTICATED_API_REQUEST')) {
  authMiddleware = requireReplace(
    authMiddleware,
    /const jwt = require\("jsonwebtoken"\);/,
    'const jwt = require("jsonwebtoken");\nconst { createAuditLog } = require("../utils/audit");',
    'Audit middleware dependency'
  );

  authMiddleware = requireReplace(
    authMiddleware,
    /req\.user = decoded;\s*\n\s*next\(\);/,
    `req.user = decoded;

        // AUDIT_AUTHENTICATED_API_REQUEST: metadata only.
        // Never record request body or query values.
        res.on("finish", () => {
            const method = String(req.method || "GET").toUpperCase();
            const route = String(req.baseUrl || req.path || "/").slice(0, 100);
            const pathOnly = String(req.originalUrl || req.url || "/").split("?")[0].slice(0, 500);

            createAuditLog({
                req,
                action: "API_" + method,
                targetEntity: route,
                targetId: req.params?.id ? String(req.params.id).slice(0, 100) : null,
                metadata: {
                    method,
                    path: pathOnly,
                    status_code: res.statusCode,
                    query_keys: Object.keys(req.query || {}).slice(0, 30)
                }
            }).catch(() => {});
        });

        next();`,
    'Register authenticated API audit event'
  );
}

write(
  'ETL/my-api/middlewares/auth.middleware.js',
  authMiddleware
);

let auditUtil = read('ETL/my-api/utils/audit.js');

auditUtil = auditUtil.replace(
  /const ipAddress =\s*req\.headers\["x-forwarded-for"\] \|\|\s*req\.socket\.remoteAddress \|\|\s*null;/,
  'const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();\n' +
  '        const ipAddress = (forwarded || req.socket?.remoteAddress || "").slice(0, 64) || null;'
);

auditUtil = auditUtil.replace(
  'targetEntity,\n                targetId,',
  'String(targetEntity || "unknown").slice(0, 100),\n' +
  '                targetId === null || targetId === undefined ? null : String(targetId).slice(0, 100),'
);

write('ETL/my-api/utils/audit.js', auditUtil);

// =====================================================
// 18. TOKEN COLUMNS IN NEW DATABASE SCHEMA + MIGRATIONS
// =====================================================

let securedSchema = read('ETL/my-api/database/01_schema.sql');

if (!securedSchema.includes('`agent_report_token`')) {
  securedSchema = requireReplace(
    securedSchema,
    /(`public_token`\s+varchar\(64\)\s+NOT NULL,)/,
    '$1\n  `agent_report_token` varchar(64) NOT NULL,',
    'Add Agent report token to clean-install schema'
  );

  const start = securedSchema.indexOf('CREATE TABLE `agents`');
  const end = securedSchema.indexOf('\n);', start);

  if (start < 0 || end < 0) {
    throw new Error('Could not find agents schema block for unique key');
  }

  const block = securedSchema
    .slice(start, end + 3)
    .replace(
      /PRIMARY KEY \(`id_agent`\),/,
      'PRIMARY KEY (`id_agent`),\n  UNIQUE KEY `uq_agents_agent_report_token` (`agent_report_token`),'
    );

  securedSchema =
    securedSchema.slice(0, start) +
    block +
    securedSchema.slice(end + 3);
}

if (!securedSchema.includes('`public_status_token`')) {
  const start = securedSchema.indexOf('CREATE TABLE `registrations`');
  const end = securedSchema.indexOf('\n);', start);

  if (start < 0 || end < 0) {
    throw new Error('Could not find registrations schema block for status token');
  }

  let block = securedSchema.slice(start, end + 3);

  block = block.replace(
    '  `id_agent` int NOT NULL,',
    '  `id_agent` int NOT NULL,\n  `public_status_token` varchar(64) NOT NULL,'
  );

  block = block.replace(
    /PRIMARY KEY \(`id_registration`\),/,
    'PRIMARY KEY (`id_registration`),\n  UNIQUE KEY `uq_registrations_public_status_token` (`public_status_token`),'
  );

  securedSchema =
    securedSchema.slice(0, start) +
    block +
    securedSchema.slice(end + 3);
}

write('ETL/my-api/database/01_schema.sql', securedSchema);

write(
  'ETL/my-api/database/02_agent_dashboard_and_status_token_migration.sql',
  `-- STEP 1: run ONCE before deploying the new application to an existing database.
-- Columns remain nullable during rollout so the old application can keep serving requests safely.
-- Do not run this or step 03 on a fresh database created from updated 01_schema.sql.

ALTER TABLE agents ADD COLUMN agent_report_token VARCHAR(64) NULL AFTER public_token;
UPDATE agents
SET agent_report_token = LOWER(HEX(RANDOM_BYTES(32)))
WHERE agent_report_token IS NULL;

ALTER TABLE agents
ADD UNIQUE KEY uq_agents_agent_report_token (agent_report_token);

ALTER TABLE registrations
ADD COLUMN public_status_token VARCHAR(64) NULL AFTER id_agent;

UPDATE registrations
SET public_status_token = LOWER(HEX(RANDOM_BYTES(32)))
WHERE public_status_token IS NULL;

ALTER TABLE registrations
ADD UNIQUE KEY uq_registrations_public_status_token (public_status_token);
`
);

write(
  'ETL/my-api/database/03_finalize_agent_dashboard_tokens.sql',
  `-- STEP 2: run ONCE only AFTER the new backend version is deployed and healthy.
-- Backfill any rows created by the previous application during rollout.

UPDATE agents
SET agent_report_token = LOWER(HEX(RANDOM_BYTES(32)))
WHERE agent_report_token IS NULL;

ALTER TABLE agents
MODIFY COLUMN agent_report_token VARCHAR(64) NOT NULL;

UPDATE registrations
SET public_status_token = LOWER(HEX(RANDOM_BYTES(32)))
WHERE public_status_token IS NULL;

ALTER TABLE registrations
MODIFY COLUMN public_status_token VARCHAR(64) NOT NULL;
`
);

console.log(
  '\nAdditional repairs applied: separate Agent dashboard, scoped registration status token, Staff review permission, and authenticated API audit events.'
);

console.log(
  'Schema table order: ' + ordered.map(t => t.name).join(' -> ')
);

console.log(
  'Manager policy: Dashboard, read-only registration GET, Reports and Profile Settings. Admin/Staff keep registration writes.'
);

console.log(
  'IMPORTANT: Rotate exposed credentials and clean old Git history; this script only untracks files in the current index.'
);