const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { refundSale, getSaleReceipt } = require('../controllers/refundController');

const router = express.Router();

router.use(authenticate);
router.get('/sales/:saleId/receipt', authorize('admin', 'manager', 'cashier'), getSaleReceipt);
router.post('/sales/:saleId/refund', authorize('admin', 'manager'), refundSale);

module.exports = router;
