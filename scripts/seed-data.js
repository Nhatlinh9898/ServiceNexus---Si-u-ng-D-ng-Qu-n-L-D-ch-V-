#!/usr/bin/env node

// ServiceNexus Data Seeding Script
// Run: node scripts/seed-data.js

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'servicenexus',
  user: process.env.DB_USER || 'servicenexus_user',
  password: process.env.DB_PASSWORD || 'servicenexus123',
});

// Seed data
const seedData = {
  users: [
    {
      email: 'admin@servicenexus.com',
      password: 'admin123',
      first_name: 'System',
      last_name: 'Administrator',
      role: 'SUPER_ADMIN'
    },
    {
      email: 'manager@demo.com',
      password: 'manager123',
      first_name: 'Demo',
      last_name: 'Manager',
      role: 'ADMIN'
    },
    {
      email: 'user@demo.com',
      password: 'user123',
      first_name: 'Demo',
      last_name: 'User',
      role: 'USER'
    }
  ],
  
  organizations: [
    {
      name: 'Demo Restaurant Corp',
      description: 'Premium restaurant chain with 5 locations',
      industry_type: 'RESTAURANT',
      website: 'demo-restaurant.com',
      phone: '+84-28-1234-5678',
      email: 'info@demo-restaurant.com'
    },
    {
      name: 'Tech Solutions Ltd',
      description: 'IT services and consulting company',
      industry_type: 'IT_SUPPORT',
      website: 'techsolutions.com',
      phone: '+84-28-9876-5432',
      email: 'contact@techsolutions.com'
    },
    {
      name: 'Healthcare Plus',
      description: 'Multi-specialty medical clinic',
      industry_type: 'HEALTHCARE',
      website: 'healthcareplus.vn',
      phone: '+84-28-5555-1234',
      email: 'info@healthcareplus.vn'
    }
  ],
  
  departments: [
    // Restaurant Corp departments
    {
      name: 'Kitchen Operations',
      type: 'FACTORY',
      organization_id: 1, // Will be replaced with actual UUID
      description: 'Food preparation and kitchen management'
    },
    {
      name: 'Front Office',
      type: 'OFFICE',
      organization_id: 1,
      description: 'Customer service and reservations'
    },
    {
      name: 'Management',
      type: 'OFFICE',
      organization_id: 1,
      description: 'Restaurant management and administration'
    },
    
    // Tech Solutions departments
    {
      name: 'Development Team',
      type: 'OFFICE',
      organization_id: 2,
      description: 'Software development and programming'
    },
    {
      name: 'IT Support',
      type: 'OFFICE',
      organization_id: 2,
      description: 'Technical support and maintenance'
    },
    
    // Healthcare Plus departments
    {
      name: 'Medical Staff',
      type: 'SITE',
      organization_id: 3,
      description: 'Doctors and nurses'
    },
    {
      name: 'Administration',
      type: 'OFFICE',
      organization_id: 3,
      description: 'Clinic administration and billing'
    }
  ],
  
  employees: [
    // Restaurant Corp employees
    {
      name: 'Nguyen Van Chef',
      email: 'chef@demo-restaurant.com',
      phone: '+84-901-234-567',
      role: 'Head Chef',
      level: 'MANAGER',
      department_id: 1, // Kitchen Operations
      organization_id: 1,
      status: 'Active',
      salary: 25000000,
      skills: ['French Cuisine', 'Asian Fusion', 'Menu Planning']
    },
    {
      name: 'Tran Thi Manager',
      email: 'manager@demo-restaurant.com',
      phone: '+84-902-345-678',
      role: 'Restaurant Manager',
      level: 'MANAGER',
      department_id: 3, // Management
      organization_id: 1,
      status: 'Active',
      salary: 30000000,
      skills: ['Operations Management', 'Customer Service', 'Staff Training']
    },
    
    // Tech Solutions employees
    {
      name: 'Le Van Developer',
      email: 'dev@techsolutions.com',
      phone: '+84-903-456-789',
      role: 'Senior Developer',
      level: 'SPECIALIST',
      department_id: 4, // Development Team
      organization_id: 2,
      status: 'Active',
      salary: 35000000,
      skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL']
    },
    
    // Healthcare Plus employees
    {
      name: 'Dr. Pham Thi Doctor',
      email: 'doctor@healthcareplus.vn',
      phone: '+84-904-567-890',
      role: 'Senior Doctor',
      level: 'SPECIALIST',
      department_id: 6, // Medical Staff
      organization_id: 3,
      status: 'Active',
      salary: 50000000,
      skills: ['Internal Medicine', 'Diagnosis', 'Patient Care']
    }
  ],
  
  serviceRecords: [
    // Restaurant services
    {
      title: 'Wedding Reception - 100 Guests',
      description: 'Full catering service for wedding reception',
      industry_type: 'RESTAURANT',
      customer_name: 'Nguyen Van A',
      customer_email: 'nguyenvana@email.com',
      customer_phone: '+84-905-123-456',
      amount: 150000000,
      status: 'COMPLETED',
      priority: 'HIGH',
      date: '2025-01-15',
      completion_date: '2025-01-15',
      organization_id: 1,
      assigned_to: 1, // Head Chef
      notes: 'Special dietary requirements: 10 vegetarian meals'
    },
    {
      title: 'Corporate Lunch - 50 People',
      description: 'Business lunch for company meeting',
      industry_type: 'RESTAURANT',
      customer_name: 'Tech Company Ltd',
      customer_email: 'events@techcompany.com',
      amount: 25000000,
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      date: '2025-02-10',
      organization_id: 1,
      assigned_to: 2, // Restaurant Manager
      notes: 'Halal food required'
    },
    
    // Tech Solutions services
    {
      title: 'Website Development Project',
      description: 'E-commerce website development',
      industry_type: 'IT_SUPPORT',
      customer_name: 'Retail Store Chain',
      customer_email: 'it@retailstore.com',
      amount: 200000000,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      date: '2025-01-20',
      due_date: '2025-03-31',
      organization_id: 2,
      assigned_to: 3, // Senior Developer
      notes: 'Payment gateway integration required'
    },
    
    // Healthcare services
    {
      title: 'Annual Health Check-up',
      description: 'Complete health examination package',
      industry_type: 'HEALTHCARE',
      customer_name: 'John Smith',
      customer_email: 'johnsmith@email.com',
      customer_phone: '+84-906-789-012',
      amount: 3500000,
      status: 'COMPLETED',
      priority: 'MEDIUM',
      date: '2025-01-25',
      completion_date: '2025-01-25',
      organization_id: 3,
      assigned_to: 4, // Senior Doctor
      notes: 'Patient has diabetes - special attention required'
    }
  ]
};

