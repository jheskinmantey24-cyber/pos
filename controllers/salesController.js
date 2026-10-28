const db = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { calculateCartTotals, calculateStockAfterSale } = require('../utils/sales');

function buildSaleNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `POS-${timestamp}-${random}`;
}

function mapPaymentMethods(payments) {
  return (payments || []).map((payment) => ({
    method: payment.method,
    amount: Number(payment.amount || 0),
    reference: payment.reference || null,
  }));
}

async function listSales(req, res, next) {
  const { status, start_date, end_date } = req.query;

  try {
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('s.status = ?');
      params.push(status);
    }

    if (start_date) {
      conditions.push('DATE(s.created_at) >= ?');
      params.push(start_date);
    }

    if (end_date) {
      conditions.push('DATE(s.created_at) <= ?');
      params.push(end_date);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await db.execute(
      `SELECT s.*, u.full_name AS cashier_name
       FROM sales s
       INNER JOIN users u ON u.id = s.cashier_id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT 100`,
      params,
    );

    return res.status(200).json({
      status: 'success',
      sales: rows,
      filters: {
        status: status || null,
        start_date: start_date || null,
        end_date: end_date || null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getSaleById(req, res, next) {
  const { id } = req.params;

  try {
    const [saleRows] = await db.execute(
      `SELECT s.*, u.full_name AS cashier_name
       FROM sales s
       INNER JOIN users u ON u.id = s.cashier_id
       WHERE s.id = ? LIMIT 1`,
      [id],
    );

    if (!saleRows.length) {
      return next(new ApiError(404, 'Sale not found.'));
    }

    const [itemRows] = await db.execute(
      `SELECT si.*, p.name AS product_name
       FROM sale_items si
       INNER JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?
       ORDER BY si.created_at ASC`,
      [id],
    );

    const [paymentRows] = await db.execute(
      'SELECT * FROM payments WHERE sale_id = ? ORDER BY created_at ASC',
      [id],
    );

    return res.status(200).json({
      status: 'success',
      sale: {
        ...saleRows[0],
        items: itemRows,
        payments: paymentRows,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function createSale(req, res, next) {
  const { items, discount_amount = 0, payment_method = 'cash', payments = [] } = req.body || {};

  try {
    if (!Array.isArray(items) || items.length === 0) {
      return next(new ApiError(400, 'At least one cart item is required.'));
    }

    const normalizedItems = items.map((item) => ({
      product_id: Number(item.product_id),
      quantity: Number(item.quantity),
    }));

    if (normalizedItems.some((item) => !item.product_id || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      return next(new ApiError(400, 'Each cart item must include a valid product_id and quantity greater than zero.'));
    }

    const productIds = normalizedItems.map((item) => item.product_id);
    const placeholders = productIds.map(() => '?').join(', ');
    const [productRows] = await db.execute(
      `SELECT * FROM products WHERE id IN (${placeholders})`,
      productIds,
    );

    if (productRows.length !== productIds.length) {
      return next(new ApiError(400, 'One or more products in the cart do not exist.'));
    }

    const productMap = new Map(productRows.map((product) => [product.id, product]));
    const saleItems = [];
    let subtotal = 0;

    for (const item of normalizedItems) {
      const product = productMap.get(item.product_id);
      if (!product || Number(product.is_active) !== 1) {
        return next(new ApiError(400, `Product ${item.product_id} is unavailable.`));
      }

      if (Number(product.stock) < item.quantity) {
        return next(new ApiError(400, `Insufficient stock for product: ${product.name}.`));
      }

      const unitPrice = Number(product.price);
      const totalAmount = roundCurrency(unitPrice * item.quantity);
      subtotal += totalAmount;
      saleItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        cost_price: Number(product.cost_price),
        total_amount: totalAmount,
      });
    }

    const computedTotals = calculateCartTotals(
      saleItems.map((item) => ({ unit_price: item.unit_price, quantity: item.quantity })),
      { discount: Number(discount_amount || 0), vatRate: 0.125 },
    );

    const normalizedPayments = mapPaymentMethods(payments);
    if (normalizedPayments.length === 0) {
      return next(new ApiError(400, 'At least one payment entry is required.'));
    }

    let totalPaid = normalizedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    if (totalPaid < computedTotals.total) {
      return next(new ApiError(400, 'Total paid is less than the sale total.'));
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const saleNumber = buildSaleNumber();
      const [saleResult] = await connection.execute(
        `INSERT INTO sales (sale_number, cashier_id, total_amount, discount_amount, vat_amount, net_amount, payment_method, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')`,
        [saleNumber, req.user.id, computedTotals.total, computedTotals.discountAmount, computedTotals.vatAmount, computedTotals.total, payment_method],
      );

      const saleId = saleResult.insertId;

      for (const item of saleItems) {
        await connection.execute(
          `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, cost_price, discount_amount, total_amount)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [saleId, item.product_id, item.quantity, item.unit_price, item.cost_price, 0, item.total_amount],
        );

        const product = productMap.get(item.product_id);
        const nextStock = calculateStockAfterSale(product.stock, item.quantity);
        await connection.execute('UPDATE products SET stock = ? WHERE id = ?', [nextStock, item.product_id]);
      }

      for (const payment of normalizedPayments) {
        await connection.execute(
          `INSERT INTO payments (sale_id, method, amount, reference)
           VALUES (?, ?, ?, ?)`,
          [saleId, payment.method, Number(payment.amount || 0), payment.reference || null],
        );
      }

      await connection.commit();

      const [saleRows] = await connection.execute(
        `SELECT s.*, u.full_name AS cashier_name
         FROM sales s
         INNER JOIN users u ON u.id = s.cashier_id
         WHERE s.id = ? LIMIT 1`,
        [saleId],
      );

      const [saleItemsRows] = await connection.execute(
        `SELECT si.*, p.name AS product_name, p.barcode
         FROM sale_items si
         INNER JOIN products p ON p.id = si.product_id
         WHERE si.sale_id = ?`,
        [saleId],
      );

      return res.status(201).json({
        status: 'success',
        message: 'Sale created successfully.',
        sale: {
          ...saleRows[0],
          items: saleItemsRows,
          total_paid: totalPaid,
          change: roundCurrency(totalPaid - computedTotals.total),
        },
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    return next(error);
  }
}

function roundCurrency(value) {
  return Number(Math.round((Number(value) + Number.EPSILON) * 100) / 100);
}

module.exports = {
  listSales,
  getSaleById,
  createSale,
};
