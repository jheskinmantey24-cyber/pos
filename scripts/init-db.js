/**
 * Idempotent database initialization.
 *
 * Replays the CREATE TABLE IF NOT EXISTS statements from schema.sql against the
 * configured database (Aiven MySQL or local MySQL). It:
 *   - never drops or alters existing tables,
 *   - never inserts data (no users, no products, no seeds),
 *   - creates the database first ONLY if it does not already exist.
 *
 * Run once (locally or via Render shell) after setting DB_* variables:
 *   npm run init-db
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

require('../config/env');
const db = require('../config/db');

const schemaPath = path.join(__dirname, '..', 'schema.sql');

function extractTableStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    // CREATE DATABASE / USE lines are intentionally excluded: the target
    // database name comes from DB_NAME (e.g. defaultdb on Aiven).
    .filter((statement) => !/^CREATE\s+DATABASE\b/i.test(statement))
    .filter((statement) => !/^USE\b/i.test(statement));
}

async function ensureDatabaseExists(database) {
  if (!database) {
    return;
  }

  const config = db.buildConnectionConfig(process.env);
  const bootstrap = await mysql.createConnection({ ...config, database: undefined });

  try {
    const escaped = database.replace(/`/g, '');
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${escaped}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await bootstrap.end();
  }
}

async function main() {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const statements = extractTableStatements(sql);

  try {
    await ensureDatabaseExists(process.env.DB_NAME || 'ghana_pos');
  } catch (error) {
    // Usually means the database already exists (Aiven creates defaultdb) or
    // the account lacks CREATE DATABASE privilege - the tables step will fail
    // clearly below if that is actually a problem.
    const detail = error && error.code ? ` (${error.code})` : '';
    console.warn(`Could not verify/create database; continuing if it already exists${detail}`);
  }

  for (const statement of statements) {
    await db.query(statement);
  }

  console.log(
    `Database initialization complete: ${statements.length} statements ensured (idempotent, no data removed).`
  );
  await db.end();
}

main().catch((error) => {
  const detail = error && error.code ? ` (${error.code})` : '';
  console.error('Database initialization failed.' + detail);
  console.error('Check that DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME are correct and reachable.');
  process.exit(1);
});
