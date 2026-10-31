const path = require('node:path');
const { after, test } = require('node:test');
const assert = require('node:assert/strict');

const { validateEnv } = require('../config/env');
const db = require('../config/db');

after(async () => {
  await db.end();
});

const remoteHost = process.env.DB_HOST && !['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST);

test('validateEnv requires DB_PASSWORD in production', () => {
  const issues = validateEnv({
    NODE_ENV: 'production',
    JWT_SECRET: 'super-secure-jwt-secret-1234567890',
    DB_HOST: 'example.aivencloud.com',
    DB_PORT: '12345',
    DB_USER: 'avnadmin',
    DB_NAME: 'defaultdb',
    CORS_ORIGIN: 'https://example.onrender.com',
  });

  assert.ok(issues.includes('DB_PASSWORD'));
});

test('buildConnectionConfig fails when production credentials are missing (no localhost fallback)', () => {
  assert.throws(() => db.buildConnectionConfig({ NODE_ENV: 'production' }), /DB_HOST/);
});

test('buildConnectionConfig keeps local development behavior without SSL', () => {
  const config = db.buildConnectionConfig({
    NODE_ENV: 'development',
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USER: 'root',
    DB_PASSWORD: '',
    DB_NAME: 'ghana_pos',
  });

  assert.equal(config.host, 'localhost');
  assert.equal(config.user, 'root');
  assert.equal(config.database, 'ghana_pos');
  assert.equal(config.ssl, undefined);
});

test('buildConnectionConfig enables verified SSL with the Aiven CA certificate', () => {
  const config = db.buildConnectionConfig({
    NODE_ENV: 'production',
    DB_HOST: 'example.aivencloud.com',
    DB_PORT: '12345',
    DB_USER: 'avnadmin',
    DB_PASSWORD: 'placeholder-not-a-real-secret',
    DB_NAME: 'defaultdb',
    DB_SSL_CA: path.join(__dirname, '..', 'ca.pem'),
  });

  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl.minVersion, 'TLSv1.2');
  assert.ok(String(config.ssl.ca).includes('BEGIN CERTIFICATE'));
});

test('buildConnectionConfig never exposes the password property in error paths', () => {
  try {
    db.buildConnectionConfig({
      NODE_ENV: 'production',
      DB_HOST: 'example.aivencloud.com',
      DB_PORT: '12345',
      DB_USER: 'avnadmin',
      DB_PASSWORD: 'placeholder-not-a-real-secret',
      DB_NAME: 'defaultdb',
      DB_SSL_CA: path.join(__dirname, 'does-not-exist-ca.pem'),
    });
    assert.fail('expected buildConnectionConfig to throw');
  } catch (error) {
    assert.ok(!String(error.message).includes('placeholder-not-a-real-secret'));
  }
});

test('real MySQL connectivity (runs only when a remote DB_HOST is configured)', { skip: !remoteHost }, async () => {
  await db.checkConnection();
});
