#!/usr/bin/env node
'use strict';

/**
 * Compatibility runner for the current ELT_SIM_U repository.
 * Updates the repair script to match current source patterns,
 * backs up affected files, runs the repair script, and rolls back
 * if a patch or verification fails.
 *
 * Run from the repository root:
 * node RUN_COMPLETE_REPAIRS.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync, execFileSync } = require('node:child_process');

const root = process.cwd();
const applierRel = path.join('ETL', 'APPLY.cjs');
const markerRel = path.join('.git', 'elt_sim_complete_repairs_applied');
const applier = path.join(root, applierRel);

const required = [
  applierRel,
  path.join('ETL', 'my-api', 'server.js'),
  path.join('ETL', 'my-api', 'controllers', 'agents.controller.js'),
  path.join('ETL', 'my-api', 'controllers', 'public-registration.controller.js'),
  path.join('ETL', 'my-api', 'controllers', 'registrations.controller.js'),
  path.join('ETL', 'my-api', 'database', '01_schema.sql'),
  path.join('ETL', 'my-api', 'middlewares', 'auth.middleware.js'),
  path.join('ETL', 'my-api', 'routes', 'public-registration.routes.js'),
  path.join('ETL', 'sim-frontend', 'src', 'App.jsx'),
  path.join('ETL', 'sim-frontend', 'src', 'pages', 'customer', 'CustomerRegistration.jsx'),
  path.join('ETL', 'sim-frontend', 'src', 'pages', 'admin', 'Agents.jsx'),
  path.join('ETL', 'sim-frontend', 'src', 'pages', 'admin', 'Registrations.jsx'),
];

// Files that ETL/APPLY.cjs may modify or create.
const affected = [
  '.gitignore',
  applierRel,
  path.join('ETL', 'SECURITY_REMEDIATION.md'),
  path.join('ETL', 'my-api', '.env.example'),
  path.join('ETL', 'my-api', 'controllers', 'auth.controller.js'),
  path.join('ETL', 'my-api', 'controllers', 'agents.controller.js'),
  path.join('ETL', 'my-api', 'controllers', 'agent-dashboard.controller.js'),
  path.join('ETL', 'my-api', 'controllers', 'public-registration.controller.js'),
  path.join('ETL', 'my-api', 'controllers', 'registrations.controller.js'),
  path.join('ETL', 'my-api', 'database', '01_schema.sql'),
  path.join('ETL', 'my-api', 'database', '02_agent_dashboard_and_status_token_migration.sql'),
  path.join('ETL', 'my-api', 'database', '03_finalize_agent_dashboard_tokens.sql'),
  path.join('ETL', 'my-api', 'middlewares', 'auth.middleware.js'),
  path.join('ETL', 'my-api', 'middlewares', 'passport-upload.middleware.js'),
  path.join('ETL', 'my-api', 'routes', 'agents.routes.js'),
  path.join('ETL', 'my-api', 'routes', 'public-registration.routes.js'),
  path.join('ETL', 'my-api', 'routes', 'registrations.routes.js'),
  path.join('ETL', 'my-api', 'server.js'),
  path.join('ETL', 'my-api', 'utils', 'audit.js'),
  path.join('ETL', 'sim-frontend', 'index.html'),
  path.join('ETL', 'sim-frontend', 'src', 'App.css'),
  path.join('ETL', 'sim-frontend', 'src', 'App.jsx'),
  path.join('ETL', 'sim-frontend', 'src', 'components', 'Sidebar.jsx'),
  path.join('ETL', 'sim-frontend', 'src', 'index.css'),
  path.join('ETL', 'sim-frontend', 'src', 'pages', 'admin', 'Agents.jsx'),
  path.join('ETL', 'sim-frontend', 'src', 'pages', 'admin', 'Registrations.jsx'),
  path.join('ETL', 'sim-frontend', 'src', 'pages', 'agent', 'AgentDashboard.jsx'),
  path.join('ETL', 'sim-frontend', 'src', 'pages', 'customer', 'CustomerRegistration.jsx'),
];

function fail(message, code = 1) {
  console.error(`\nERROR: ${message}`);
  process.exit(code);
}

if (!fs.existsSync(path.join(root, '.git')) || !fs.existsSync(applier)) {
  fail(
    'Run this file from the root of a fresh ELT_SIM_U checkout. ' +
    'ETL/APPLY.cjs and .git must exist.'
  );
}

if (fs.existsSync(path.join(root, markerRel))) {
  fail(
    'This repair bundle has already run here. Do not run it a second time; ' +
    'inspect git diff and follow README_LAO_COMPLETE.md.'
  );
}

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    fail(`Required current-project file is missing: ${rel}`);
  }
}

// Avoid overwriting already-staged work.
try {
  execFileSync(
    'git',
    ['diff', '--cached', '--quiet'],
    { cwd: root, stdio: 'ignore' }
  );
} catch {
  fail(
    'Git index already has staged changes. Commit or unstage them first, ' +
    'then run this script again.'
  );
}

const originalApplier = fs.readFileSync(applier, 'utf8');
let patchedApplier = originalApplier;

const compatibilityEdits = [
  {
    name: 'registrations route mount supports current roles',
    old: String.raw`/app\.use\(\s*"\/registrations",\s*authenticateToken,\s*authorizeRoles\(1, 2\),\s*registrationsRoutes\s*\);/`,
    fresh: String.raw`/app\.use\(\s*"\/registrations",\s*authenticateToken,\s*authorizeRoles\(1, 2(?:, 3)?\),\s*registrationsRoutes\s*\);/`,
  },
  {
    name: 'reports route mount supports current roles',
    old: String.raw`/app\.use\(\s*"\/reports",\s*authenticateToken,\s*authorizeRoles\(1, 2\),\s*reportsRoutes\s*\);/`,
    fresh: String.raw`/app\.use\(\s*"\/reports",\s*authenticateToken,\s*authorizeRoles\(1, 2(?:, 3)?\),\s*reportsRoutes\s*\);/`,
  },
  {
    name: 'Agent public URL helper may be multiline',
    old: String.raw`/const getPublicUrl = \(token\) =>[^\n]*\n/`,
    fresh: String.raw`/const getPublicUrl = \(token\) =>[\s\S]*?;\s*\n/`,
  },
];

for (const edit of compatibilityEdits) {
  if (patchedApplier.includes(edit.old)) {
    patchedApplier = patchedApplier.replace(edit.old, edit.fresh);
  } else if (!patchedApplier.includes(edit.fresh)) {
    fail(
      `ETL/APPLY.cjs does not match the expected current version ` +
      `(${edit.name}). No project files have been changed.`
    );
  }
}

for (const edit of compatibilityEdits) {
  if (!patchedApplier.includes(edit.fresh)) {
    fail(`Could not prepare compatibility update: ${edit.name}`);
  }
}

// Save snapshots for automatic rollback if a later patch fails.
const backupDir = fs.mkdtempSync(
  path.join(os.tmpdir(), 'eltsimu-complete-repair-')
);

const existedBefore = new Set();

for (const rel of affected) {
  const full = path.join(root, rel);

  if (fs.existsSync(full) && fs.statSync(full).isFile()) {
    existedBefore.add(rel);

    const backupPath = path.join(backupDir, rel);

    fs.mkdirSync(path.dirname(backupPath), {
      recursive: true,
    });

    fs.copyFileSync(full, backupPath);
  }
}

try {
  fs.writeFileSync(applier, patchedApplier, 'utf8');

  const syntax = spawnSync(
    process.execPath,
    ['--check', applierRel],
    { cwd: root, stdio: 'inherit' }
  );

  if (syntax.status !== 0) {
    throw new Error(
      'Updated ETL/APPLY.cjs failed Node syntax validation.'
    );
  }

  console.log(
    '\nCompatibility checks passed. Applying project repairs...\n'
  );

  const result = spawnSync(
    process.execPath,
    [applierRel],
    { cwd: root, stdio: 'inherit' }
  );

  if (result.error) throw result.error;

  if (result.status !== 0) {
    throw new Error(
      `ETL/APPLY.cjs exited with status ${result.status}.`
    );
  }

  // Manager can view dashboard/reports, but settings are Admin-only.
  const appPath = path.join(
    root,
    'ETL',
    'sim-frontend',
    'src',
    'App.jsx'
  );

  let appSource = fs.readFileSync(appPath, 'utf8');

  const settingsAt = appSource.indexOf('path="/settings"');

  if (settingsAt < 0) {
    throw new Error(
      'Could not validate the Settings route permission.'
    );
  }

  const nextRoute = appSource.indexOf(
    'path="',
    settingsAt + 'path="/settings"'.length
  );

  const routeEnd = nextRoute < 0 ? appSource.length : nextRoute;

  const settingsRoute = appSource.slice(settingsAt, routeEnd);

  if (!/allowedRoles=\{\s*\[/.test(settingsRoute)) {
    throw new Error(
      'Settings route has no allowedRoles guard.'
    );
  }

  const securedSettingsRoute = settingsRoute.replace(
    /allowedRoles=\{\s*\[[\s\S]*?\]\s*\}/,
    'allowedRoles={[\n                                1,\n                            ]}'
  );

  appSource =
    appSource.slice(0, settingsAt) +
    securedSettingsRoute +
    appSource.slice(routeEnd);

  fs.writeFileSync(appPath, appSource, 'utf8');

  const sidebarPath = path.join(
    root,
    'ETL',
    'sim-frontend',
    'src',
    'components',
    'Sidebar.jsx'
  );

  let sidebarSource = fs.readFileSync(sidebarPath, 'utf8');

  const settingsLinkPattern =
    /\{canSee\(1, 2, 3\) && \(\s*<NavLink\s+to="\/settings"/;

  if (settingsLinkPattern.test(sidebarSource)) {
    sidebarSource = sidebarSource.replace(
      settingsLinkPattern,
      '{canSee(1) && (\n                    <NavLink\n                        to="/settings"'
    );
  } else if (
    !/\{canSee\(1\) && \(\s*<NavLink\s+to="\/settings"/.test(
      sidebarSource
    )
  ) {
    throw new Error(
      'Could not secure the Settings navigation item.'
    );
  }

  fs.writeFileSync(sidebarPath, sidebarSource, 'utf8');

  // Verify important changes.
  const checks = [
    [
      path.join('ETL', 'my-api', 'database', '01_schema.sql'),
      /`agent_report_token`[\s\S]*`public_status_token`|`public_status_token`[\s\S]*`agent_report_token`/,
      'both token columns in clean-install schema',
    ],
    [
      path.join(
        'ETL',
        'my-api',
        'controllers',
        'agent-dashboard.controller.js'
      ),
      /agent_report_token/,
      'Agent aggregate dashboard controller',
    ],
    [
      path.join(
        'ETL',
        'my-api',
        'controllers',
        'public-registration.controller.js'
      ),
      /public_status_token/,
      'per-registration private status token',
    ],
    [
      path.join(
        'ETL',
        'my-api',
        'routes',
        'public-registration.routes.js'
      ),
      /registration-status\/:statusToken/,
      'private status token route',
    ],
    [
      path.join(
        'ETL',
        'sim-frontend',
        'src',
        'pages',
        'agent',
        'AgentDashboard.jsx'
      ),
      /agent-dashboard/,
      'public Agent dashboard page',
    ],
    [
      path.join('ETL', 'sim-frontend', 'src', 'App.jsx'),
      /path="\/agent-dashboard\/:reportToken"/,
      'Agent dashboard route',
    ],
    [
      path.join(
        'ETL',
        'sim-frontend',
        'src',
        'pages',
        'admin',
        'Agents.jsx'
      ),
      /dashboard_url/,
      'separate Agent dashboard link',
    ],
  ];

  for (const [rel, pattern, label] of checks) {
    const full = path.join(root, rel);

    if (
      !fs.existsSync(full) ||
      !pattern.test(fs.readFileSync(full, 'utf8'))
    ) {
      throw new Error(
        `Post-repair verification failed: ${label}.`
      );
    }
  }

  // Syntax-check changed backend files without connecting to the database.
  const backendJs = [
    path.join('ETL', 'my-api', 'server.js'),
    path.join('ETL', 'my-api', 'controllers', 'agents.controller.js'),
    path.join('ETL', 'my-api', 'controllers', 'agent-dashboard.controller.js'),
    path.join('ETL', 'my-api', 'controllers', 'public-registration.controller.js'),
    path.join('ETL', 'my-api', 'controllers', 'registrations.controller.js'),
    path.join('ETL', 'my-api', 'middlewares', 'auth.middleware.js'),
    path.join('ETL', 'my-api', 'middlewares', 'passport-upload.middleware.js'),
    path.join('ETL', 'my-api', 'routes', 'agents.routes.js'),
    path.join('ETL', 'my-api', 'routes', 'public-registration.routes.js'),
    path.join('ETL', 'my-api', 'routes', 'registrations.routes.js'),
    path.join('ETL', 'my-api', 'utils', 'audit.js'),
  ];

  for (const rel of backendJs) {
    const check = spawnSync(
      process.execPath,
      ['--check', rel],
      { cwd: root, stdio: 'inherit' }
    );

    if (check.status !== 0) {
      throw new Error(`Backend syntax check failed for ${rel}.`);
    }
  }

  // No commit or deployment is made automatically.
  fs.writeFileSync(
    path.join(root, markerRel),
    `Completed locally on ${new Date().toISOString()} by RUN_COMPLETE_REPAIRS.cjs.\n` +
    'Review git diff, run tests, apply database migrations only as documented, then commit.\n',
    'utf8'
  );

  console.log(
    '\nRepair script completed. No Git commit or deployment was made automatically.'
  );

  console.log(`Backup of previously existing modified files: ${backupDir}`);

  console.log('\nNext commands:');
  console.log('  git status');
  console.log('  git diff --check');
  console.log('  npm ci && npm run build   # from ETL/sim-frontend');
  console.log('  npm ci                    # from ETL/my-api');
  console.log(
    'Review the diff before committing. Keep the local .env file private.'
  );
} catch (error) {
  console.error(
    `\nRepair failed; restoring modified source files. Reason: ${error.message}`
  );

  for (const rel of affected) {
    const full = path.join(root, rel);

    if (existedBefore.has(rel)) {
      const backupPath = path.join(backupDir, rel);

      fs.mkdirSync(path.dirname(full), {
        recursive: true,
      });

      fs.copyFileSync(backupPath, full);
    } else if (fs.existsSync(full)) {
      fs.rmSync(full, {
        recursive: true,
        force: true,
      });
    }
  }

  try {
    execFileSync(
      'git',
      [
        'reset',
        '--quiet',
        'HEAD',
        '--',
        'ETL/my-api/.env',
        'ETL/my-api/node_modules',
        'ETL/my-api/uploads',
      ],
      { cwd: root, stdio: 'ignore' }
    );
  } catch {
    // Git index might not have changed before failure.
  }

  try {
    fs.rmSync(
      path.join(root, markerRel),
      { force: true }
    );
  } catch {}

  console.error(`Backup preserved at: ${backupDir}`);
  process.exitCode = 1;
}