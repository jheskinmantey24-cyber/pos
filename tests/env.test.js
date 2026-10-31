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
