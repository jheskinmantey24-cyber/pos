const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

require('./env');

const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

function fail(message) {
  throw new Error(message);
}

function requireEnv(env, key) {
  const value = env[key];
  if (value === undefined || String(value).trim() === '') {
    fail(`Missing or empty required environment variable: ${key}`);
  }
}

function isProductionEnv(env = process.env) {
  return String(env.NODE_ENV || '').trim().toLowerCase() === 'production';
}

function buildConnectionConfig(env = process.env) {
  const production = isProductionEnv(env);

  // In production, never silently fall back to localhost/root/empty password.
  if (production) {
    ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].forEach((key) => requireEnv(env, key));
  }

  const host = env.DB_HOST ? String(env.DB_HOST).trim() : 'localhost';
  const remoteDatabase = !localHosts.has(host);

  const config = {
    host,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'ghana_pos',
    waitForConnections: true,
    connectionLimit: Number(env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    charset: 'utf8mb4',
    connectTimeout: 15000,
    enableKeepAlive: true,
  };

  // SSL is enabled for every remote database (e.g. Aiven MySQL on Render).
  // Set DB_SSL=false to explicitly opt out (local development only).
  const sslExplicitlyOff = String(env.DB_SSL || '').trim().toLowerCase() === 'false';
  const sslRequested = String(env.DB_SSL || '').trim().toLowerCase() === 'true';

  if (!sslExplicitlyOff && remoteDatabase) {
    const caPath = env.DB_SSL_CA || path.join(__dirname, '..', 'ca.pem');

    if (fs.existsSync(caPath)) {
      config.ssl = {
        ca: fs.readFileSync(caPath, 'ascii'),
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      };
    } else if (sslRequested || production) {
      fail(
        'Remote database configured but the Aiven CA certificate was not found. ' +
          'Add ca.pem to the project root or set DB_SSL_CA to its path.'
      );
    } else {
      console.warn(
        'Remote database configured but no CA certificate found (ca.pem or DB_SSL_CA); connecting without SSL.'
      );
    }
  }

  return config;
}

const pool = mysql.createPool(buildConnectionConfig());

async function checkConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

pool.checkConnection = checkConnection;
pool.buildConnectionConfig = buildConnectionConfig;

module.exports = pool;
