const test = require('node:test');
const assert = require('node:assert/strict');

const { validateEnv } = require('../config/env');

test('validateEnv should flag missing required variables', () => {
  const issues = validateEnv({
    JWT_SECRET: '',
    DB_HOST: '',
    DB_USER: 'root',
    DB_NAME: '',
  });

  assert.ok(issues.includes('JWT_SECRET'));
  assert.ok(issues.includes('DB_HOST'));
  assert.ok(issues.includes('DB_NAME'));
});

test('validateEnv should reject insecure default secrets and weak JWT config', () => {
  const issues = validateEnv({
    JWT_SECRET: 'dev-secret-change-me',
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USER: 'root',
    DB_NAME: 'ghana_pos',
    CORS_ORIGIN: 'http://localhost:3000',
  });

  assert.ok(issues.includes('JWT_SECRET'));
});

test('validateEnv should accept a complete secure config', () => {
  const issues = validateEnv({
    JWT_SECRET: 'super-secure-jwt-secret-1234567890',
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USER: 'root',
    DB_NAME: 'jeskin_pos',
    CORS_ORIGIN: 'http://localhost:3000',
  });

  assert.deepEqual(issues, []);
});

test('validateEnv should accept a single-origin (same-domain) config without CORS_ORIGIN', () => {
  const issues = validateEnv({
    JWT_SECRET: 'super-secure-jwt-secret-1234567890',
    DB_HOST: 'remote.aivencloud.com',
    DB_PORT: '26074',
    DB_USER: 'avnadmin',
    DB_PASSWORD: 'secret-password',
    DB_NAME: 'defaultdb',
  });

  assert.deepEqual(issues, []);
});

test('validateEnv should reject a wildcard CORS_ORIGIN', () => {
  const issues = validateEnv({
    JWT_SECRET: 'super-secure-jwt-secret-1234567890',
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USER: 'root',
    DB_NAME: 'jeskin_pos',
    CORS_ORIGIN: '*',
  });

  assert.ok(issues.includes('CORS_ORIGIN'));
});
