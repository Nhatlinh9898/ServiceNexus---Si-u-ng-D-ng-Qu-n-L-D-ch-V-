// User Routes
// User management endpoints

const express = require('express');
const { AppError } = require('../middleware/errorHandler');
const { protect, restrictTo } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// All user routes require authentication
router.use(protect);

// Only admins and super admins can manage users
router.use(restrictTo('ADMIN', 'SUPER_ADMIN'));

// Get all users (admin only)
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT id, email, first_name, last_name, role, is_active, email_verified, 
             last_login, created_at, updated_at
      FROM users
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const countParams = [];
    let countIndex = 1;
    
    if (search) {
      countQuery += ` AND (first_name ILIKE $${countIndex} OR last_name ILIKE $${countIndex} OR email ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
      countIndex++;
    }
    
    if (role) {
      countQuery += ` AND role = $${countIndex}`;
      countParams.push(role);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalUsers = parseInt(countResult.rows[0].count);
    
    res.json({
      status: 'success',
      data: {
        users: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalUsers,
          pages: Math.ceil(totalUsers / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, is_active, email_verified, 
              last_login, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }
    
    res.json({
      status: 'success',
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, role, is_active } = req.body;
    
    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    
    if (existingUser.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }
    
    // Update user
    const result = await pool.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           role = COALESCE($3, role),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, first_name, last_name, role, is_active, updated_at`,
      [first_name, last_name, role, is_active, id]
    );
    
    res.json({
      status: 'success',
      message: 'User updated successfully',
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete user (soft delete - deactivate)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const existingUser = await pool.query('SELECT id, is_active FROM users WHERE id = $1', [id]);
    
    if (existingUser.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }
    
    // Soft delete (deactivate)
    await pool.query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    
    res.json({
      status: 'success',
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.post('/:id/change-password', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return next(new AppError('Current password and new password are required', 400));
    }
    
    if (new_password.length < 6) {
      return next(new AppError('New password must be at least 6 characters long', 400));
    }
    
    // Get user with password
    const result = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }
    
    const user = result.rows[0];
    
    // Verify current password
    const bcrypt = require('bcryptjs');
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    
    if (!isCurrentPasswordValid) {
      return next(new AppError('Current password is incorrect', 400));
    }
    
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);
    
    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, id]
    );
    
    res.json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
