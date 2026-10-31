const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
} = require('../controllers/productController');

const router = express.Router();

router.use(authenticate);
router.get('/categories', getCategories);
router.post('/categories', authorize('admin', 'manager'), createCategory);
router.get('/', listProducts);
router.get('/:id', getProductById);
router.post('/', authorize('admin', 'manager'), createProduct);
router.put('/:id', authorize('admin', 'manager'), updateProduct);
router.delete('/:id', authorize('admin', 'manager'), deleteProduct);

module.exports = router;
