function calculateRefundAmount(saleTotal, refundAmount) {
  const total = Number(saleTotal || 0);
  const amount = Number(refundAmount || 0);
  return Math.min(Math.max(amount, 0), total);
}

function calculateRefundStatus(saleTotal, refundedAmount) {
  const total = Number(saleTotal || 0);
  const alreadyRefunded = Number(refundedAmount || 0);

  if (alreadyRefunded >= total) {
    return 'refunded';
  }

  return 'partial_refund';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildReceiptHtml(sale) {
  const saleNumber = escapeHtml(sale.sale_number || 'Unknown Sale');
  const cashierName = escapeHtml(sale.cashier_name || 'Cashier');
  const totalAmount = Number(sale.total_amount || 0).toFixed(2);
  const createdAt = escapeHtml(sale.created_at || new Date().toISOString());

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Receipt - ${saleNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
          .receipt { max-width: 420px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 16px; }
          .meta { margin-bottom: 12px; }
          .total { font-size: 22px; font-weight: bold; margin-top: 12px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h2>JESKIN POS</h2>
            <div>Receipt</div>
          </div>
          <div class="meta">
            <div>Sale: ${saleNumber}</div>
            <div>Cashier: ${cashierName}</div>
            <div>Date: ${createdAt}</div>
          </div>
          <hr />
          <div class="total">Total: GH₵ ${totalAmount}</div>
        </div>
      </body>
    </html>
  `;
}

module.exports = {
  calculateRefundAmount,
  calculateRefundStatus,
  buildReceiptHtml,
};
