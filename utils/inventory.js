function isLowStock(product) {
  if (!product) return false;
  const stock = Number(product.stock ?? 0);
  const threshold = Number(product.low_stock_threshold ?? 0);
  return stock <= threshold;
}

function calculateNewStock(currentStock, quantityChange) {
  const parsedCurrent = Number(currentStock || 0);
  const parsedChange = Number(quantityChange || 0);
  return parsedCurrent + parsedChange;
}

function buildLowStockSummary(products) {
  return (products || []).map((product) => ({
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    stock: Number(product.stock || 0),
    low_stock_threshold: Number(product.low_stock_threshold || 0),
    is_low_stock: isLowStock(product),
  }));
}

module.exports = {
  isLowStock,
  calculateNewStock,
  buildLowStockSummary,
};
