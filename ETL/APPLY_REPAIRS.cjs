#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = process.cwd();
const apiDir = path.join(root, "ETL", "my-api");
const frontendDir = path.join(root, "ETL", "sim-frontend");

if (
    !fs.existsSync(path.join(apiDir, "server.js")) ||
    !fs.existsSync(path.join(frontendDir, "src", "App.jsx"))
) {
    console.error(
        "ERROR: Run this script from the ELT_SIM_U repository root."
    );
    process.exit(1);
}

function readFile(relativePath) {
    return fs.readFileSync(
        path.join(root, relativePath),
        "utf8"
    );
}

function writeFile(relativePath, content) {
    const fullPath = path.join(root, relativePath);

    fs.mkdirSync(path.dirname(fullPath), {
        recursive: true,
    });

    fs.writeFileSync(
        fullPath,
        content.replace(/\r?\n/g, "\n"),
        "utf8"
    );
}

function requireReplace(
    source,
    pattern,
    replacement,
    label
) {
    if (!pattern.test(source)) {
        throw new Error(
            `Could not find expected code: ${label}`
        );
    }

    return source.replace(pattern, replacement);
}

// =====================================================
// 1. FIX GLOBAL CSS
// =====================================================

writeFile(
    "ETL/sim-frontend/src/index.css",
    `/* Global reset. Component styles are in App.css. */

:root {
    font-family:
        Inter,
        "Noto Sans Lao",
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

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
// Manager = Role 3, NOT Agent
// =====================================================

let app = readFile(
    "ETL/sim-frontend/src/App.jsx"
);

// Clean the Access Denied button.
app = app.replace(
    /onClick=\{\(\) => \{\s*const user =\s*JSON\.parse\(\s*localStorage\.getItem\(\s*"user"\s*\)\s*\|\| "null"\s*\);\s*window\.location\.replace\("\/dashboard"\);\s*\}\}/,
    'onClick={() => window.location.replace("/dashboard")}'
);

// Remove an unused role variable after login.
app = app.replace(
    /const roleId =\s*Number\(\s*userData\.id_role \?\?\s*userData\.role_id\s*\);\s*\n\s*showToast\(/,
    "showToast("
);

function setRouteRoles(
    source,
    route,
    roles
) {
    const marker = `path="${route}"`;
    const start = source.indexOf(marker);

    if (start < 0) {
        throw new Error(
            `Missing frontend route: ${route}`
        );
    }

    const next = source.indexOf(
        'path="',
        start + marker.length
    );

    const end = next < 0 ? source.length : next;
    const section = source.slice(start, end);

    if (!/allowedRoles=\{\s*\[/.test(section)) {
        throw new Error(
            `allowedRoles not found for ${route}`
        );
    }

    const updated = section.replace(
        /allowedRoles=\{\s*\[[\s\S]*?\]\s*\}/,
        `allowedRoles={[\n                ${roles.join(",\n                ")},\n            ]}`
    );

    return (
        source.slice(0, start) +
        updated +
        source.slice(end)
    );
}

// Admin and Staff can use the operational modules.
// Manager can view Dashboard, Reports and Settings/Profile.
app = setRouteRoles(
    app,
    "/registrations",
    [1, 2]
);

app = setRouteRoles(
    app,
    "/sim-center",
    [1, 2]
);

app = setRouteRoles(
    app,
    "/management",
    [1, 2]
);

app = setRouteRoles(
    app,
    "/reports",
    [1, 2, 3]
);

app = setRouteRoles(
    app,
    "/settings",
    [1, 2, 3]
);

writeFile(
    "ETL/sim-frontend/src/App.jsx",
    app
);

// =====================================================
// 3. SIDEBAR PERMISSIONS
// =====================================================

let sidebar = readFile(
    "ETL/sim-frontend/src/components/Sidebar.jsx"
);

sidebar = requireReplace(
    sidebar,
    /\{canSee\(1, 2\) && \(\s*<NavLink\s+to="\/reports"/,
    '{canSee(1, 2, 3) && (\n                    <NavLink\n                        to="/reports"',
    "Manager Reports menu"
);

sidebar = requireReplace(
    sidebar,
    /\{canSee\(1, 2\) && \(\s*<NavLink\s+to="\/settings"/,
    '{canSee(1, 2, 3) && (\n                    <NavLink\n                        to="/settings"',
    "Manager Settings menu"
);

writeFile(
    "ETL/sim-frontend/src/components/Sidebar.jsx",
    sidebar
);

// =====================================================
// 4. AUTH CONTROLLER
// Remove duplicate account-lock check.
// Do NOT block Role 3 (Manager).
// =====================================================

let auth = readFile(
    "ETL/my-api/controllers/auth.controller.js"
);

auth = requireReplace(
    auth,
    /\n\s*if \(\n\s*user\.locked_until &&\n\s*new Date\(user\.locked_until\) >\n\s*new Date\(\)\n\s*\) \{\n\s*return res\.status\(423\)\.json\(\{\n\s*success: false,\n\s*message:\s*"Account temporarily locked\. Please try again later\.",\n\s*\}\);\n\s*\}\n/,
    "\n",
    "duplicate login-lock block"
);

auth = auth.replace(
    /\/\/ =================================================\n\/\/ AGENT LOGIN DISABLED\n\/\/ Agents use the public registration link only\.\n\/\/ =================================================\n\n\/\/ ---------------------------------------------\n\/\/ ACCOUNT LOCK CHECK\n\/\/ ----------------------------------------\n/,
    "\n"
);

writeFile(
    "ETL/my-api/controllers/auth.controller.js",
    auth
);

// =====================================================
// 5. BACKEND SECURITY AND API PERMISSIONS
// =====================================================

let server = readFile(
    "ETL/my-api/server.js"
);

server = requireReplace(
    server,
    /const cors = require\("cors"\);/,
    'const cors = require("cors");\nconst helmet = require("helmet");',
    "Helmet import"
);

server = requireReplace(
    server,
    /app\.set\("trust proxy", 1\);/,
    `app.set("trust proxy", 1);

// Security headers.
// CSP is disabled here because Swagger UI uses inline assets.
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    })
);`,
    "Helmet middleware"
);

// Registration handlers enforce permissions per operation.
server = requireReplace(
    server,
    /app\.use\(\s*"\/registrations",\s*authenticateToken,\s*authorizeRoles\(1, 2\),\s*registrationsRoutes\s*\);/,
    `app.use(
    "/registrations",
    authenticateToken,
    registrationsRoutes
);`,
    "registration router mount"
);

// Manager may access reports.
server = requireReplace(
    server,
    /app\.use\(\s*"\/reports",\s*authenticateToken,\s*authorizeRoles\(1, 2\),\s*reportsRoutes\s*\);/,
    `app.use(
    "/reports",
    authenticateToken,
    authorizeRoles(1, 2, 3),
    reportsRoutes
);`,
    "reports router mount"
);

// Remove the obsolete comment describing Role 3 as Agent.
server = server.replace(
    /\/\/ =====================================================\n\/\/ AGENT PORTAL\n\/\/ ROLE 3 ONLY\n\/\/ =====================================================\n/,
    ""
);

writeFile(
    "ETL/my-api/server.js",
    server
);

// =====================================================
// 6. REGISTRATION ROUTE PERMISSIONS
// READ: Admin, Staff, Manager
// WRITE: Admin, Staff
// =====================================================

let registrationRoutes = readFile(
    "ETL/my-api/routes/registrations.routes.js"
);

if (
    !registrationRoutes.includes(
        'const authorizeRoles = require("../middlewares/role.middleware");'
    )
) {
    registrationRoutes = requireReplace(
        registrationRoutes,
        /const router = express\.Router\(\);/,
        'const router = express.Router();\nconst authorizeRoles = require("../middlewares/role.middleware");',
        "registration role middleware import"
    );
}

const routeReplacements = [
    [
        'router.get("/", getAllRegistrations);',
        'router.get("/", authorizeRoles(1, 2, 3), getAllRegistrations);',
        "registration list GET permission"
    ],
    [
        'router.get("/:id", getRegistrationById);',
        'router.get("/:id", authorizeRoles(1, 2, 3), getRegistrationById);',
        "registration detail GET permission"
    ],
    [
        'router.post("/", createRegistration);',
        'router.post("/", authorizeRoles(1, 2), createRegistration);',
        "registration create permission"
    ],
    [
        'router.put("/:id", updateRegistration);',
        'router.put("/:id", authorizeRoles(1, 2), updateRegistration);',
        "registration update permission"
    ],
    [
        'router.delete("/:id", deleteRegistration);',
        'router.delete("/:id", authorizeRoles(1, 2), deleteRegistration);',
        "registration delete permission"
    ]
];

for (const [before, after, label] of routeReplacements) {
    if (registrationRoutes.includes(before)) {
        registrationRoutes = registrationRoutes.replace(
            before,
            after
        );
    } else if (!registrationRoutes.includes(after)) {
        throw new Error(
            `Could not apply ${label}`
        );
    }
}

writeFile(
    "ETL/my-api/routes/registrations.routes.js",
    registrationRoutes
);

// =====================================================
// 7. PASSPORT UPLOAD MIDDLEWARE
// =====================================================

writeFile(
    "ETL/my-api/middlewares/passport-upload.middleware.js",
    `const multer = require("multer");
