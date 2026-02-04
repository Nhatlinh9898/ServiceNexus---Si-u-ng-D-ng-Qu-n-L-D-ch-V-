// Organizations Routes
// Multi-tenant organization management endpoints

const express = require('express');
const { AppError } = require('../middleware/errorHandler');
const pool = require('../config/database');

const router = express.Router();

// Get all organizations
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', industry_type = '' } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT o.*, 
             u.email as created_by_email,
             COUNT(DISTINCT e.id) as employee_count,
             COUNT(DISTINCT d.id) as department_count,
             COUNT(DISTINCT sr.id) as service_count
      FROM organizations o
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN employees e ON o.id = e.organization_id AND e.status = 'Active'
      LEFT JOIN departments d ON o.id = d.organization_id AND d.is_active = true
      LEFT JOIN service_records sr ON o.id = sr.organization_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (o.name ILIKE $${paramIndex} OR o.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (industry_type) {
      query += ` AND o.industry_type = $${paramIndex}`;
      params.push(industry_type);
      paramIndex++;
    }
    
    query += ` GROUP BY o.id, u.email ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM organizations WHERE 1=1';
    const countParams = [];
    let countIndex = 1;
    
    if (search) {
      countQuery += ` AND (name ILIKE $${countIndex} OR description ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
      countIndex++;
    }
    
    if (industry_type) {
      countQuery += ` AND industry_type = $${countIndex}`;
      countParams.push(industry_type);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalOrgs = parseInt(countResult.rows[0].count);
    
    res.json({
      status: 'success',
      data: {
        organizations: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalOrgs,
          pages: Math.ceil(totalOrgs / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get organization by ID with full details
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get organization details
    const orgResult = await pool.query(`
      SELECT o.*, u.email as created_by_email
      FROM organizations o
      LEFT JOIN users u ON o.created_by = u.id
      WHERE o.id = $1
    `, [id]);
    
    if (orgResult.rows.length === 0) {
      return next(new AppError('Organization not found', 404));
    }
    
    const organization = orgResult.rows[0];
    
    // Get departments
    const deptResult = await pool.query(`
      SELECT d.*, e.name as manager_name
      FROM departments d
      LEFT JOIN employees e ON d.manager_id = e.id
      WHERE d.organization_id = $1 AND d.is_active = true
      ORDER BY d.name
    `, [id]);
    
    // Get employees
    const empResult = await pool.query(`
      SELECT e.*, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.organization_id = $1 AND e.status = 'Active'
      ORDER BY e.name
    `, [id]);
    
    // Get recent services
    const serviceResult = await pool.query(`
      SELECT sr.*, e.name as assigned_employee_name
      FROM service_records sr
      LEFT JOIN employees e ON sr.assigned_to = e.id
      WHERE sr.organization_id = $1
      ORDER BY sr.created_at DESC
      LIMIT 10
    `, [id]);
    
    // Get organization statistics
    const statsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT e.id) as total_employees,
        COUNT(DISTINCT d.id) as total_departments,
        COUNT(DISTINCT sr.id) as total_services,
        COUNT(DISTINCT CASE WHEN sr.status = 'COMPLETED' THEN sr.id END) as completed_services,
        SUM(CASE WHEN sr.status = 'COMPLETED' THEN sr.amount ELSE 0 END) as total_revenue,
        AVG(sr.amount) as avg_service_value
      FROM organizations o
      LEFT JOIN employees e ON o.id = e.organization_id AND e.status = 'Active'
      LEFT JOIN departments d ON o.id = d.organization_id AND d.is_active = true
      LEFT JOIN service_records sr ON o.id = sr.organization_id
      WHERE o.id = $1
    `, [id]);
    
    res.json({
      status: 'success',
      data: {
        organization,
        departments: deptResult.rows,
        employees: empResult.rows,
        recent_services: serviceResult.rows,
        statistics: statsResult.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create new organization
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      description,
      industry_type,
      logo_url,
      website,
      phone,
      email,
      address
    } = req.body;
    
    // Validate required fields
    if (!name || !industry_type) {
      return next(new AppError('Organization name and industry type are required', 400));
    }
    
    // Create organization
    const result = await pool.query(`
      INSERT INTO organizations (
        name, description, industry_type, logo_url, website, phone, email, address, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      name, description, industry_type, logo_url, website, phone, email, address, 1
      // TODO: Replace with actual user ID from auth
    ]);
    
    res.status(201).json({
      status: 'success',
      message: 'Organization created successfully',
      data: {
        organization: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update organization
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      industry_type,
      logo_url,
      website,
      phone,
      email,
      address,
      is_active
    } = req.body;
    
    // Check if organization exists
    const existingOrg = await pool.query('SELECT id FROM organizations WHERE id = $1', [id]);
    
    if (existingOrg.rows.length === 0) {
      return next(new AppError('Organization not found', 404));
    }
    
    // Update organization
    const result = await pool.query(`
      UPDATE organizations 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          industry_type = COALESCE($3, industry_type),
          logo_url = COALESCE($4, logo_url),
          website = COALESCE($5, website),
          phone = COALESCE($6, phone),
          email = COALESCE($7, email),
          address = COALESCE($8, address),
          is_active = COALESCE($9, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [
      name, description, industry_type, logo_url, website, phone, email, address, is_active, id
    ]);
    
    res.json({
      status: 'success',
      message: 'Organization updated successfully',
      data: {
        organization: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete organization (soft delete - deactivate)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if organization exists
    const existingOrg = await pool.query('SELECT id, is_active FROM organizations WHERE id = $1', [id]);
    
    if (existingOrg.rows.length === 0) {
      return next(new AppError('Organization not found', 404));
    }
    
    // Soft delete (deactivate)
    await pool.query(
      'UPDATE organizations SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    
    res.json({
      status: 'success',
      message: 'Organization deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get organization members
router.get('/:id/members', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT om.*, u.email, u.first_name, u.last_name, u.role as user_role, u.last_login
      FROM organization_members om
      JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = $1 AND om.is_active = true
      ORDER BY om.joined_at DESC
    `, [id]);
    
    res.json({
      status: 'success',
      data: {
        members: result.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// Add member to organization
router.post('/:id/members', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id, role = 'USER' } = req.body;
    
    if (!user_id) {
      return next(new AppError('User ID is required', 400));
    }
    
    // Check if organization exists
    const orgResult = await pool.query('SELECT id FROM organizations WHERE id = $1', [id]);
    if (orgResult.rows.length === 0) {
      return next(new AppError('Organization not found', 404));
    }
    
    // Check if user exists
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }
    
    // Check if user is already a member
    const existingMember = await pool.query(
      'SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [id, user_id]
    );
    
    if (existingMember.rows.length > 0) {
      return next(new AppError('User is already a member of this organization', 400));
    }
    
    // Add member
    const result = await pool.query(`
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, user_id, role]);
    
    res.status(201).json({
      status: 'success',
      message: 'Member added successfully',
      data: {
        member: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// Remove member from organization
router.delete('/:id/members/:user_id', async (req, res, next) => {
  try {
    const { id, user_id } = req.params;
    
    // Remove member (soft delete - deactivate)
    await pool.query(
      'UPDATE organization_members SET is_active = false WHERE organization_id = $1 AND user_id = $2',
      [id, user_id]
    );
    
    res.json({
      status: 'success',
      message: 'Member removed successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
