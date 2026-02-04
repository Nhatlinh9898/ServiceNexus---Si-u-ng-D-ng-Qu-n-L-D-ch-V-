// Jest Setup File
// Global test configuration and utilities

const { Pool } = require('pg');

// Test database configuration
const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME + '_test' || 'servicenexus_test',
  user: process.env.DB_USER || 'servicenexus_user',
  password: process.env.DB_PASSWORD || 'servicenexus123',
};

// Global test database pool
let testPool;

// Setup test database before all tests
beforeAll(async () => {
  // Create test database connection
  testPool = new Pool(testDbConfig);
  
  // Test connection
  await testPool.query('SELECT NOW()');
  
  // Clean up any existing test data
  await cleanupTestData();
  
  // Set global test timeout
  jest.setTimeout(30000);
});

// Clean up test database after all tests
afterAll(async () => {
  await cleanupTestData();
  await testPool.end();
});

// Clean up test data before each test
beforeEach(async () => {
  await cleanupTestData();
});

// Clean up test data function
async function cleanupTestData() {
  const tables = [
    'service_record_history',
    'ai_conversations',
    'ai_insights',
    'user_sessions',
    'employees',
    'work_sites',
    'departments',
    'organization_members',
    'organizations',
    'users',
    'system_logs'
  ];

  for (const table of tables) {
    try {
      await testPool.query(`DELETE FROM ${table}`);
    } catch (error) {
      // Table might not exist, continue
    }
  }
}

// Global test utilities
global.testUtils = {
  // Test database pool
  pool: testPool,
  
  // Create test user
  async createTestUser(userData = {}) {
    const defaultUser = {
      email: 'test@example.com',
      password_hash: '$2b$10$rQZ8ZqZqZqZqZqZqZqZqZu',
      first_name: 'Test',
      last_name: 'User',
      role: 'USER',
      is_active: true,
      email_verified: true,
      ...userData
    };

    const result = await testPool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [defaultUser.email, defaultUser.password_hash, defaultUser.first_name, defaultUser.last_name, defaultUser.role, defaultUser.is_active, defaultUser.email_verified]);

    return result.rows[0];
  },

  // Create test organization
  async createTestOrganization(orgData = {}) {
    const defaultOrg = {
      name: 'Test Organization',
      description: 'Test organization description',
      industry_type: 'IT_SUPPORT',
      created_by: '00000000-0000-0000-0000-000000000000',
      ...orgData
    };

    const result = await testPool.query(`
      INSERT INTO organizations (name, description, industry_type, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [defaultOrg.name, defaultOrg.description, defaultOrg.industry_type, defaultOrg.created_by]);

    return result.rows[0];
  },

  // Create test service record
  async createTestServiceRecord(serviceData = {}) {
    const defaultService = {
      title: 'Test Service',
      description: 'Test service description',
      industry_type: 'IT_SUPPORT',
      customer_name: 'Test Customer',
      amount: 100000,
      status: 'PENDING',
      priority: 'MEDIUM',
      date: '2025-02-04',
      organization_id: '00000000-0000-0000-0000-000000000000',
      created_by: '00000000-0000-0000-0000-000000000000',
      updated_by: '00000000-0000-0000-0000-000000000000',
      ...serviceData
    };

    const result = await testPool.query(`
      INSERT INTO service_records (
        title, description, industry_type, customer_name, amount, status, priority, 
        date, organization_id, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      defaultService.title, defaultService.description, defaultService.industry_type,
      defaultService.customer_name, defaultService.amount, defaultService.status,
      defaultService.priority, defaultService.date, defaultService.organization_id,
      defaultService.created_by, defaultService.updated_by
    ]);

    return result.rows[0];
  },

  // Generate test JWT token
  generateTestToken(userId = '00000000-0000-0000-0000-000000000000') {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret');
  },

  // Create test session
  async createTestSession(userId, token) {
    await testPool.query(`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES ($1, $2, $3)
    `, [userId, token, new Date(Date.now() + 24 * 60 * 60 * 1000)]);
  },

  // Mock request object
  createMockRequest(overrides = {}) {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: null,
      ...overrides
    };
  },

  // Mock response object
  createMockResponse() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis()
    };
    return res;
  },

  // Mock next function
  createMockNext() {
    return jest.fn();
  }
};

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock process.env for tests
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  JWT_SECRET: 'test-secret',
  DB_HOST: testDbConfig.host,
  DB_PORT: testDbConfig.port,
  DB_NAME: testDbConfig.database,
  DB_USER: testDbConfig.user,
  DB_PASSWORD: testDbConfig.password,
  GEMINI_API_KEY: 'test-api-key'
};
