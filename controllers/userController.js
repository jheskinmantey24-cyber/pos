const db = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { hashPassword } = require('../utils/auth');

function sanitizeUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
  };
}

async function listUsers(req, res, next) {
  try {
    const [rows] = await db.execute(
      'SELECT id, full_name, email, role, is_active, created_at FROM users ORDER BY full_name ASC'
    );

    return res.status(200).json({
      status: 'success',
      users: rows.map(sanitizeUser),
    });
  } catch (error) {
    return next(error);
  }
}

async function getUserById(req, res, next) {
  const { id } = req.params;

  try {
    const [rows] = await db.execute(
      'SELECT id, full_name, email, role, is_active, created_at FROM users WHERE id = ? LIMIT 1',
      [id],
    );

    if (!rows.length) {
      return next(new ApiError(404, 'User not found.'));
    }

    return res.status(200).json({
      status: 'success',
      user: sanitizeUser(rows[0]),
    });
  } catch (error) {
    return next(error);
  }
}

async function createUser(req, res, next) {
  const { full_name, email, password, role = 'cashier', is_active = 1 } = req.body || {};

  try {
    if (!full_name || !email || !password) {
      return next(new ApiError(400, 'full_name, email, and password are required.'));
    }

    if (!['admin', 'manager', 'cashier'].includes(role)) {
      return next(new ApiError(400, 'Role must be one of admin, manager, or cashier.'));
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return next(new ApiError(400, 'Please provide a valid email address.'));
    }

    if (String(password).length < 6) {
      return next(new ApiError(400, 'Password must be at least 6 characters long.'));
    }

    const [existing] = await db.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
    if (existing.length) {
      return next(new ApiError(409, 'A user with this email already exists.'));
    }

    const passwordHash = await hashPassword(String(password));

    const [result] = await db.execute(
      'INSERT INTO users (full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
      [String(full_name).trim(), normalizedEmail, passwordHash, role, Number(is_active) ? 1 : 0],
    );

    const [rows] = await db.execute(
      'SELECT id, full_name, email, role, is_active, created_at FROM users WHERE id = ? LIMIT 1',
      [result.insertId],
    );

    return res.status(201).json({
      status: 'success',
      message: 'User created successfully.',
      user: sanitizeUser(rows[0]),
    });
  } catch (error) {
    return next(error);
  }
}

async function updateUser(req, res, next) {
  const { id } = req.params;
  const { full_name, email, role, is_active } = req.body || {};

  try {
    const [rows] = await db.execute(
      'SELECT id, full_name, email, role, is_active FROM users WHERE id = ? LIMIT 1',
      [id],
    );

    if (!rows.length) {
      return next(new ApiError(404, 'User not found.'));
    }

    const existing = rows[0];
    const nextFullName = full_name ? String(full_name).trim() : existing.full_name;
    const nextEmail = email ? String(email).trim().toLowerCase() : existing.email;
    const nextRole = role || existing.role;
    const nextActive = typeof is_active === 'undefined' ? existing.is_active : Number(is_active) ? 1 : 0;

    if (!['admin', 'manager', 'cashier'].includes(nextRole)) {
      return next(new ApiError(400, 'Role must be one of admin, manager, or cashier.'));
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      return next(new ApiError(400, 'Please provide a valid email address.'));
    }

    const [duplicate] = await db.execute('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1', [nextEmail, id]);
    if (duplicate.length) {
      return next(new ApiError(409, 'A user with this email already exists.'));
    }

    await db.execute(
      'UPDATE users SET full_name = ?, email = ?, role = ?, is_active = ? WHERE id = ?',
      [nextFullName, nextEmail, nextRole, nextActive, id],
    );

    const [updated] = await db.execute(
      'SELECT id, full_name, email, role, is_active, created_at FROM users WHERE id = ? LIMIT 1',
      [id],
    );

    return res.status(200).json({
      status: 'success',
      message: 'User updated successfully.',
      user: sanitizeUser(updated[0]),
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteUser(req, res, next) {
  const { id } = req.params;

  try {
    const [rows] = await db.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      return next(new ApiError(404, 'User not found.'));
    }

    if (Number(id) === req.user.id) {
      return next(new ApiError(400, 'You cannot delete your own account.'));
    }

    await db.execute('DELETE FROM users WHERE id = ?', [id]);

    return res.status(200).json({
      status: 'success',
      message: 'User deleted successfully.',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
