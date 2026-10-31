const express = require('express');
const router = express.Router();
const db = require('../config/db');

const authRoutes = require('./authRoutes');
const usersRoutes = require('./usersRoutes');
const productsRoutes = require('./productsRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const salesRoutes = require('./salesRoutes');
const refundsRoutes = require('./refundsRoutes');
const reportsRoutes = require('./reportsRoutes');

router.get('/health', async (req, res) => {
  try {
    await db.checkConnection();
    return res.json({ status: 'ok', database: 'connected', message: 'API healthy' });
  } catch (error) {
    // Report unavailability only; never expose connection details or credentials.
    return res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/products', productsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sales', salesRoutes);
router.use('/refunds', refundsRoutes);
router.use('/reports', reportsRoutes);

module.exports = router;
