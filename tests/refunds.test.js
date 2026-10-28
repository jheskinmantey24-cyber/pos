const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateRefundAmount, calculateRefundStatus, buildReceiptHtml } = require('../utils/refunds');

test('calculateRefundAmount should return the correct refund for a full or partial refund', () => {
  assert.equal(calculateRefundAmount(100, 100), 100);
  assert.equal(calculateRefundAmount(100, 40), 40);
});

test('calculateRefundStatus should mark a sale as refunded only after the full amount has been returned', () => {
  assert.equal(calculateRefundStatus(100, 40), 'partial_refund');
  assert.equal(calculateRefundStatus(100, 100), 'refunded');
  assert.equal(calculateRefundStatus(100, 150), 'refunded');
});

test('buildReceiptHtml should include the sale number and GH₵ total without exposing unsafe data', () => {
  const html = buildReceiptHtml({
    sale_number: 'POS-123',
    cashier_name: 'Ada',
    total_amount: 25.5,
    created_at: '2026-10-28 10:00:00',
  });

  assert.match(html, /POS-123/);
  assert.match(html, /GH₵/);
  assert.match(html, /25\.50/);
  assert.doesNotMatch(html, /<script>/i);
});
