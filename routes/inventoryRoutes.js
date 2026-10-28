const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { listLowStock, adjustStock } = require('../controllers/inventoryController');

const router = express.Router();

router.use(authenticate);
router.get('/low-stock', authorize('admin', 'manager'), listLowStock);
router.post('/adjustments', authorize('admin', 'manager'), adjustStock);

module.exports = router;
