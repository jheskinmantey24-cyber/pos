function summarizeReportRows(rows = []) {
  const summary = rows.reduce(
    (acc, row) => {
      const netAmount = Number(row.net_amount || row.total_amount || 0);
      const saleCost = Number(row.cost_price || 0);
      const saleQuantity = Number(row.quantity || 1);
      const cashierName = row.cashier_name || 'Unknown';
      const status = row.status || 'completed';

      acc.salesCount += 1;
      acc.totalRevenue += netAmount;
      acc.totalProfit += Math.max(netAmount - saleCost * saleQuantity, 0);

      const cashierEntry = acc.byCashier.get(cashierName) || { cashier_name: cashierName, salesCount: 0, totalRevenue: 0 };
      cashierEntry.salesCount += 1;
      cashierEntry.totalRevenue += netAmount;
      acc.byCashier.set(cashierName, cashierEntry);

      const statusEntry = acc.byStatus.get(status) || { status, salesCount: 0, totalRevenue: 0 };
      statusEntry.salesCount += 1;
      statusEntry.totalRevenue += netAmount;
      acc.byStatus.set(status, statusEntry);

      return acc;
    },
    {
      salesCount: 0,
      totalRevenue: 0,
      totalProfit: 0,
      byCashier: new Map(),
      byStatus: new Map(),
    },
  );

  return {
    salesCount: summary.salesCount,
    totalRevenue: Number(summary.totalRevenue.toFixed(2)),
    totalProfit: Number(summary.totalProfit.toFixed(2)),
    byCashier: Array.from(summary.byCashier.values()).map((entry) => ({
      cashier_name: entry.cashier_name,
      salesCount: entry.salesCount,
      totalRevenue: Number(entry.totalRevenue.toFixed(2)),
    })),
    byStatus: Array.from(summary.byStatus.values()).map((entry) => ({
      status: entry.status,
      salesCount: entry.salesCount,
      totalRevenue: Number(entry.totalRevenue.toFixed(2)),
    })),
  };
}

function buildDateFilter(startDate, endDate) {
  const start = startDate ? `'${String(startDate).trim()}'` : 'NULL';
  const end = endDate ? `'${String(endDate).trim()}'` : 'NULL';

  const clauses = [];
  if (startDate) {
    clauses.push(`DATE(created_at) >= ${start}`);
  }
  if (endDate) {
    clauses.push(`DATE(created_at) <= ${end}`);
  }

  return clauses.length ? clauses.join(' AND ') : '1 = 1';
}

module.exports = {
  summarizeReportRows,
  buildDateFilter,
};