// Hash password function
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Seed users
async function seedUsers() {
  console.log('👤 Seeding users...');
  
  for (const userData of seedData.users) {
    const hashedPassword = await hashPassword(userData.password);
    
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    
    try {
      const result = await pool.query(query, [
        userData.email,
        hashedPassword,
        userData.first_name,
        userData.last_name,
        userData.role,
        true,
        true
      ]);
      
      if (result.rows.length > 0) {
        userData.id = result.rows[0].id;
        console.log(`✅ Created user: ${userData.email}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create user ${userData.email}:`, error.message);
    }
  }
}

// Seed organizations
async function seedOrganizations() {
  console.log('🏢 Seeding organizations...');
  
  for (let i = 0; i < seedData.organizations.length; i++) {
    const orgData = seedData.organizations[i];
    
    const query = `
      INSERT INTO organizations (name, description, industry_type, website, phone, email, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    try {
      const result = await pool.query(query, [
        orgData.name,
        orgData.description,
        orgData.industry_type,
        orgData.website,
        orgData.phone,
        orgData.email,
        seedData.users[0].id // Admin user
      ]);
      
      orgData.id = result.rows[0].id;
      console.log(`✅ Created organization: ${orgData.name}`);
    } catch (error) {
      console.error(`❌ Failed to create organization ${orgData.name}:`, error.message);
    }
  }
}

// Seed departments
async function seedDepartments() {
  console.log('🏛️ Seeding departments...');
  
  for (const deptData of seedData.departments) {
    // Update organization_id with actual UUID
    const orgIndex = deptData.organization_id - 1;
    deptData.organization_id = seedData.organizations[orgIndex].id;
    
    const query = `
      INSERT INTO departments (name, type, organization_id, description)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    
    try {
      const result = await pool.query(query, [
        deptData.name,
        deptData.type,
        deptData.organization_id,
        deptData.description
      ]);
      
      deptData.id = result.rows[0].id;
      console.log(`✅ Created department: ${deptData.name}`);
    } catch (error) {
      console.error(`❌ Failed to create department ${deptData.name}:`, error.message);
    }
  }
}

// Seed employees
async function seedEmployees() {
  console.log('👥 Seeding employees...');
  
  for (const empData of seedData.employees) {
    // Update foreign keys with actual UUIDs
    const orgIndex = empData.organization_id - 1;
    empData.organization_id = seedData.organizations[orgIndex].id;
    
    const deptIndex = empData.department_id - 1;
    empData.department_id = seedData.departments[deptIndex].id;
    
    const query = `
      INSERT INTO employees (name, email, phone, role, level, department_id, organization_id, status, salary, skills)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;
    
    try {
      const result = await pool.query(query, [
        empData.name,
        empData.email,
        empData.phone,
        empData.role,
        empData.level,
        empData.department_id,
        empData.organization_id,
        empData.status,
        empData.salary,
        empData.skills
      ]);
      
      empData.id = result.rows[0].id;
      console.log(`✅ Created employee: ${empData.name}`);
    } catch (error) {
      console.error(`❌ Failed to create employee ${empData.name}:`, error.message);
    }
  }
}

// Seed service records
async function seedServiceRecords() {
  console.log('📋 Seeding service records...');
  
  for (const serviceData of seedData.serviceRecords) {
    // Update foreign keys with actual UUIDs
    const orgIndex = serviceData.organization_id - 1;
    serviceData.organization_id = seedData.organizations[orgIndex].id;
    
    if (serviceData.assigned_to) {
      const empIndex = serviceData.assigned_to - 1;
      serviceData.assigned_to = seedData.employees[empIndex].id;
    }
    
    serviceData.created_by = seedData.users[0].id; // Admin user
    serviceData.updated_by = seedData.users[0].id;
    
    const query = `
      INSERT INTO service_records (
        title, description, industry_type, customer_name, customer_email, customer_phone,
        amount, status, priority, date, due_date, completion_date, notes, organization_id,
        assigned_to, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id
    `;
    
    try {
      const result = await pool.query(query, [
        serviceData.title,
        serviceData.description,
        serviceData.industry_type,
        serviceData.customer_name,
        serviceData.customer_email,
        serviceData.customer_phone,
        serviceData.amount,
        serviceData.status,
        serviceData.priority,
        serviceData.date,
        serviceData.due_date || null,
        serviceData.completion_date || null,
        serviceData.notes,
        serviceData.organization_id,
        serviceData.assigned_to || null,
        serviceData.created_by,
        serviceData.updated_by
      ]);
      
      serviceData.id = result.rows[0].id;
      console.log(`✅ Created service record: ${serviceData.title}`);
    } catch (error) {
      console.error(`❌ Failed to create service record ${serviceData.title}:`, error.message);
    }
  }
}

// Main seeding function
async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');
  
  try {
    await seedUsers();
    await seedOrganizations();
    await seedDepartments();
    await seedEmployees();
    await seedServiceRecords();
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users: ${seedData.users.length}`);
    console.log(`- Organizations: ${seedData.organizations.length}`);
    console.log(`- Departments: ${seedData.departments.length}`);
    console.log(`- Employees: ${seedData.employees.length}`);
    console.log(`- Service Records: ${seedData.serviceRecords.length}`);
    
    console.log('\n🔑 Login credentials:');
    console.log('Admin: admin@servicenexus.com / admin123');
    console.log('Manager: manager@demo.com / manager123');
    console.log('User: user@demo.com / user123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = {
  seedDatabase,
  seedData
};