const fs = require("fs");
const path = require("path");

const uploadDir = path.join(
    __dirname,
    "..",
    "uploads"
);

fs.mkdirSync(uploadDir, {
    recursive: true,
});

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },

    filename: (_req, file, cb) => {
        const uniqueSuffix =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1e9);

        cb(
            null,
            "passport-" +
                uniqueSuffix +
                path.extname(file.originalname).toLowerCase()
        );
    },
});

const allowedExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".heic",
    ".heif",
]);

const fileFilter = (_req, file, cb) => {
    const extension =
        path.extname(file.originalname).toLowerCase();

    const validExtension =
        allowedExtensions.has(extension);

    const validMime =
        file.mimetype.startsWith("image/") ||
        file.mimetype === "application/octet-stream";

    if (validExtension && validMime) {
        return cb(null, true);
    }

    return cb(
        new Error(
            "Only JPG, JPEG, PNG, WEBP, HEIC or HEIF passport images are allowed"
        ),
        false
    );
};

module.exports = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter,
});
`
);

// =====================================================
// 8. MYSQL SCHEMA
// Convert quoted identifiers to backticks.
// Order tables using their foreign-key dependencies.
// =====================================================

let schema = readFile(
    "ETL/my-api/database/01_schema.sql"
);

const matches = [
    ...schema.matchAll(
        /CREATE TABLE\s+"([^"]+)"\s*\([\s\S]*?^\);/gm
    )
];

if (matches.length !== 14) {
    throw new Error(
        `Expected 14 CREATE TABLE blocks; found ${matches.length}`
    );
}

const tables = matches.map((match) => ({
    name: match[1],
    sql: match[0],
}));

const knownTables = new Set(
    tables.map((table) => table.name)
);

const dependencies = (table) =>
    [
        ...table.sql.matchAll(
            /REFERENCES\s+"([^"]+)"/g
        )
    ]
        .map((match) => match[1])
        .filter(
            (name) =>
                knownTables.has(name) &&
                name !== table.name
        );

const pending = [...tables];
const ordered = [];

while (pending.length > 0) {
    const index = pending.findIndex((table) =>
        dependencies(table).every((dependency) =>
            ordered.some(
                (completed) =>
                    completed.name === dependency
            )
        )
    );

    if (index < 0) {
        throw new Error(
            "Unresolved/cyclic schema dependency: " +
                pending.map((table) => table.name).join(", ")
        );
    }

    ordered.push(
        pending.splice(index, 1)[0]
    );
}

schema =
    "SET FOREIGN_KEY_CHECKS = 0;\n\n" +
    ordered
        .map((table) =>
            table.sql.replace(
                /"([^"\n]+)"/g,
                "`$1`"
            )
        )
        .join("\n\n") +
    "\n\nSET FOREIGN_KEY_CHECKS = 1;\n";

if (schema.includes('"')) {
    throw new Error(
        "Schema still contains double-quoted identifiers."
    );
}

writeFile(
    "ETL/my-api/database/01_schema.sql",
    schema
);

// =====================================================
// 9. ROOT .gitignore
// =====================================================

writeFile(
    ".gitignore",
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

# Logs
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

# Editor files
.vscode/
.idea/
.DS_Store
`
);

