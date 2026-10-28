const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const usersRoutes = require('./usersRoutes');
const productsRoutes = require('./productsRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const salesRoutes = require('./salesRoutes');
const refundsRoutes = require('./refundsRoutes');
const reportsRoutes = require('./reportsRoutes');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API healthy' });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/products', productsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sales', salesRoutes);
router.use('/refunds', refundsRoutes);
router.use('/reports', reportsRoutes);

module.exports = router;
