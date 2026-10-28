const db = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { isLowStock } = require('../utils/inventory');

function sanitizeProduct(product) {
  return {
    id: product.id,
    category_id: product.category_id,
    category_name: product.category_name || null,
    name: product.name,
    barcode: product.barcode,
    description: product.description || null,
    price: Number(product.price),
    cost_price: Number(product.cost_price),
    stock: Number(product.stock),
    low_stock_threshold: Number(product.low_stock_threshold),
    is_active: Boolean(product.is_active),
    is_low_stock: isLowStock(product),
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

async function listProducts(req, res, next) {
  try {
    const { search = '', category_id, include_inactive = 'false' } = req.query;
    const searchTerm = String(search).trim();

    let query = `
      SELECT p.*, c.name AS category_name
      FROM products p
      INNER JOIN categories c ON c.id = p.category_id
      WHERE 1 = 1
    `;
    const values = [];

    if (searchTerm) {
      query += ' AND (p.name LIKE ? OR p.barcode LIKE ?)';
      values.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    if (category_id) {
      query += ' AND p.category_id = ?';
      values.push(Number(category_id));
    }

    if (include_inactive !== 'true') {
      query += ' AND p.is_active = 1';
    }

    query += ' ORDER BY p.name ASC';

    const [rows] = await db.execute(query, values);

    return res.status(200).json({
      status: 'success',
      products: rows.map(sanitizeProduct),
    });
  } catch (error) {
    return next(error);
  }
}

async function getProductById(req, res, next) {
  const { id } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT p.*, c.name AS category_name
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       WHERE p.id = ? LIMIT 1`,
      [id],
    );

    if (!rows.length) {
      return next(new ApiError(404, 'Product not found.'));
    }

    return res.status(200).json({
      status: 'success',
      product: sanitizeProduct(rows[0]),
    });
  } catch (error) {
    return next(error);
  }
}

async function createProduct(req, res, next) {
  const {
    category_id,
    name,
    barcode,
    description,
    price,
    cost_price,
    stock = 0,
    low_stock_threshold = 5,
    is_active = 1,
  } = req.body || {};

  try {
    if (!category_id || !name || !barcode || !price || !cost_price) {
      return next(new ApiError(400, 'category_id, name, barcode, price, and cost_price are required.'));
    }

    const numericPrice = Number(price);
    const numericCostPrice = Number(cost_price);
    const numericStock = Number(stock);
    const numericThreshold = Number(low_stock_threshold);

    if (Number.isNaN(numericPrice) || Number.isNaN(numericCostPrice) || Number.isNaN(numericStock) || Number.isNaN(numericThreshold)) {
      return next(new ApiError(400, 'Price, cost price, stock, and threshold must be numeric values.'));
    }

    const trimmedName = String(name).trim();
    const trimmedBarcode = String(barcode).trim();

    if (!trimmedName || !trimmedBarcode) {
      return next(new ApiError(400, 'Product name and barcode are required.'));
    }

    const [categoryRows] = await db.execute('SELECT id FROM categories WHERE id = ? LIMIT 1', [category_id]);
    if (!categoryRows.length) {
      return next(new ApiError(400, 'Selected category does not exist.'));
    }

    const [existingRows] = await db.execute('SELECT id FROM products WHERE barcode = ? LIMIT 1', [trimmedBarcode]);
    if (existingRows.length) {
      return next(new ApiError(409, 'A product with this barcode already exists.'));
    }

    const [result] = await db.execute(
      `INSERT INTO products
       (category_id, name, barcode, description, price, cost_price, stock, low_stock_threshold, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(category_id),
        trimmedName,
        trimmedBarcode,
        description ? String(description).trim() : null,
        numericPrice,
        numericCostPrice,
        numericStock,
        numericThreshold,
        Number(is_active) ? 1 : 0,
      ],
    );

    const [rows] = await db.execute(
      `SELECT p.*, c.name AS category_name
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       WHERE p.id = ? LIMIT 1`,
      [result.insertId],
    );

    return res.status(201).json({
      status: 'success',
      message: 'Product created successfully.',
      product: sanitizeProduct(rows[0]),
    });
  } catch (error) {
    return next(error);
  }
}

async function updateProduct(req, res, next) {
  const { id } = req.params;
  const { category_id, name, barcode, description, price, cost_price, stock, low_stock_threshold, is_active } = req.body || {};

  try {
    const [rows] = await db.execute('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      return next(new ApiError(404, 'Product not found.'));
    }

    const existing = rows[0];
    const nextCategoryId = category_id ? Number(category_id) : existing.category_id;
    const nextName = name ? String(name).trim() : existing.name;
    const nextBarcode = barcode ? String(barcode).trim() : existing.barcode;
    const nextDescription = description !== undefined ? String(description).trim() : existing.description;
    const nextPrice = price !== undefined ? Number(price) : Number(existing.price);
    const nextCostPrice = cost_price !== undefined ? Number(cost_price) : Number(existing.cost_price);
    const nextStock = stock !== undefined ? Number(stock) : Number(existing.stock);
    const nextThreshold = low_stock_threshold !== undefined ? Number(low_stock_threshold) : Number(existing.low_stock_threshold);
    const nextIsActive = typeof is_active === 'undefined' ? Number(existing.is_active) : Number(is_active) ? 1 : 0;

    if (Number.isNaN(nextPrice) || Number.isNaN(nextCostPrice) || Number.isNaN(nextStock) || Number.isNaN(nextThreshold)) {
      return next(new ApiError(400, 'Price, cost price, stock, and threshold must be numeric values.'));
    }

    const [categoryRows] = await db.execute('SELECT id FROM categories WHERE id = ? LIMIT 1', [nextCategoryId]);
    if (!categoryRows.length) {
      return next(new ApiError(400, 'Selected category does not exist.'));
    }

    const [duplicateRows] = await db.execute('SELECT id FROM products WHERE barcode = ? AND id != ? LIMIT 1', [nextBarcode, id]);
    if (duplicateRows.length) {
      return next(new ApiError(409, 'A product with this barcode already exists.'));
    }

    await db.execute(
      `UPDATE products
       SET category_id = ?, name = ?, barcode = ?, description = ?, price = ?, cost_price = ?, stock = ?, low_stock_threshold = ?, is_active = ?
       WHERE id = ?`,
      [nextCategoryId, nextName, nextBarcode, nextDescription, nextPrice, nextCostPrice, nextStock, nextThreshold, nextIsActive, id],
    );

    const [updatedRows] = await db.execute(
      `SELECT p.*, c.name AS category_name
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       WHERE p.id = ? LIMIT 1`,
      [id],
    );

    return res.status(200).json({
      status: 'success',
      message: 'Product updated successfully.',
      product: sanitizeProduct(updatedRows[0]),
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteProduct(req, res, next) {
  const { id } = req.params;

  try {
    const [rows] = await db.execute('SELECT id FROM products WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      return next(new ApiError(404, 'Product not found.'));
    }

    await db.execute('DELETE FROM products WHERE id = ?', [id]);

    return res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    return next(error);
  }
}

async function getCategories(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM categories ORDER BY name ASC');
    return res.status(200).json({ status: 'success', categories: rows });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
};
