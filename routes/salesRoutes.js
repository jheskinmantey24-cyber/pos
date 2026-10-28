const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { listSales, getSaleById, createSale } = require('../controllers/salesController');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize('admin', 'manager', 'cashier'), listSales);
router.get('/:id', authorize('admin', 'manager', 'cashier'), getSaleById);
router.post('/', authorize('cashier', 'manager', 'admin'), createSale);

module.exports = router;
