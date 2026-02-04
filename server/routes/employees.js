// Employees Routes
// Employee management endpoints

const express = require('express');
const { AppError } = require('../middleware/errorHandler');
const pool = require('../config/database');

const router = express.Router();

// Get all employees
router.get('/', async (req, res, next) => {
  try {
    const { 
      organization_id, 
      department_id, 
      page = 1, 
      limit = 10, 
      search = '', 
      level = '', 
      status = 'Active' 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT e.*, 
             d.name as department_name,
             ws.name as work_site_name,
             o.name as organization_name,
             u.email as user_email
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN work_sites ws ON e.work_site_id = ws.id
      JOIN organizations o ON e.organization_id = o.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (organization_id) {
      query += ` AND e.organization_id = $${paramIndex}`;
      params.push(organization_id);
      paramIndex++;
    }
    
    if (department_id) {
      query += ` AND e.department_id = $${paramIndex}`;
      params.push(department_id);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND e.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (level) {
      query += ` AND e.level = $${paramIndex}`;
      params.push(level);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (e.name ILIKE $${paramIndex} OR e.email ILIKE $${paramIndex} OR e.role ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY e.name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM employees WHERE 1=1';
    const countParams = [];
    let countIndex = 1;
    
    if (organization_id) {
      countQuery += ` AND organization_id = $${countIndex}`;
      countParams.push(organization_id);
      countIndex++;
    }
    
    if (department_id) {
      countQuery += ` AND department_id = $${countIndex}`;
      countParams.push(department_id);
      countIndex++;
    }
    
    if (status) {
      countQuery += ` AND status = $${countIndex}`;
      countParams.push(status);
      countIndex++;
    }
    
    if (level) {
      countQuery += ` AND level = $${countIndex}`;
      countParams.push(level);
      countIndex++;
    }
    
    if (search) {
      countQuery += ` AND (name ILIKE $${countIndex} OR email ILIKE $${countIndex} OR role ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalEmployees = parseInt(countResult.rows[0].count);
    
    res.json({
      status: 'success',
      data: {
        employees: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalEmployees,
          pages: Math.ceil(totalEmployees / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get employee by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get employee details
    const empResult = await pool.query(`
      SELECT e.*, 
             d.name as department_name,
             ws.name as work_site_name,
             o.name as organization_name,
             u.email as user_email
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN work_sites ws ON e.work_site_id = ws.id
      JOIN organizations o ON e.organization_id = o.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id = $1
    `, [id]);
    
    if (empResult.rows.length === 0) {
      return next(new AppError('Employee not found', 404));
    }
    
    const employee = empResult.rows[0];
    
    // Get assigned services
    const serviceResult = await pool.query(`
      SELECT sr.*, 
             o.name as organization_name
      FROM service_records sr
      JOIN organizations o ON sr.organization_id = o.id
      WHERE sr.assigned_to = $1
      ORDER BY sr.created_at DESC
      LIMIT 10
    `, [id]);
    
    res.json({
      status: 'success',
      data: {
        employee,
        recent_services: serviceResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create new employee
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      role,
      level,
      department_id,
      work_site_id,
      organization_id,
      user_id,
      status = 'Active',
      hire_date,
      salary,
      job_description,
      skills = [],
      avatar_url,
      emergency_contact
    } = req.body;
    
    // Validate required fields
    if (!name || !email || !role || !level || !organization_id) {
      return next(new AppError('Name, email, role, level, and organization are required', 400));
    }
    
    // Validate organization exists
    const orgResult = await pool.query('SELECT id FROM organizations WHERE id = $1', [organization_id]);
    if (orgResult.rows.length === 0) {
      return next(new AppError('Organization not found', 404));
    }
    
    // Validate department if provided
    if (department_id) {
      const deptResult = await pool.query(
        'SELECT id FROM departments WHERE id = $1 AND organization_id = $2',
        [department_id, organization_id]
      );
      if (deptResult.rows.length === 0) {
        return next(new AppError('Department not found or belongs to different organization', 404));
      }
    }
    
    // Validate work site if provided
    if (work_site_id) {
      const siteResult = await pool.query(
        'SELECT id FROM work_sites WHERE id = $1 AND organization_id = $2',
        [work_site_id, organization_id]
      );
      if (siteResult.rows.length === 0) {
        return next(new AppError('Work site not found or belongs to different organization', 404));
      }
    }
    
    // Check if email already exists
    const existingEmail = await pool.query('SELECT id FROM employees WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      return next(new AppError('Employee with this email already exists', 400));
    }
    
    // Create employee
    const result = await pool.query(`
      INSERT INTO employees (
        name, email, phone, role, level, department_id, work_site_id, organization_id,
        user_id, status, hire_date, salary, job_description, skills, avatar_url, emergency_contact
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      name, email, phone, role, level, department_id, work_site_id, organization_id,
      user_id, status, hire_date, salary, job_description, skills, avatar_url, emergency_contact
    ]);
    
    res.status(201).json({
      status: 'success',
      message: 'Employee created successfully',
      data: {
        employee: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update employee
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      role,
      level,
      department_id,
      work_site_id,
      status,
      hire_date,
      salary,
      job_description,
      skills,
      avatar_url,
      emergency_contact
    } = req.body;
    
    // Check if employee exists
    const existingEmp = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    
    if (existingEmp.rows.length === 0) {
      return next(new AppError('Employee not found', 404));
    }
    
    const employee = existingEmp.rows[0];
    
    // Validate department if provided
    if (department_id) {
      const deptResult = await pool.query(
        'SELECT id FROM departments WHERE id = $1 AND organization_id = $2',
        [department_id, employee.organization_id]
      );
      if (deptResult.rows.length === 0) {
        return next(new AppError('Department not found or belongs to different organization', 404));
      }
    }
    
    // Validate work site if provided
    if (work_site_id) {
      const siteResult = await pool.query(
        'SELECT id FROM work_sites WHERE id = $1 AND organization_id = $2',
        [work_site_id, employee.organization_id]
      );
      if (siteResult.rows.length === 0) {
        return next(new AppError('Work site not found or belongs to different organization', 404));
      }
    }
    
    // Update employee
    const result = await pool.query(`
      UPDATE employees 
      SET name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          role = COALESCE($3, role),
          level = COALESCE($4, level),
          department_id = COALESCE($5, department_id),
          work_site_id = COALESCE($6, work_site_id),
          status = COALESCE($7, status),
          hire_date = COALESCE($8, hire_date),
          salary = COALESCE($9, salary),
          job_description = COALESCE($10, job_description),
          skills = COALESCE($11, skills),
          avatar_url = COALESCE($12, avatar_url),
          emergency_contact = COALESCE($13, emergency_contact),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [
      name, phone, role, level, department_id, work_site_id, status, hire_date,
      salary, job_description, skills, avatar_url, emergency_contact, id
    ]);
    
    res.json({
      status: 'success',
      message: 'Employee updated successfully',
      data: {
        employee: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete employee (soft delete - change status)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if employee exists
    const existingEmp = await pool.query('SELECT id, status FROM employees WHERE id = $1', [id]);
    
    if (existingEmp.rows.length === 0) {
      return next(new AppError('Employee not found', 404));
    }
    
    // Soft delete (change status to 'Resigned')
    await pool.query(
      'UPDATE employees SET status = \'Resigned\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    
    res.json({
      status: 'success',
      message: 'Employee marked as resigned'
    });
  } catch (error) {
    next(error);
  }
});

// Get employee statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const { organization_id, department_id } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (organization_id) {
      whereClause += ` AND e.organization_id = $${paramIndex}`;
      params.push(organization_id);
      paramIndex++;
    }
    
    if (department_id) {
      whereClause += ` AND e.department_id = $${paramIndex}`;
      params.push(department_id);
      paramIndex++;
    }
    
    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN e.status = 'Active' THEN 1 END) as active_employees,
        COUNT(CASE WHEN e.status = 'OnLeave' THEN 1 END) as on_leave_employees,
        COUNT(CASE WHEN e.status = 'Resigned' THEN 1 END) as resigned_employees,
        COUNT(CASE WHEN e.level = 'C_LEVEL' THEN 1 END) as c_level_count,
        COUNT(CASE WHEN e.level = 'DIRECTOR' THEN 1 END) as director_count,
        COUNT(CASE WHEN e.level = 'MANAGER' THEN 1 END) as manager_count,
        COUNT(CASE WHEN e.level = 'SPECIALIST' THEN 1 END) as specialist_count,
        COUNT(CASE WHEN e.level = 'WORKER' THEN 1 END) as worker_count,
        COUNT(CASE WHEN e.level = 'INTERN' THEN 1 END) as intern_count,
        AVG(e.salary) as avg_salary,
        SUM(e.salary) as total_salary_cost
      FROM employees e
      ${whereClause}
    `;
    
    const statsResult = await pool.query(statsQuery, params);
    
    // Get employees by department
    const deptQuery = `
      SELECT d.name as department_name, COUNT(e.id) as employee_count, AVG(e.salary) as avg_salary
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      GROUP BY d.name
      ORDER BY employee_count DESC
    `;
    
    const deptResult = await pool.query(deptQuery, params);
    
    // Get employees by level
    const levelQuery = `
      SELECT level, COUNT(*) as count, AVG(salary) as avg_salary
      FROM employees e
      ${whereClause}
      GROUP BY level
      ORDER BY count DESC
    `;
    
    const levelResult = await pool.query(levelQuery, params);
    
    // Get recent hires (last 6 months)
    const hiresQuery = `
      SELECT name, role, hire_date, salary
      FROM employees e
      ${whereClause} AND e.hire_date >= CURRENT_DATE - INTERVAL '6 months'
      ORDER BY e.hire_date DESC
      LIMIT 10
    `;
    
    const hiresResult = await pool.query(hiresQuery, params);
    
    res.json({
      status: 'success',
      data: {
        overview: statsResult.rows[0],
        by_department: deptResult.rows,
        by_level: levelResult.rows,
        recent_hires: hiresResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
