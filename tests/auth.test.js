const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-value-at-least-32-chars';

const { hashPassword, verifyPassword, generateToken, verifyToken } = require('../utils/auth');

test('hashPassword should create a bcrypt hash that matches the original password', async () => {
  const password = 'P@ssword123';
  const hash = await hashPassword(password);

  assert.notEqual(hash, password);
  const isValid = await verifyPassword(password, hash);
  assert.equal(isValid, true);
});

test('generateToken and verifyToken should round-trip with user identity and role', () => {
  const payload = { id: 7, role: 'manager', email: 'manager@example.com' };
  const token = generateToken(payload);
  const decoded = verifyToken(token);

  assert.equal(decoded.id, 7);
  assert.equal(decoded.role, 'manager');
  assert.equal(decoded.email, 'manager@example.com');
});
