/**
 * Creates the first administrator account for a fresh production database.
 *
 * Credentials come from environment variables only - never hard-coded:
 *   ADMIN_EMAIL      (required) login email
 *   ADMIN_PASSWORD   (required) at least 10 characters
 *   ADMIN_FULL_NAME  (optional, default "Administrator")
 *   ADMIN_ROLE       (optional, default "admin"; admin | manager | cashier)
 *
 * It never prints the password or stores it anywhere except as a bcrypt hash.
 * Run it on Render (shell) or locally against the same DB_* variables:
 *   ADMIN_EMAIL=me@example.com ADMIN_PASSWORD=... npm run create-admin
 */
require('../config/env');
const db = require('../config/db');
const { hashPassword } = require('../utils/auth');

async function main() {
  const fullName = process.env.ADMIN_FULL_NAME || 'Administrator';
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const role = process.env.ADMIN_ROLE || 'admin';

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required (values are never logged).');
    process.exit(1);
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('ADMIN_EMAIL must be a valid email address.');
    process.exit(1);
    return;
  }

  if (password.length < 10) {
    console.error('ADMIN_PASSWORD must be at least 10 characters long.');
    process.exit(1);
    return;
  }

  if (!['admin', 'manager', 'cashier'].includes(role)) {
    console.error('ADMIN_ROLE must be one of: admin, manager, cashier.');
    process.exit(1);
    return;
  }

  const passwordHash = await hashPassword(password);

  try {
    const [result] = await db.execute(
      'INSERT INTO users (full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
      [fullName, email, passwordHash, role],
    );
    console.log(`Admin user created successfully (id ${result.insertId}).`);
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      console.error('A user with that email already exists. No changes were made.');
      process.exit(1);
      return;
    }
    throw error;
  }

  await db.end();
}

main().catch((error) => {
  const detail = error && error.code ? ` (${error.code})` : '';
  console.error('Admin creation failed.' + detail);
  process.exit(1);
});
