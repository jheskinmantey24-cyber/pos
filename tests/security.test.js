const test = require('node:test');
const assert = require('node:assert/strict');

const { escapeHtml } = require('../utils/escape');

test('escapeHtml should neutralize script-like content before rendering to the browser', () => {
  const unsafe = '<script>alert("xss")</script>';
  const safe = escapeHtml(unsafe);

  assert.equal(safe.includes('<script>'), false);
  assert.equal(safe.includes('&lt;script&gt;'), true);
});
