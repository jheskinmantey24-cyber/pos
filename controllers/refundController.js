const db = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { calculateRefundAmount, calculateRefundStatus } = require('../utils/refunds');

async function getSaleReceipt(req, res, next) {
  const { saleId } = req.params;

  try {
    const [saleRows] = await db.execute(
      `SELECT s.*, u.full_name AS cashier_name
       FROM sales s
       INNER JOIN users u ON u.id = s.cashier_id
       WHERE s.id = ? LIMIT 1`,
      [saleId],
    );

    if (!saleRows.length) {
      return next(new ApiError(404, 'Sale not found.'));
    }

    const sale = saleRows[0];
    return res.status(200).json({
      status: 'success',
      receipt: {
        sale_number: sale.sale_number,
        cashier_name: sale.cashier_name,
        total_amount: Number(sale.net_amount || sale.total_amount),
        created_at: sale.created_at,
      },
      html: `<!DOCTYPE html><html><body><pre>${sale.sale_number} ${sale.cashier_name} GH₵ ${Number(sale.net_amount || sale.total_amount).toFixed(2)}</pre></body></html>`,
    });
  } catch (error) {
    return next(error);
  }
}

async function refundSale(req, res, next) {
  const { saleId } = req.params;
  const { amount, reason = 'customer_return' } = req.body || {};

  try {
    const [saleRows] = await db.execute(
      'SELECT * FROM sales WHERE id = ? LIMIT 1',
      [saleId],
    );

    if (!saleRows.length) {
      return next(new ApiError(404, 'Sale not found.'));
    }

    const sale = saleRows[0];
    const [saleItemsRows] = await db.execute('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [lockedSaleRows] = await connection.execute('SELECT * FROM sales WHERE id = ? FOR UPDATE', [saleId]);
      if (!lockedSaleRows.length) {
        await connection.rollback();
        return next(new ApiError(404, 'Sale not found.'));
      }

      const [existingRefundRows] = await connection.execute(
        'SELECT * FROM refunds WHERE sale_id = ? FOR UPDATE',
        [saleId],
      );
      const currentRefunded = existingRefundRows.reduce((sum, refund) => sum + Number(refund.amount || 0), 0);
      const remainingBalance = Math.max(Number(lockedSaleRows[0].net_amount || lockedSaleRows[0].total_amount) - currentRefunded, 0);
      const refundAmount = calculateRefundAmount(remainingBalance, Number(amount || remainingBalance));

      if (refundAmount <= 0) {
        await connection.rollback();
        return next(new ApiError(400, 'Refund amount must be greater than zero.'));
      }

      if (refundAmount > remainingBalance) {
        await connection.rollback();
        return next(new ApiError(400, 'Refund cannot exceed the remaining sale balance.'));
      }

      const productIds = [...new Set(saleItemsRows.map((item) => item.product_id))];
      const placeholders = productIds.length ? productIds.map(() => '?').join(', ') : 'NULL';
      const productRows = productIds.length
        ? (await connection.execute(`SELECT * FROM products WHERE id IN (${placeholders}) FOR UPDATE`, productIds))[0]
        : [];

      const productMap = new Map(productRows.map((product) => [product.id, product]));

      for (const item of saleItemsRows) {
        const product = productMap.get(item.product_id);
        if (product) {
          const updatedStock = Number(product.stock) + Number(item.quantity);
          await connection.execute('UPDATE products SET stock = ? WHERE id = ?', [updatedStock, item.product_id]);
        }
      }

      await connection.execute(
        'INSERT INTO refunds (sale_id, refunded_by, amount, reason) VALUES (?, ?, ?, ?)',
        [saleId, req.user.id, refundAmount, String(reason).trim() || 'customer_return'],
      );

      const nextTotalRefunded = currentRefunded + refundAmount;
      const nextStatus = calculateRefundStatus(Number(lockedSaleRows[0].net_amount || lockedSaleRows[0].total_amount), nextTotalRefunded);
      await connection.execute('UPDATE sales SET status = ? WHERE id = ?', [nextStatus, saleId]);

      await connection.commit();

      const [refundRows] = await connection.execute(
        'SELECT * FROM refunds WHERE sale_id = ? ORDER BY created_at DESC LIMIT 1',
        [saleId],
      );

      return res.status(200).json({
        status: 'success',
        message: 'Refund processed successfully.',
        refund: refundRows[0],
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

module.exports = {
  getSaleReceipt,
  refundSale,
};
