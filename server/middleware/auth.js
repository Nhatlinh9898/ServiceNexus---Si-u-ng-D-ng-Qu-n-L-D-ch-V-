// Authentication Middleware
// JWT token verification and user authentication

const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { AppError } = require('./errorHandler');
const pool = require('../config/database');

// Sign JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Create and send token
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  const cookieOptions = {
    expires: new Date(
      Date.now() +
        (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// Verify JWT token
const verifyToken = async (token) => {
  return await promisify(jwt.verify)(token, process.env.JWT_SECRET);
};

// Check if user is authenticated
const protect = async (req, res, next) => {
  try {
    // 1) Getting token and check if it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    // 2) Verification token
    const decoded = await verifyToken(token);

    // 3) Check if user still exists
    const currentUser = await pool.query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (currentUser.rows.length === 0) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    const user = currentUser.rows[0];

    // 4) Check if user is active
    if (!user.is_active) {
      return next(
        new AppError('Your account has been deactivated. Please contact support.', 401)
      );
    }

    // 5) Check if session is still valid
    const sessionResult = await pool.query(
      'SELECT is_active, expires_at FROM user_sessions WHERE session_token = $1',
      [token]
    );

    if (sessionResult.rows.length === 0 || !sessionResult.rows[0].is_active) {
      return next(
        new AppError('Invalid session. Please log in again.', 401)
      );
    }

    // Check if session expired
    if (new Date() > new Date(sessionResult.rows[0].expires_at)) {
      await pool.query('UPDATE user_sessions SET is_active = false WHERE session_token = $1', [token]);
      return next(
        new AppError('Session expired. Please log in again.', 401)
      );
    }

    // Update last accessed time
    await pool.query(
      'UPDATE user_sessions SET last_accessed = CURRENT_TIMESTAMP WHERE session_token = $1',
      [token]
    );

    // Grant access to protected route
    req.user = user;
    req.sessionToken = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired. Please log in again.', 401));
    }
    return next(error);
  }
};

// Role-based authorization
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// Check if user belongs to organization
const checkOrganizationAccess = async (req, res, next) => {
  try {
    const { organization_id } = req.params;
    const userId = req.user.id;

    // Super admin can access all organizations
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Check if user is member of the organization
    const memberResult = await pool.query(
      'SELECT id FROM organization_members WHERE user_id = $1 AND organization_id = $2 AND is_active = true',
      [userId, organization_id]
    );

    if (memberResult.rows.length === 0) {
      return next(
        new AppError('You do not have access to this organization', 403)
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Check if user can modify resource
const checkResourceOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Super admin can modify everything
    if (userRole === 'SUPER_ADMIN') {
      return next();
    }

    // Check resource ownership based on resource type
    const resourceType = req.baseUrl.split('/').pop();
    
    let query = '';
    let params = [];

    switch (resourceType) {
      case 'services':
        query = 'SELECT created_by, organization_id FROM service_records WHERE id = $1';
        params = [id];
        break;
      case 'organizations':
        query = 'SELECT created_by FROM organizations WHERE id = $1';
        params = [id];
        break;
      case 'departments':
        query = 'SELECT d.organization_id FROM departments d WHERE d.id = $1';
        params = [id];
        break;
      case 'employees':
        query = 'SELECT organization_id FROM employees WHERE id = $1';
        params = [id];
        break;
      default:
        return next(new AppError('Invalid resource type', 400));
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return next(new AppError('Resource not found', 404));
    }

    const resource = result.rows[0];

    // Check if user created the resource or is admin of the organization
    if (resource.created_by === userId) {
      return next();
    }

    // For organization resources, check if user is admin
    if (resource.organization_id) {
      const adminResult = await pool.query(
        'SELECT id FROM organization_members WHERE user_id = $1 AND organization_id = $2 AND role IN ($3, $4) AND is_active = true',
        [userId, resource.organization_id, 'ADMIN', 'MANAGER']
      );

      if (adminResult.rows.length > 0) {
        return next();
      }
    }

    return next(
      new AppError('You do not have permission to modify this resource', 403)
    );
  } catch (error) {
    next(error);
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (token) {
      const decoded = await verifyToken(token);
      const currentUser = await pool.query(
        'SELECT id, email, role, is_active FROM users WHERE id = $1',
        [decoded.id]
      );

      if (currentUser.rows.length > 0 && currentUser.rows[0].is_active) {
        req.user = currentUser.rows[0];
      }
    }

    next();
  } catch (error) {
    // Don't fail, just continue without user
    next();
  }
};

// Rate limiting for authentication endpoints
const authRateLimit = require('express-rate-limit');

const loginLimiter = authRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many login attempts from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = authRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registration requests per hour
  message: {
    error: 'Too many registration attempts from this IP, please try again after an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  signToken,
  createSendToken,
  protect,
  restrictTo,
  checkOrganizationAccess,
  checkResourceOwnership,
  optionalAuth,
  loginLimiter,
  registerLimiter,
};
