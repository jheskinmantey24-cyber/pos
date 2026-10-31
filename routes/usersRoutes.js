const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize('admin', 'manager'), listUsers);
router.get('/:id', authorize('admin', 'manager'), getUserById);
router.post('/', authorize('admin'), createUser);
router.put('/:id', authorize('admin', 'manager'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