// =====================================================
// 10. SAFE ENVIRONMENT TEMPLATE
// Do not put real credentials here.
// =====================================================

writeFile(
    "ETL/my-api/.env.example",
    `# Copy this file to .env for local development,
# or set these variables in the hosting provider.
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

// =====================================================
// 11. SECURITY NOTES
// =====================================================

writeFile(
    "ETL/SECURITY_REMEDIATION.md",
    `# Security and operational notes

## Required actions after credentials or customer documents
## have appeared in a public repository

1. Rotate the MySQL/database password in the provider.
2. Replace JWT_SECRET and JWT_REFRESH_SECRET with different,
   high-entropy values and redeploy the API.
3. Restrict repository access while reviewing the exposure.
4. Removing a file from the latest commit does not remove it
   from old commits, forks, or clones.
5. Keep .env, node_modules, and ETL/my-api/uploads/ out of Git.

## History cleanup

Back up the repository, then use git filter-repo to remove
ETL/my-api/.env and ETL/my-api/uploads/ from all reachable
commits. Coordinate before force-pushing. Rotate credentials
even after history cleanup.
`
);

// =====================================================
// 12. UNTRACK SENSITIVE/GENERATED LOCAL PATHS
// git rm --cached preserves local working copies.
// =====================================================

try {
    execFileSync(
        "git",
        [
            "rm",
            "--cached",
            "-r",
            "-f",
            "--ignore-unmatch",
            "--",
            "ETL/my-api/.env",
            "ETL/my-api/node_modules",
            "ETL/my-api/uploads",
        ],
        {
            cwd: root,
            stdio: "inherit",
        }
    );
} catch (error) {
    throw new Error(
        "Source files were written, but Git could not untrack " +
        ".env/node_modules/uploads. Review git status and untrack " +
        "those paths manually."
    );
}

console.log("");
console.log("========================================");
console.log("ELT_SIM_U repairs have been applied locally.");
console.log("Review changes before committing.");
console.log("========================================");
console.log(
    "SQL table order: " +
        ordered.map((table) => table.name).join(" -> ")
);