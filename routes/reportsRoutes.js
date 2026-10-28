const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getSalesReport } = require('../controllers/reportController');

const router = express.Router();

router.use(authenticate);
router.get('/sales', authorize('admin', 'manager'), getSalesReport);

module.exports = router;
