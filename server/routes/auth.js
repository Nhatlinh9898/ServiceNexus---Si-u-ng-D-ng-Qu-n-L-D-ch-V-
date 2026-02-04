// Authentication Routes
// Handles user registration, login, and token management

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError } = require('../middleware/errorHandler');
const { createSendToken, loginLimiter, registerLimiter } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  });
};

// Register new user
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, role = 'USER' } = req.body;

    // Validate input
    if (!email || !password || !first_name || !last_name) {
      return next(new AppError('Please provide all required fields', 400));
    }

    if (password.length < 6) {
      return next(new AppError('Password must be at least 6 characters long', 400));
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return next(new AppError('User with this email already exists', 400));
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email.toLowerCase(), passwordHash, first_name, last_name, role, true, false]
    );

    const user = result.rows[0];

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    await pool.query(
      `INSERT INTO user_sessions (user_id, session_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, token, refreshToken, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
    );

    // Send token using createSendToken
    createSendToken(user, 201, res);
  } catch (error) {
    next(error);
  }
});

// Login user
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Find user
    const result = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, role, is_active
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Invalid email or password', 401));
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return next(new AppError('Your account has been deactivated', 401));
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    await pool.query(
      `INSERT INTO user_sessions (user_id, session_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, token, refreshToken, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
    );

    // Send token using createSendToken
    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError('Refresh token is required', 400));
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Check if refresh token exists in database
    const sessionResult = await pool.query(
      `SELECT user_id, expires_at FROM user_sessions 
       WHERE refresh_token = $1 AND is_active = true`,
      [refreshToken]
    );

    if (sessionResult.rows.length === 0) {
      return next(new AppError('Invalid refresh token', 401));
    }

    const session = sessionResult.rows[0];

    // Check if token is expired
    if (new Date() > new Date(session.expires_at)) {
      await pool.query(
        'UPDATE user_sessions SET is_active = false WHERE refresh_token = $1',
        [refreshToken]
      );
      return next(new AppError('Refresh token expired', 401));
    }

    // Generate new tokens
    const newToken = generateToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    // Update session with new tokens
    await pool.query(
      `UPDATE user_sessions 
       SET session_token = $1, refresh_token = $2, last_accessed = CURRENT_TIMESTAMP
       WHERE refresh_token = $3`,
      [newToken, newRefreshToken, refreshToken]
    );

    res.json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid refresh token', 401));
    }
    next(error);
  }
});

// Logout user
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError('Refresh token is required', 400));
    }

    // Deactivate session
    await pool.query(
      'UPDATE user_sessions SET is_active = false WHERE refresh_token = $1',
      [refreshToken]
    );

    res.json({
      status: 'success',
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
});

// Get current user (protected route)
router.get('/me', async (req, res, next) => {
  try {
    // This would normally use authentication middleware
    // For now, we'll return a placeholder
    res.json({
      status: 'success',
      message: 'User profile endpoint',
      data: {
        user: null
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
