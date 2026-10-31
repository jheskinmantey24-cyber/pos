const db = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { buildDateFilter, summarizeReportRows } = require('../utils/reports');

async function getSalesReport(req, res, next) {
  const { start_date, end_date, period = 'daily' } = req.query;

  try {
    const dateFilter = buildDateFilter(start_date, end_date);

    const [rows] = await db.execute(
      `SELECT s.id, s.sale_number, s.created_at, s.net_amount, s.total_amount,
              s.status, u.full_name AS cashier_name,
              si.quantity, p.cost_price
       FROM sales s
       INNER JOIN users u ON u.id = s.cashier_id
       LEFT JOIN sale_items si ON si.sale_id = s.id
       LEFT JOIN products p ON p.id = si.product_id
       WHERE ${dateFilter}
       ORDER BY s.created_at DESC`,
    );

    const summary = summarizeReportRows(rows);

    return res.status(200).json({
      status: 'success',
      period,
      filter: { start_date: start_date || null, end_date: end_date || null },
      summary,
      rows,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSalesReport,
};
