 const db = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { hashPassword, verifyPassword, generateToken } = require('../utils/auth');

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

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return next(new ApiError(400, 'Email and password are required.'));
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return next(new ApiError(400, 'Please provide a valid email address.'));
    }

    const [rows] = await db.execute(
      'SELECT id, full_name, email, password_hash, role, is_active, created_at FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail],
    );

    if (!rows.length) {
      return next(new ApiError(401, 'Invalid email or password.'));
    }

    const user = rows[0];
    if (!user.is_active) {
      return next(new ApiError(401, 'This account is inactive.'));
    }

    const validPassword = await verifyPassword(String(password), user.password_hash);
    if (!validPassword) {
      return next(new ApiError(401, 'Invalid email or password.'));
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    };

    res.cookie('ghana_pos_token', token, cookieOptions);

    return res.status(200).json({
      status: 'success',
      message: 'Login successful.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res) {
  res.clearCookie('ghana_pos_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return res.status(200).json({
    status: 'success',
    message: 'Logout successful.',
  });
}

async function me(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    const [rows] = await db.execute(
      'SELECT id, full_name, email, role, is_active, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id],
    );

    if (!rows.length) {
      return next(new ApiError(404, 'User profile not found.'));
    }

    return res.status(200).json({
      status: 'success',
      user: sanitizeUser(rows[0]),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  logout,
  me,
  sanitizeUser,
  hashPassword,
};
