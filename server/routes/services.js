// Service Records Routes
// Core business service management endpoints

const express = require('express');
const { AppError } = require('../middleware/errorHandler');
const { protect, checkOrganizationAccess, checkResourceOwnership } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// All service routes require authentication
router.use(protect);

// Get all service records with filtering and pagination
router.get('/', async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      priority = '',
      industry_type = '',
      organization_id = '',
      date_from = '',
      date_to = '',
      assigned_to = ''
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT sr.*, 
             o.name as organization_name,
             e.name as assigned_employee_name,
             u.email as created_by_email,
             u2.email as updated_by_email
      FROM service_records sr
      LEFT JOIN organizations o ON sr.organization_id = o.id
      LEFT JOIN employees e ON sr.assigned_to = e.id
      JOIN users u ON sr.created_by = u.id
      LEFT JOIN users u2 ON sr.updated_by = u2.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (sr.title ILIKE $${paramIndex} OR sr.customer_name ILIKE $${paramIndex} OR sr.notes ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND sr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (priority) {
      query += ` AND sr.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }
    
    if (industry_type) {
      query += ` AND sr.industry_type = $${paramIndex}`;
      params.push(industry_type);
      paramIndex++;
    }
    
    if (organization_id) {
      query += ` AND sr.organization_id = $${paramIndex}`;
      params.push(organization_id);
      paramIndex++;
    }
    
    if (assigned_to) {
      query += ` AND sr.assigned_to = $${paramIndex}`;
      params.push(assigned_to);
      paramIndex++;
    }
    
    if (date_from) {
      query += ` AND sr.date >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }
    
    if (date_to) {
      query += ` AND sr.date <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }
    
    query += ` ORDER BY sr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM service_records sr
      WHERE 1=1
    `;
    
    const countParams = [];
    let countIndex = 1;
    
    if (search) {
      countQuery += ` AND (sr.title ILIKE $${countIndex} OR sr.customer_name ILIKE $${countIndex} OR sr.notes ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
      countIndex++;
    }
    
    if (status) {
      countQuery += ` AND sr.status = $${countIndex}`;
      countParams.push(status);
      countIndex++;
    }
    
    if (priority) {
      countQuery += ` AND sr.priority = $${countIndex}`;
      countParams.push(priority);
      countIndex++;
    }
    
    if (industry_type) {
      countQuery += ` AND sr.industry_type = $${countIndex}`;
      countParams.push(industry_type);
      countIndex++;
    }
    
    if (organization_id) {
      countQuery += ` AND sr.organization_id = $${countIndex}`;
      countParams.push(organization_id);
      countIndex++;
    }
    
    if (assigned_to) {
      countQuery += ` AND sr.assigned_to = $${countIndex}`;
      countParams.push(assigned_to);
      countIndex++;
    }
    
    if (date_from) {
      countQuery += ` AND sr.date >= $${countIndex}`;
      countParams.push(date_from);
      countIndex++;
    }
    
    if (date_to) {
      countQuery += ` AND sr.date <= $${countIndex}`;
      countParams.push(date_to);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalServices = parseInt(countResult.rows[0].count);
    
    res.json({
      status: 'success',
      data: {
        services: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalServices,
          pages: Math.ceil(totalServices / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get service record by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT sr.*, 
             o.name as organization_name,
             e.name as assigned_employee_name,
             u.email as created_by_email,
             u2.email as updated_by_email
      FROM service_records sr
      LEFT JOIN organizations o ON sr.organization_id = o.id
      LEFT JOIN employees e ON sr.assigned_to = e.id
      JOIN users u ON sr.created_by = u.id
      LEFT JOIN users u2 ON sr.updated_by = u2.id
      WHERE sr.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return next(new AppError('Service record not found', 404));
    }
    
    // Get service history
    const historyResult = await pool.query(`
      SELECT srh.*, u.email as changed_by_email
      FROM service_record_history srh
      JOIN users u ON srh.changed_by = u.id
      WHERE srh.service_record_id = $1
      ORDER BY srh.changed_at DESC
    `, [id]);
    
    res.json({
      status: 'success',
      data: {
        service: result.rows[0],
        history: historyResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create new service record
router.post('/', checkOrganizationAccess, async (req, res, next) => {
  try {
    const {
      title,
      description,
      industry_type,
      customer_name,
      customer_email,
      customer_phone,
      amount,
      currency = 'VND',
      status = 'PENDING',
      priority = 'MEDIUM',
      date,
      due_date,
      notes,
      tags = [],
      organization_id,
      assigned_to
    } = req.body;
    
    // Validate required fields
    if (!title || !industry_type || !customer_name || !amount || !date || !organization_id) {
      return next(new AppError('Please provide all required fields', 400));
    }
    
    // Validate organization exists
    const orgResult = await pool.query('SELECT id FROM organizations WHERE id = $1', [organization_id]);
    if (orgResult.rows.length === 0) {
      return next(new AppError('Organization not found', 404));
    }
    
    // Validate assigned employee if provided
    if (assigned_to) {
      const empResult = await pool.query('SELECT id FROM employees WHERE id = $1', [assigned_to]);
      if (empResult.rows.length === 0) {
        return next(new AppError('Assigned employee not found', 404));
      }
    }
    
    // Create service record
    const result = await pool.query(`
      INSERT INTO service_records (
        title, description, industry_type, customer_name, customer_email, customer_phone,
        amount, currency, status, priority, date, due_date, notes, tags,
        organization_id, assigned_to, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      title, description, industry_type, customer_name, customer_email, customer_phone,
      amount, currency, status, priority, date, due_date, notes, tags,
      organization_id, assigned_to, 1, 1 // TODO: Replace with actual user ID from auth
    ]);
    
    res.status(201).json({
      status: 'success',
      message: 'Service record created successfully',
      data: {
        service: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update service record
router.put('/:id', checkResourceOwnership, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      priority,
      date,
      due_date,
      completion_date,
      notes,
      tags,
      assigned_to
    } = req.body;
    
    // Check if service exists
    const existingService = await pool.query('SELECT * FROM service_records WHERE id = $1', [id]);
    
    if (existingService.rows.length === 0) {
      return next(new AppError('Service record not found', 404));
    }
    
    // Validate assigned employee if provided
    if (assigned_to) {
      const empResult = await pool.query('SELECT id FROM employees WHERE id = $1', [assigned_to]);
      if (empResult.rows.length === 0) {
        return next(new AppError('Assigned employee not found', 404));
      }
    }
    
    // Update service record
    const result = await pool.query(`
      UPDATE service_records 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          status = COALESCE($3, status),
          priority = COALESCE($4, priority),
          date = COALESCE($5, date),
          due_date = COALESCE($6, due_date),
          completion_date = COALESCE($7, completion_date),
          notes = COALESCE($8, notes),
          tags = COALESCE($9, tags),
          assigned_to = COALESCE($10, assigned_to),
          updated_by = $11,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [
      title, description, status, priority, date, due_date, completion_date,
      notes, tags, assigned_to, 1, id // TODO: Replace with actual user ID from auth
    ]);
    
    res.json({
      status: 'success',
      message: 'Service record updated successfully',
      data: {
        service: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete service record
router.delete('/:id', checkResourceOwnership, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if service exists
    const existingService = await pool.query('SELECT id FROM service_records WHERE id = $1', [id]);
    
    if (existingService.rows.length === 0) {
      return next(new AppError('Service record not found', 404));
    }
    
    // Delete service record (cascade will handle history)
    await pool.query('DELETE FROM service_records WHERE id = $1', [id]);
    
    res.json({
      status: 'success',
      message: 'Service record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get service statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const { organization_id, date_from, date_to } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (organization_id) {
      whereClause += ` AND organization_id = $${paramIndex}`;
      params.push(organization_id);
      paramIndex++;
    }
    
    if (date_from) {
      whereClause += ` AND date >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }
    
    if (date_to) {
      whereClause += ` AND date <= $${paramIndex}`;
      params.push(date_to);
    }
    
    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_services,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_services,
        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_services,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_services,
        COUNT(CASE WHEN priority = 'HIGH' THEN 1 END) as high_priority_services,
        COUNT(CASE WHEN priority = 'URGENT' THEN 1 END) as urgent_services,
        SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END) as total_revenue,
        AVG(amount) as avg_service_value
      FROM service_records
      ${whereClause}
    `;
    
    const statsResult = await pool.query(statsQuery, params);
    
    // Get services by industry type
    const industryQuery = `
      SELECT industry_type, COUNT(*) as count, SUM(amount) as revenue
      FROM service_records
      ${whereClause}
      GROUP BY industry_type
      ORDER BY count DESC
    `;
    
    const industryResult = await pool.query(industryQuery, params);
    
    // Get services by status
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM service_records
      ${whereClause}
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const statusResult = await pool.query(statusQuery, params);
    
    // Get monthly trend (last 12 months)
    const trendQuery = `
      SELECT 
        DATE_TRUNC('month', date) as month,
        COUNT(*) as services_count,
        SUM(amount) as revenue
      FROM service_records
      ${whereClause}
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month DESC
      LIMIT 12
    `;
    
    const trendResult = await pool.query(trendQuery, params);
    
    res.json({
      status: 'success',
      data: {
        overview: statsResult.rows[0],
        by_industry: industryResult.rows,
        by_status: statusResult.rows,
        monthly_trend: trendResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
