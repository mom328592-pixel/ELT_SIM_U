const bcrypt = require('bcryptjs');
const pool = require('./db');
require('dotenv').config();

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const fullname = process.env.ADMIN_FULLNAME || 'System Administrator';

  try {
    const [roles] = await pool.query(
      `SELECT id_role FROM roles WHERE role_name = 'Admin' LIMIT 1`
    );
    const [statuses] = await pool.query(
      `SELECT id_status_user FROM status_user WHERE status_name = 'Active' LIMIT 1`
    );

    if (!roles.length) throw new Error('Admin role not found. Run database/03_seed.sql first.');
    if (!statuses.length) throw new Error('Active user status not found. Run database/03_seed.sql first.');

    const hash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users
        (username, email, password_hash, fullname, id_role, id_status_user, failed_login_attempts, locked_until, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NULL, NULL)
       ON DUPLICATE KEY UPDATE
         email = VALUES(email),
         password_hash = VALUES(password_hash),
         fullname = VALUES(fullname),
         id_role = VALUES(id_role),
         id_status_user = VALUES(id_status_user),
         failed_login_attempts = 0,
         locked_until = NULL,
         deleted_at = NULL`,
      [username, email, hash, fullname, roles[0].id_role, statuses[0].id_status_user]
    );

    console.log('Admin created/updated successfully');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Email: ${email}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('CREATE ADMIN ERROR:', err.message);
  process.exit(1);
});
