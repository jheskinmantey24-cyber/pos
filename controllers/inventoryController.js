const db = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { calculateNewStock, buildLowStockSummary } = require('../utils/inventory');

async function listLowStock(req, res, next) {
  try {
    const [rows] = await db.execute(
      `SELECT p.*, c.name AS category_name
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = 1 AND p.stock <= p.low_stock_threshold
       ORDER BY p.stock ASC, p.name ASC`,
    );

    return res.status(200).json({
      status: 'success',
      products: buildLowStockSummary(rows),
    });
  } catch (error) {
    return next(error);
  }
}

async function adjustStock(req, res, next) {
  const { product_id, quantity_change, reason = 'manual_adjustment', notes } = req.body || {};

  try {
    if (!product_id || typeof quantity_change === 'undefined') {
      return next(new ApiError(400, 'product_id and quantity_change are required.'));
    }

    const change = Number(quantity_change);
    if (Number.isNaN(change)) {
      return next(new ApiError(400, 'quantity_change must be a numeric value.'));
    }

    const [productRows] = await db.execute('SELECT * FROM products WHERE id = ? LIMIT 1', [product_id]);
    if (!productRows.length) {
      return next(new ApiError(404, 'Product not found.'));
    }

    const product = productRows[0];
    const previousStock = Number(product.stock);
    const newStock = calculateNewStock(previousStock, change);

    if (newStock < 0) {
      return next(new ApiError(400, 'Inventory adjustment would make stock negative.'));
    }

    const [result] = await db.execute(
      `INSERT INTO stock_adjustments (product_id, user_id, reason, quantity_change, previous_stock, new_stock, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product_id, req.user.id, String(reason).trim() || 'manual_adjustment', change, previousStock, newStock, notes ? String(notes).trim() : null],
    );

    await db.execute('UPDATE products SET stock = ? WHERE id = ?', [newStock, product_id]);

    const [updatedProduct] = await db.execute('SELECT * FROM products WHERE id = ? LIMIT 1', [product_id]);

    return res.status(201).json({
      status: 'success',
      message: 'Stock adjustment saved successfully.',
      adjustment_id: result.insertId,
      product: updatedProduct[0],
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listLowStock,
  adjustStock,
};
