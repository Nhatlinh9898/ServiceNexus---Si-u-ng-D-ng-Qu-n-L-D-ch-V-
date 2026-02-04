// Departments Routes
// Department management endpoints

const express = require('express');
const { AppError } = require('../middleware/errorHandler');
const pool = require('../config/database');

const router = express.Router();

// Get all departments
router.get('/', async (req, res, next) => {
  try {
    const { organization_id, page = 1, limit = 10, search = '', type = '' } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT d.*, 
             o.name as organization_name,
             e.name as manager_name,
             u.email as manager_email,
             COUNT(DISTINCT emp.id) as employee_count
      FROM departments d
      JOIN organizations o ON d.organization_id = o.id
      LEFT JOIN employees e ON d.manager_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN employees emp ON d.id = emp.department_id AND emp.status = 'Active'
      WHERE d.is_active = true
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (organization_id) {
      query += ` AND d.organization_id = $${paramIndex}`;
      params.push(organization_id);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (d.name ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (type) {
      query += ` AND d.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    query += ` GROUP BY d.id, o.name, e.name, u.email ORDER BY d.name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM departments WHERE is_active = true';
    const countParams = [];
    let countIndex = 1;
    
    if (organization_id) {
      countQuery += ` AND organization_id = $${countIndex}`;
      countParams.push(organization_id);
      countIndex++;
    }
    
    if (search) {
      countQuery += ` AND (name ILIKE $${countIndex} OR description ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
      countIndex++;
    }
    
    if (type) {
      countQuery += ` AND type = $${countIndex}`;
      countParams.push(type);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalDepts = parseInt(countResult.rows[0].count);
    
    res.json({
      status: 'success',
      data: {
        departments: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalDepts,
          pages: Math.ceil(totalDepts / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get department by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get department details
    const deptResult = await pool.query(`
      SELECT d.*, 
             o.name as organization_name,
             e.name as manager_name,
             u.email as manager_email,
             pd.name as parent_department_name
      FROM departments d
      JOIN organizations o ON d.organization_id = o.id
      LEFT JOIN employees e ON d.manager_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments pd ON d.parent_department_id = pd.id
      WHERE d.id = $1 AND d.is_active = true
    `, [id]);
    
    if (deptResult.rows.length === 0) {
      return next(new AppError('Department not found', 404));
    }
    
    const department = deptResult.rows[0];
    
    // Get employees in this department
    const empResult = await pool.query(`
      SELECT e.*, u.email as user_email
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.department_id = $1 AND e.status = 'Active'
      ORDER BY e.name
    `, [id]);
    
    // Get sub-departments
    const subDeptResult = await pool.query(`
      SELECT d.*, e.name as manager_name
      FROM departments d
      LEFT JOIN employees e ON d.manager_id = e.id
      WHERE d.parent_department_id = $1 AND d.is_active = true
      ORDER BY d.name
    `, [id]);
    
    // Get department statistics
    const statsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT e.id) as total_employees,
        COUNT(DISTINCT CASE WHEN e.level = 'MANAGER' THEN e.id END) as managers_count,
        COUNT(DISTINCT CASE WHEN e.level = 'SPECIALIST' THEN e.id END) as specialists_count,
        COUNT(DISTINCT CASE WHEN e.level = 'WORKER' THEN e.id END) as workers_count,
        AVG(e.salary) as avg_salary,
        SUM(e.salary) as total_salary_cost
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'Active'
      WHERE d.id = $1
    `, [id]);
    
    res.json({
      status: 'success',
      data: {
        department,
        employees: empResult.rows,
        sub_departments: subDeptResult.rows,
        statistics: statsResult.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create new department
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      type,
      organization_id,
      parent_department_id,
      manager_id,
      description,
      budget
    } = req.body;
    
    // Validate required fields
    if (!name || !type || !organization_id) {
      return next(new AppError('Department name, type, and organization are required', 400));
    }
    
    // Validate organization exists
    const orgResult = await pool.query('SELECT id FROM organizations WHERE id = $1', [organization_id]);
    if (orgResult.rows.length === 0) {
      return next(new AppError('Organization not found', 404));
    }
    
    // Validate parent department if provided
    if (parent_department_id) {
      const parentResult = await pool.query(
        'SELECT id FROM departments WHERE id = $1 AND organization_id = $2',
        [parent_department_id, organization_id]
      );
      if (parentResult.rows.length === 0) {
        return next(new AppError('Parent department not found or belongs to different organization', 404));
      }
    }
    
    // Validate manager if provided
    if (manager_id) {
      const managerResult = await pool.query(
        'SELECT id FROM employees WHERE id = $1 AND organization_id = $2',
        [manager_id, organization_id]
      );
      if (managerResult.rows.length === 0) {
        return next(new AppError('Manager not found or belongs to different organization', 404));
      }
    }
    
    // Create department
    const result = await pool.query(`
      INSERT INTO departments (
        name, type, organization_id, parent_department_id, manager_id, description, budget
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, type, organization_id, parent_department_id, manager_id, description, budget]);
    
    res.status(201).json({
      status: 'success',
      message: 'Department created successfully',
      data: {
        department: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update department
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      parent_department_id,
      manager_id,
      description,
      budget,
      is_active
    } = req.body;
    
    // Check if department exists
    const existingDept = await pool.query('SELECT * FROM departments WHERE id = $1', [id]);
    
    if (existingDept.rows.length === 0) {
      return next(new AppError('Department not found', 404));
    }
    
    const department = existingDept.rows[0];
    
    // Validate parent department if provided
    if (parent_department_id) {
      const parentResult = await pool.query(
        'SELECT id FROM departments WHERE id = $1 AND organization_id = $2 AND id != $3',
        [parent_department_id, department.organization_id, id]
      );
      if (parentResult.rows.length === 0) {
        return next(new AppError('Parent department not found or invalid', 404));
      }
    }
    
    // Validate manager if provided
    if (manager_id) {
      const managerResult = await pool.query(
        'SELECT id FROM employees WHERE id = $1 AND organization_id = $2',
        [manager_id, department.organization_id]
      );
      if (managerResult.rows.length === 0) {
        return next(new AppError('Manager not found or belongs to different organization', 404));
      }
    }
    
    // Update department
    const result = await pool.query(`
      UPDATE departments 
      SET name = COALESCE($1, name),
          type = COALESCE($2, type),
          parent_department_id = COALESCE($3, parent_department_id),
          manager_id = COALESCE($4, manager_id),
          description = COALESCE($5, description),
          budget = COALESCE($6, budget),
          is_active = COALESCE($7, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      name, type, parent_department_id, manager_id, description, budget, is_active, id
    ]);
    
    res.json({
      status: 'success',
      message: 'Department updated successfully',
      data: {
        department: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete department (soft delete - deactivate)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if department exists
    const existingDept = await pool.query('SELECT id FROM departments WHERE id = $1', [id]);
    
    if (existingDept.rows.length === 0) {
      return next(new AppError('Department not found', 404));
    }
    
    // Check if department has employees
    const empResult = await pool.query(
      'SELECT COUNT(*) as count FROM employees WHERE department_id = $1 AND status = \'Active\'',
      [id]
    );
    
    if (parseInt(empResult.rows[0].count) > 0) {
      return next(new AppError('Cannot deactivate department with active employees', 400));
    }
    
    // Check if department has sub-departments
    const subDeptResult = await pool.query(
      'SELECT COUNT(*) as count FROM departments WHERE parent_department_id = $1 AND is_active = true',
      [id]
    );
    
    if (parseInt(subDeptResult.rows[0].count) > 0) {
      return next(new AppError('Cannot deactivate department with active sub-departments', 400));
    }
    
    // Soft delete (deactivate)
    await pool.query(
      'UPDATE departments SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    
    res.json({
      status: 'success',
      message: 'Department deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get department hierarchy
router.get('/hierarchy/tree', async (req, res, next) => {
  try {
    const { organization_id } = req.query;
    
    if (!organization_id) {
      return next(new AppError('Organization ID is required', 400));
    }
    
    // Get all departments for the organization
    const result = await pool.query(`
      SELECT d.*, 
             e.name as manager_name,
             COUNT(DISTINCT emp.id) as employee_count
      FROM departments d
      LEFT JOIN employees e ON d.manager_id = e.id
      LEFT JOIN employees emp ON d.id = emp.department_id AND emp.status = 'Active'
      WHERE d.organization_id = $1 AND d.is_active = true
      GROUP BY d.id, e.name
      ORDER BY d.name
    `, [organization_id]);
    
    // Build hierarchy tree
    const departments = result.rows;
    const departmentMap = {};
    const rootDepartments = [];
    
    // Create map of departments
    departments.forEach(dept => {
      departmentMap[dept.id] = {
        ...dept,
        children: []
      };
    });
    
    // Build tree structure
    departments.forEach(dept => {
      if (dept.parent_department_id) {
        const parent = departmentMap[dept.parent_department_id];
        if (parent) {
          parent.children.push(departmentMap[dept.id]);
        }
      } else {
        rootDepartments.push(departmentMap[dept.id]);
      }
    });
    
    res.json({
      status: 'success',
      data: {
        hierarchy: rootDepartments,
        total_departments: departments.length
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
