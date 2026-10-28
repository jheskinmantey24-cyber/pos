const test = require('node:test');
const assert = require('node:assert/strict');

const { summarizeReportRows, buildDateFilter } = require('../utils/reports');

test('summarizeReportRows should aggregate sales totals, counts, and profit correctly', () => {
  const summary = summarizeReportRows([
    { net_amount: 100, total_amount: 100, cost_price: 30, quantity: 2, cashier_name: 'Alice', status: 'completed' },
    { net_amount: 200, total_amount: 200, cost_price: 40, quantity: 3, cashier_name: 'Alice', status: 'refunded' },
  ]);

  assert.equal(summary.salesCount, 2);
  assert.equal(summary.totalRevenue, 300);
  assert.equal(summary.totalProfit, 120);
  assert.deepEqual(summary.byCashier, [{ cashier_name: 'Alice', salesCount: 2, totalRevenue: 300 }]);
  assert.deepEqual(summary.byStatus, [{ status: 'completed', salesCount: 1, totalRevenue: 100 }, { status: 'refunded', salesCount: 1, totalRevenue: 200 }]);
});

test('buildDateFilter should convert a date range into a SQL-ready clause', () => {
  const clause = buildDateFilter('2026-01-01', '2026-01-31');
  assert.match(clause, /DATE\(created_at\) >=/i);
  assert.match(clause, /DATE\(created_at\) <=/i);
});
