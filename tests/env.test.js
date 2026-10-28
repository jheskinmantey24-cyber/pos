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

test('validateEnv should accept a complete config', () => {
  const issues = validateEnv({
    JWT_SECRET: 'secret',
    DB_HOST: 'localhost',
    DB_USER: 'root',
    DB_NAME: 'jeskin_pos',
  });

  assert.deepEqual(issues, []);
});
