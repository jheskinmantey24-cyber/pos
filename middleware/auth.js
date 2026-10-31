const { ApiError } = require('./errorHandler');
const db = require('../config/db');
const { verifyToken } = require('../utils/auth');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const tokenFromCookie = req.cookies ? req.cookies.ghana_pos_token : null;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    return next(new ApiError(401, 'Authentication required.'));
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid or expired token.'));
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }

    return next();
  };
}

async function loadCurrentUser(req, res, next) {
  if (!req.user || !req.user.id) {
    return next();
  }

  try {
    const [rows] = await db.execute(
      'SELECT id, full_name, email, role, is_active, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id],
    );

    if (!rows.length) {
      return next(new ApiError(401, 'User account not found.'));
    }

    req.userProfile = rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  authenticate,
  authorize,
  loadCurrentUser,
};
