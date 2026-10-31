const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateCartTotals, calculateStockAfterSale } = require('../utils/sales');

test('calculateCartTotals should recompute subtotal, discount, VAT, and total from server-side pricing', () => {
  const result = calculateCartTotals(
    [
      { unit_price: 10, quantity: 2 },
      { unit_price: 5, quantity: 1 },
    ],
    { discount: 2, vatRate: 0.125 },
  );

  assert.equal(result.subtotal, 25);
  assert.equal(result.discountAmount, 2);
  assert.equal(result.vatAmount, 2.88);
  assert.equal(result.total, 25.88);
});

test('calculateStockAfterSale should deduct sold quantities from inventory', () => {
  assert.equal(calculateStockAfterSale(10, 3), 7);
  assert.equal(calculateStockAfterSale(5, 6), -1);
});
