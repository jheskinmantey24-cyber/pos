const test = require('node:test');
const assert = require('node:assert/strict');

const { isLowStock, calculateNewStock, buildLowStockSummary } = require('../utils/inventory');

test('isLowStock should flag products at or below their threshold', () => {
  assert.equal(isLowStock({ stock: 5, low_stock_threshold: 5 }), true);
  assert.equal(isLowStock({ stock: 6, low_stock_threshold: 5 }), false);
});

test('calculateNewStock should reflect quantity changes correctly', () => {
  assert.equal(calculateNewStock(10, -2), 8);
  assert.equal(calculateNewStock(10, 3), 13);
});

test('buildLowStockSummary should add the low stock flag to each product', () => {
  const summary = buildLowStockSummary([
    { id: 1, name: 'Water', barcode: 'A1', stock: 3, low_stock_threshold: 5 },
    { id: 2, name: 'Bread', barcode: 'A2', stock: 8, low_stock_threshold: 5 },
  ]);

  assert.equal(summary[0].is_low_stock, true);
  assert.equal(summary[1].is_low_stock, false);
});
