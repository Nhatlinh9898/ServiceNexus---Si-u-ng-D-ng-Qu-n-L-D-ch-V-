// Database Integration Tests
// Test database operations, migrations, and data integrity

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

describe('Database Integration Tests', () => {
  let pool;
  let testDbConfig;

  beforeAll(async () => {
    // Use test database configuration
    testDbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME + '_test' || 'servicenexus_test',
      user: process.env.DB_USER || 'servicenexus_user',
      password: process.env.DB_PASSWORD || 'servicenexus123',
    };

    pool = new Pool(testDbConfig);

    // Test connection
    await pool.query('SELECT NOW()');
    
    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await pool.end();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  async function cleanupTestData() {
    const tables = [
      'service_record_history',
      'ai_conversations',
      'ai_insights',
      'user_sessions',
      'files',
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
        await pool.query(`DELETE FROM ${table}`);
      } catch (error) {
        // Table might not exist, continue
      }
    }
  }

  describe('Database Schema Validation', () => {
    it('should have all required tables', async () => {
      const requiredTables = [
        'users',
        'organizations',
        'departments',
        'employees',
        'service_records',
        'service_record_history',
        'ai_conversations',
        'ai_insights',
        'user_sessions',
        'system_logs'
      ];

      for (const table of requiredTables) {
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);

        expect(result.rows[0].exists).toBe(true);
      }
    });

    it('should have correct table structures', async () => {
      // Check users table structure
      const usersColumns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);

      const requiredUserColumns = ['id', 'email', 'password_hash', 'first_name', 'last_name', 'role', 'is_active'];
      const userColumnNames = usersColumns.rows.map(row => row.column_name);

      requiredUserColumns.forEach(column => {
        expect(userColumnNames).toContain(column);
      });

      // Check organizations table structure
      const orgColumns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'organizations'
        ORDER BY ordinal_position
      `);

      const requiredOrgColumns = ['id', 'name', 'industry_type', 'created_by'];
      const orgColumnNames = orgColumns.rows.map(row => row.column_name);

      requiredOrgColumns.forEach(column => {
        expect(orgColumnNames).toContain(column);
      });
    });

    it('should have proper foreign key constraints', async () => {
      // Check foreign key constraints
      const constraints = await pool.query(`
        SELECT
          tc.constraint_name, 
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name, tc.constraint_name
      `);

      expect(constraints.rows.length).toBeGreaterThan(0);

      // Check specific important constraints
      const serviceRecordFk = constraints.rows.find(c => 
        c.table_name === 'service_records' && 
        c.column_name === 'organization_id'
      );
      expect(serviceRecordFk).toBeDefined();
      expect(serviceRecordFk.foreign_table_name).toBe('organizations');
    });

    it('should have proper indexes', async () => {
      // Check indexes on important columns
      const indexes = await pool.query(`
        SELECT
          indexname,
          indexdef,
          tablename
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);

      expect(indexes.rows.length).toBeGreaterThan(0);

      // Check for email index on users table
      const emailIndex = indexes.rows.find(idx => 
        idx.tablename === 'users' && 
        idx.indexdef.includes('email')
      );
      expect(emailIndex).toBeDefined();
    });
  });

  describe('Data Operations', () => {
    it('should create and retrieve users', async () => {
      const userData = {
        email: 'test@example.com',
        password_hash: '$2b$10$rQZ8ZqZqZqZqZqZqZqZqZu',
        first_name: 'Test',
        last_name: 'User',
        role: 'USER',
        is_active: true,
        email_verified: false
      };

      const insertResult = await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        userData.email, userData.password_hash, userData.first_name, userData.last_name,
        userData.role, userData.is_active, userData.email_verified
      ]);

      expect(insertResult.rows).toHaveLength(1);
      expect(insertResult.rows[0].email).toBe(userData.email);
      expect(insertResult.rows[0].id).toBeDefined();

      const userId = insertResult.rows[0].id;

      // Retrieve user
      const selectResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      expect(selectResult.rows).toHaveLength(1);
      expect(selectResult.rows[0].email).toBe(userData.email);
    });

    it('should create and retrieve organizations', async () => {
      const orgData = {
        name: 'Test Organization',
        description: 'Test organization description',
        industry_type: 'IT_SUPPORT',
        created_by: '00000000-0000-0000-0000-000000000000'
      };

      const insertResult = await pool.query(`
        INSERT INTO organizations (name, description, industry_type, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [orgData.name, orgData.description, orgData.industry_type, orgData.created_by]);

      expect(insertResult.rows).toHaveLength(1);
      expect(insertResult.rows[0].name).toBe(orgData.name);
      expect(insertResult.rows[0].id).toBeDefined();

      const orgId = insertResult.rows[0].id;

      // Retrieve organization
      const selectResult = await pool.query('SELECT * FROM organizations WHERE id = $1', [orgId]);
      expect(selectResult.rows).toHaveLength(1);
      expect(selectResult.rows[0].name).toBe(orgData.name);
    });

    it('should create and retrieve service records with relationships', async () => {
      // Create organization first
      const orgResult = await pool.query(`
        INSERT INTO organizations (name, industry_type, created_by)
        VALUES ($1, $2, $3)
        RETURNING id
      `, ['Test Org', 'RESTAURANT', '00000000-0000-0000-0000-000000000000']);

      const orgId = orgResult.rows[0].id;

      // Create service record
      const serviceData = {
        title: 'Test Service',
        description: 'Test service description',
        industry_type: 'RESTAURANT',
        customer_name: 'Test Customer',
        amount: 100000,
        status: 'PENDING',
        priority: 'MEDIUM',
        date: '2025-02-04',
        organization_id: orgId,
        created_by: '00000000-0000-0000-0000-000000000000',
        updated_by: '00000000-0000-0000-0000-000000000000'
      };

      const insertResult = await pool.query(`
        INSERT INTO service_records (
          title, description, industry_type, customer_name, amount, status, priority,
          date, organization_id, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        serviceData.title, serviceData.description, serviceData.industry_type,
        serviceData.customer_name, serviceData.amount, serviceData.status,
        serviceData.priority, serviceData.date, serviceData.organization_id,
        serviceData.created_by, serviceData.updated_by
      ]);

      expect(insertResult.rows).toHaveLength(1);
      expect(insertResult.rows[0].title).toBe(serviceData.title);

      const serviceId = insertResult.rows[0].id;

      // Retrieve service with organization join
      const selectResult = await pool.query(`
        SELECT sr.*, o.name as organization_name
        FROM service_records sr
        JOIN organizations o ON sr.organization_id = o.id
        WHERE sr.id = $1
      `, [serviceId]);

      expect(selectResult.rows).toHaveLength(1);
      expect(selectResult.rows[0].title).toBe(serviceData.title);
      expect(selectResult.rows[0].organization_name).toBe('Test Org');
    });

    it('should handle service record history', async () => {
      // Create organization and service
      const orgResult = await pool.query(`
        INSERT INTO organizations (name, industry_type, created_by)
        VALUES ($1, $2, $3)
        RETURNING id
      `, ['History Test Org', 'IT_SUPPORT', '00000000-0000-0000-0000-000000000000']);

      const orgId = orgResult.rows[0].id;

      const serviceResult = await pool.query(`
        INSERT INTO service_records (title, industry_type, customer_name, amount, status, date, organization_id, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, ['History Test Service', 'IT_SUPPORT', 'Test Customer', 50000, 'PENDING', '2025-02-04', orgId, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000']);

      const serviceId = serviceResult.rows[0].id;

      // Update service status (this should trigger history)
      await pool.query(`
        UPDATE service_records 
        SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [serviceId]);

      // Check history
      const historyResult = await pool.query(`
        SELECT * FROM service_record_history
        WHERE service_record_id = $1
        ORDER BY changed_at DESC
      `, [serviceId]);

      expect(historyResult.rows.length).toBeGreaterThan(0);
      expect(historyResult.rows[0].service_record_id).toBe(serviceId);
    });
  });

  describe('Data Integrity and Constraints', () => {
    it('should enforce unique constraints', async () => {
      // Create user
      await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['unique@example.com', '$2b$10$rQZ8ZqZqZqZqZqZqZqZqZu', 'Test', 'User', 'USER', true, false]);

      // Try to create another user with same email (should fail)
      await expect(pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['unique@example.com', '$2b$10$rQZ8ZqZqZqZqZqZqZqZqZu', 'Test2', 'User2', 'USER', true, false]))
        .rejects.toThrow();
    });

    it('should enforce foreign key constraints', async () => {
      // Try to create service record with non-existent organization (should fail)
      await expect(pool.query(`
        INSERT INTO service_records (title, industry_type, customer_name, amount, status, date, organization_id, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, ['Invalid Service', 'RESTAURANT', 'Test Customer', 100000, 'PENDING', '2025-02-04', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000']))
        .rejects.toThrow();
    });

    it('should enforce not null constraints', async () => {
      // Try to create user without required fields (should fail)
      await expect(pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [null, 'hash', 'Test', 'User', 'USER', true, false]))
        .rejects.toThrow();
    });

    it('should enforce check constraints', async () => {
      // Try to create user with invalid role (should fail)
      await expect(pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['check@example.com', '$2b$10$rQZ8ZqZqZqZqZqZqZqZqZu', 'Test', 'User', 'INVALID_ROLE', true, false]))
        .rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk inserts efficiently', async () => {
      const startTime = Date.now();
      
      // Create organization
      const orgResult = await pool.query(`
        INSERT INTO organizations (name, industry_type, created_by)
        VALUES ($1, $2, $3)
        RETURNING id
      `, ['Bulk Test Org', 'IT_SUPPORT', '00000000-0000-0000-0000-000000000000']);

      const orgId = orgResult.rows[0].id;

      // Insert 100 service records
      const insertPromises = [];
      for (let i = 0; i < 100; i++) {
        insertPromises.push(
          pool.query(`
            INSERT INTO service_records (title, industry_type, customer_name, amount, status, date, organization_id, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [`Service ${i}`, 'IT_SUPPORT', `Customer ${i}`, 100000 + i, 'PENDING', '2025-02-04', orgId, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'])
        );
      }

      await Promise.all(insertPromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);

      // Verify all records were inserted
      const countResult = await pool.query('SELECT COUNT(*) FROM service_records WHERE organization_id = $1', [orgId]);
      expect(parseInt(countResult.rows[0].count)).toBe(100);
    });

    it('should handle complex queries efficiently', async () => {
      const startTime = Date.now();

      // Create test data
      const orgResult = await pool.query(`
        INSERT INTO organizations (name, industry_type, created_by)
        VALUES ($1, $2, $3)
        RETURNING id
      `, ['Query Test Org', 'RESTAURANT', '00000000-0000-0000-0000-000000000000']);

      const orgId = orgResult.rows[0].id;

      // Insert test services
      for (let i = 0; i < 50; i++) {
        await pool.query(`
          INSERT INTO service_records (title, industry_type, customer_name, amount, status, date, organization_id, created_by, updated_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [`Query Service ${i}`, 'RESTAURANT', `Customer ${i}`, 50000 + i * 1000, ['PENDING', 'IN_PROGRESS', 'COMPLETED'][i % 3], '2025-02-04', orgId, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000']);
      }

      // Run complex query with joins and aggregations
      const complexResult = await pool.query(`
        SELECT 
          sr.status,
          COUNT(*) as count,
          AVG(sr.amount) as avg_amount,
          MAX(sr.amount) as max_amount,
          MIN(sr.amount) as min_amount
        FROM service_records sr
        JOIN organizations o ON sr.organization_id = o.id
        WHERE o.industry_type = $1
          AND sr.date >= $2
        GROUP BY sr.status
        ORDER BY count DESC
      `, ['RESTAURANT', '2025-02-01']);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
      expect(complexResult.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Transaction Handling', () => {
    it('should rollback on transaction failure', async () => {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Insert first record
        await client.query(`
          INSERT INTO organizations (name, industry_type, created_by)
          VALUES ($1, $2, $3)
        `, ['Transaction Test Org', 'IT_SUPPORT', '00000000-0000-0000-0000-000000000000']);

        // Try to insert invalid record (should fail)
        await client.query(`
          INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [null, 'hash', 'Test', 'User', 'INVALID_ROLE', true, false]);

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }

      // Verify no records were inserted
      const orgCount = await pool.query('SELECT COUNT(*) FROM organizations WHERE name = $1', ['Transaction Test Org']);
      expect(parseInt(orgCount.rows[0].count)).toBe(0);
    });

    it('should commit successful transactions', async () => {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Insert organization
        const orgResult = await client.query(`
          INSERT INTO organizations (name, industry_type, created_by)
          VALUES ($1, $2, $3)
          RETURNING id
        `, ['Success Test Org', 'IT_SUPPORT', '00000000-0000-0000-0000-000000000000']);

        const orgId = orgResult.rows[0].id;

        // Insert service record
        await client.query(`
          INSERT INTO service_records (title, industry_type, customer_name, amount, status, date, organization_id, created_by, updated_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, ['Success Test Service', 'IT_SUPPORT', 'Test Customer', 100000, 'PENDING', '2025-02-04', orgId, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000']);

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      // Verify records were inserted
      const orgCount = await pool.query('SELECT COUNT(*) FROM organizations WHERE name = $1', ['Success Test Org']);
      expect(parseInt(orgCount.rows[0].count)).toBe(1);

      const serviceCount = await pool.query('SELECT COUNT(*) FROM service_records WHERE title = $1', ['Success Test Service']);
      expect(parseInt(serviceCount.rows[0].count)).toBe(1);
    });
  });

  describe('Connection Pool Management', () => {
    it('should handle multiple concurrent connections', async () => {
      const promises = [];
      const concurrentConnections = 10;

      for (let i = 0; i < concurrentConnections; i++) {
        promises.push(
          pool.query('SELECT NOW() as timestamp, $1 as connection_id', [i])
        );
      }

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(concurrentConnections);
      results.forEach(result => {
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].timestamp).toBeDefined();
      });
    });

    it('should release connections back to pool', async () => {
      const initialTotalCount = pool.totalCount;
      const initialIdleCount = pool.idleCount;
      const initialWaitingCount = pool.waitingCount;

      // Use a connection
      const client = await pool.connect();
      expect(pool.totalCount).toBe(initialTotalCount);
      expect(pool.idleCount).toBe(initialIdleCount - 1);

      // Release connection
      client.release();
      expect(pool.idleCount).toBe(initialIdleCount);
    });
  });
});
