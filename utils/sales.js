function roundCurrency(value) {
  return Number(Math.round((Number(value) + Number.EPSILON) * 100) / 100);
}

function calculateCartTotals(items, options = {}) {
  const safeItems = Array.isArray(items) ? items : [];
  const subtotal = safeItems.reduce((total, item) => {
    const unitPrice = Number(item.unit_price || 0);
    const quantity = Number(item.quantity || 0);
    return total + (unitPrice * quantity);
  }, 0);

  const discountAmount = roundCurrency(Number(options.discount || 0));
  const vatRate = Number(options.vatRate || 0.125);
  const taxableAmount = Math.max(roundCurrency(subtotal - discountAmount), 0);
  const vatAmount = roundCurrency(taxableAmount * vatRate);
  const total = roundCurrency(taxableAmount + vatAmount);

  return {
    subtotal: roundCurrency(subtotal),
    discountAmount,
    taxableAmount,
    vatAmount,
    total,
  };
}

function calculateStockAfterSale(currentStock, quantitySold) {
  return Number(currentStock) - Number(quantitySold);
}

module.exports = {
  calculateCartTotals,
  calculateStockAfterSale,
  roundCurrency,
};
