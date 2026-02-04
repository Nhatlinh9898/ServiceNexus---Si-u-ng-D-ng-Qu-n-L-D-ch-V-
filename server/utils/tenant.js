// Multi-Tenant Architecture System
// Handles tenant isolation, database separation, and resource management

const { Pool } = require('pg');
const Redis = require('redis');
const EventEmitter = require('events');

class TenantManager extends EventEmitter {
  constructor() {
    super();
    this.db = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'servicenexus',
      user: process.env.DB_USER || 'servicenexus_user',
      password: process.env.DB_PASSWORD || 'servicenexus123',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    this.redis = null;
    this.tenantCache = new Map();
    this.tenantDatabases = new Map();
    this.tenantConnections = new Map();
    
    this.initialize();
  }

  async initialize() {
    // Initialize Redis connection
    if (process.env.REDIS_HOST) {
      this.redis = Redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retry_delay_on_failover: 100,
        enable_offline_queue: false,
        connectTimeout: 60000,
        lazyConnect: true
      });
      
      this.redis.on('error', (err) => {
        console.error('Redis error:', err);
      });
      
      await this.redis.connect();
    }
    
    // Create tenant management tables
    await this.createTenantTables();
    
    console.log('🏢 Tenant manager initialized');
  }

  async createTenantTables() {
    const createTablesQuery = `
      -- Tenants table
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subdomain VARCHAR(100) UNIQUE NOT NULL,
        domain VARCHAR(255),
        plan VARCHAR(50) DEFAULT 'basic',
        status VARCHAR(20) DEFAULT 'active',
        settings JSONB DEFAULT '{}',
        billing_info JSONB DEFAULT '{}',
        usage_stats JSONB DEFAULT '{}',
        limits JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE,
        trial_ends_at TIMESTAMP WITH TIME ZONE
      );
      
      -- Tenant databases
      CREATE TABLE IF NOT EXISTS tenant_databases (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        database_name VARCHAR(100) NOT NULL,
        database_host VARCHAR(255) NOT NULL,
        database_port INTEGER NOT NULL,
        database_user VARCHAR(100) NOT NULL,
        database_password VARCHAR(255) NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Tenant users
      CREATE TABLE IF NOT EXISTS tenant_users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        permissions JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Tenant subscriptions
      CREATE TABLE IF NOT EXISTS tenant_subscriptions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        plan VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        billing_cycle VARCHAR(20) DEFAULT 'monthly',
        features JSONB DEFAULT '{}',
        limits JSONB DEFAULT '{}',
        current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        current_period_end TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Tenant usage logs
      CREATE TABLE IF NOT EXISTS tenant_usage_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        metric VARCHAR(100) NOT NULL,
        value DECIMAL(15, 2) NOT NULL,
        unit VARCHAR(20) DEFAULT 'count',
        period VARCHAR(20) DEFAULT 'daily',
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
      CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
      CREATE INDEX IF NOT EXISTS idx_tenant_databases_tenant_id ON tenant_databases(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id ON tenant_subscriptions(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_usage_logs_tenant_id ON tenant_usage_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_usage_logs_metric ON tenant_usage_logs(metric);
      CREATE INDEX IF NOT EXISTS idx_tenant_usage_logs_recorded_at ON tenant_usage_logs(recorded_at);
    `;
    
    try {
      await this.db.query(createTablesQuery);
      console.log('✅ Tenant tables created/verified');
    } catch (error) {
      console.error('❌ Failed to create tenant tables:', error);
    }
  }

  // Create new tenant
  async createTenant(tenantData) {
    const {
      name,
      subdomain,
      domain = null,
      plan = 'basic',
      settings = {},
      billingInfo = {},
      limits = {},
      trialDays = 30
    } = tenantData;

    try {
      const client = await this.db.connect();
      
      try {
        await client.query('BEGIN');
        
        // Create tenant
        const tenantQuery = `
          INSERT INTO tenants (name, subdomain, domain, plan, settings, billing_info, limits, trial_ends_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '${trialDays} days')
          RETURNING *
        `;
        
        const tenantResult = await client.query(tenantQuery, [
          name, subdomain, domain, plan, settings, billingInfo, limits
        ]);
        const tenant = tenantResult.rows[0];
        
        // Create tenant database
        const databaseName = `tenant_${tenant.id.toString().replace(/-/g, '_')}`;
        const databaseUser = `tenant_user_${tenant.id.toString().replace(/-/g, '_').substring(0, 16)}`;
        const databasePassword = this.generateSecurePassword();
        
        // Create database and user
        await this.createTenantDatabase(databaseName, databaseUser, databasePassword);
        
        // Store database info
        const dbQuery = `
          INSERT INTO tenant_databases (tenant_id, database_name, database_host, database_port, database_user, database_password, is_primary)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        const dbResult = await client.query(dbQuery, [
          tenant.id, databaseName, process.env.DB_HOST || 'localhost',
          process.env.DB_PORT || 5432, databaseUser, databasePassword, true
        ]);
        
        // Create subscription
        const subscriptionQuery = `
          INSERT INTO tenant_subscriptions (tenant_id, plan, status, amount, currency, billing_cycle, features, limits)
          VALUES ($1, $2, 'active', $3, 'USD', 'monthly', $4, $5)
          RETURNING *
        `;
        
        const planFeatures = this.getPlanFeatures(plan);
        const planLimits = this.getPlanLimits(plan);
        
        const subscriptionResult = await client.query(subscriptionQuery, [
          tenant.id, plan, this.getPlanPrice(plan), planFeatures, planLimits
        ]);
        
        await client.query('COMMIT');
        
        // Cache tenant info
        await this.cacheTenantInfo(tenant.id, tenant);
        
        // Initialize tenant database schema
        await this.initializeTenantSchema(databaseName, databaseUser, databasePassword);
        
        console.log(`🏢 Tenant created: ${name} (${subdomain})`);
        
        this.emit('tenant_created', {
          tenant,
          database: dbResult.rows[0],
          subscription: subscriptionResult.rows[0]
        });
        
        return {
          tenant,
          database: dbResult.rows[0],
          subscription: subscriptionResult.rows[0]
        };
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ Failed to create tenant:', error);
      throw error;
    }
  }

  // Create tenant database
  async createTenantDatabase(databaseName, databaseUser, databasePassword) {
    const adminClient = await this.db.connect();
    
    try {
      // Create database
      await adminClient.query(`CREATE DATABASE "${databaseName}"`);
      
      // Create user
      await adminClient.query(`CREATE USER "${databaseUser}" WITH PASSWORD '${databasePassword}'`);
      
      // Grant privileges
      await adminClient.query(`GRANT ALL PRIVILEGES ON DATABASE "${databaseName}" TO "${databaseUser}"`);
      
      console.log(`🗄️ Tenant database created: ${databaseName}`);
      
    } catch (error) {
      console.error('❌ Failed to create tenant database:', error);
      throw error;
    } finally {
      adminClient.release();
    }
  }

  // Initialize tenant database schema
  async initializeTenantSchema(databaseName, databaseUser, databasePassword) {
    const tenantDb = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: databaseName,
      user: databaseUser,
      password: databasePassword,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    try {
      // Read schema file
      const fs = require('fs').promises;
      const schemaPath = './database/tenant-schema.sql';
      const schemaSQL = await fs.readFile(schemaPath, 'utf8');
      
      // Execute schema
      await tenantDb.query(schemaSQL);
      
      console.log(`📋 Tenant schema initialized: ${databaseName}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize tenant schema:', error);
      throw error;
    } finally {
      await tenantDb.end();
    }
  }

  // Get tenant by subdomain
  async getTenantBySubdomain(subdomain) {
    try {
      // Check cache first
      const cacheKey = `tenant:subdomain:${subdomain}`;
      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
      
      // Check memory cache
      if (this.tenantCache.has(subdomain)) {
        return this.tenantCache.get(subdomain);
      }
      
      // Query database
      const query = `
        SELECT t.*, td.database_name, td.database_host, td.database_port, 
               td.database_user, td.database_password, td.database_password,
               ts.plan as subscription_plan, ts.status as subscription_status,
               ts.features as subscription_features, ts.limits as subscription_limits,
               ts.current_period_start, ts.current_period_end
        FROM tenants t
        LEFT JOIN tenant_databases td ON t.id = td.tenant_id AND td.is_primary = TRUE
        LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id AND ts.status = 'active'
        WHERE t.subdomain = $1 AND t.status = 'active'
      `;
      
      const result = await this.db.query(query, [subdomain]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const tenant = result.rows[0];
      
      // Cache tenant info
      await this.cacheTenantInfo(subdomain, tenant);
      
      return tenant;
      
    } catch (error) {
      console.error('❌ Failed to get tenant by subdomain:', error);
      throw error;
    }
  }

  // Get tenant database connection
  async getTenantDatabase(tenantId) {
    try {
      // Check if connection already exists
      if (this.tenantConnections.has(tenantId)) {
        return this.tenantConnections.get(tenantId);
      }
      
      // Get tenant database info
      const query = `
        SELECT database_name, database_host, database_port, database_user, database_password
        FROM tenant_databases
        WHERE tenant_id = $1 AND is_primary = TRUE AND status = 'active'
      `;
      
      const result = await this.db.query(query, [tenantId]);
      
      if (result.rows.length === 0) {
        throw new Error('Tenant database not found');
      }
      
      const dbInfo = result.rows[0];
      
      // Create connection pool
      const pool = new Pool({
        host: dbInfo.database_host,
        port: dbInfo.database_port,
        database: dbInfo.database_name,
        user: dbInfo.database_user,
        password: dbInfo.database_password,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      
      // Cache connection
      this.tenantConnections.set(tenantId, pool);
      
      return pool;
      
    } catch (error) {
      console.error('❌ Failed to get tenant database:', error);
      throw error;
    }
  }

  // Check tenant limits
  async checkTenantLimits(tenantId, metric, value = 1) {
    try {
      const query = `
        SELECT t.limits, ts.limits as subscription_limits
        FROM tenants t
        LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id AND ts.status = 'active'
        WHERE t.id = $1
      `;
      
      const result = await this.db.query(query, [tenantId]);
      
      if (result.rows.length === 0) {
        return { allowed: false, reason: 'Tenant not found' };
      }
      
      const tenant = result.rows[0];
      const limits = { ...tenant.limits, ...tenant.subscription_limits };
      
      // Get current usage
      const usage = await this.getTenantUsage(tenantId, metric);
      
      // Check if limit would be exceeded
      const limit = limits[metric];
      if (limit && usage + value > limit) {
        return {
          allowed: false,
          reason: `Limit exceeded for ${metric}. Current: ${usage}, Limit: ${limit}, Requested: ${value}`,
          current: usage,
          limit,
          requested: value
        };
      }
      
      return { allowed: true, current: usage, limit };
      
    } catch (error) {
      console.error('❌ Failed to check tenant limits:', error);
      return { allowed: false, reason: 'Error checking limits' };
    }
  }

  // Record tenant usage
  async recordTenantUsage(tenantId, metric, value, unit = 'count', period = 'daily') {
    try {
      const query = `
        INSERT INTO tenant_usage_logs (tenant_id, metric, value, unit, period)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const result = await this.db.query(query, [tenantId, metric, value, unit, period]);
      
      // Update cache
      await this.updateUsageCache(tenantId, metric, value);
      
      this.emit('usage_recorded', {
        tenantId,
        metric,
        value,
        unit,
        period
      });
      
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Failed to record tenant usage:', error);
      throw error;
    }
  }

  // Get tenant usage
  async getTenantUsage(tenantId, metric, period = 'daily') {
    try {
      const cacheKey = `usage:${tenantId}:${metric}:${period}`;
      
      // Check cache
      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return parseFloat(cached);
        }
      }
      
      // Calculate date range
      let dateCondition;
      switch (period) {
        case 'daily':
          dateCondition = `DATE(recorded_at) = CURRENT_DATE`;
          break;
        case 'weekly':
          dateCondition = `DATE_TRUNC('week', recorded_at) = DATE_TRUNC('week', CURRENT_DATE)`;
          break;
        case 'monthly':
          dateCondition = `DATE_TRUNC('month', recorded_at) = DATE_TRUNC('month', CURRENT_DATE)`;
          break;
        default:
          dateCondition = `DATE(recorded_at) = CURRENT_DATE`;
      }
      
      const query = `
        SELECT COALESCE(SUM(value), 0) as total
        FROM tenant_usage_logs
        WHERE tenant_id = $1 AND metric = $2 AND ${dateCondition}
      `;
      
      const result = await this.db.query(query, [tenantId, metric]);
      const usage = parseFloat(result.rows[0].total);
      
      // Cache result
      if (this.redis) {
        await this.redis.setex(cacheKey, 300, usage.toString());
      }
      
      return usage;
      
    } catch (error) {
      console.error('❌ Failed to get tenant usage:', error);
      return 0;
    }
  }

  // Get tenant statistics
  async getTenantStats(tenantId) {
    try {
      const query = `
        SELECT 
          metric,
          SUM(value) as total,
          unit,
          period
        FROM tenant_usage_logs
        WHERE tenant_id = $1 AND recorded_at >= NOW() - INTERVAL '30 days'
        GROUP BY metric, unit, period
        ORDER BY metric, period
      `;
      
      const result = await this.db.query(query, [tenantId]);
      
      return result.rows;
      
    } catch (error) {
      console.error('❌ Failed to get tenant stats:', error);
      return [];
    }
  }

  // Update tenant
  async updateTenant(tenantId, updates) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
      
      fields.push(`updated_at = NOW()`);
      values.push(tenantId);
      
      const query = `
        UPDATE tenants 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const tenant = result.rows[0];
      
      // Update cache
      await this.cacheTenantInfo(tenant.subdomain, tenant);
      
      this.emit('tenant_updated', tenant);
      
      return tenant;
      
    } catch (error) {
      console.error('❌ Failed to update tenant:', error);
      throw error;
    }
  }

  // Delete tenant
  async deleteTenant(tenantId) {
    try {
      const client = await this.db.connect();
      
      try {
        await client.query('BEGIN');
        
        // Get tenant info
        const tenantQuery = 'SELECT * FROM tenants WHERE id = $1';
        const tenantResult = await client.query(tenantQuery, [tenantId]);
        
        if (tenantResult.rows.length === 0) {
          throw new Error('Tenant not found');
        }
        
        const tenant = tenantResult.rows[0];
        
        // Get database info
        const dbQuery = `
          SELECT database_name, database_user 
          FROM tenant_databases 
          WHERE tenant_id = $1 AND is_primary = TRUE
        `;
        const dbResult = await client.query(dbQuery, [tenantId]);
        
        if (dbResult.rows.length > 0) {
          const dbInfo = dbResult.rows[0];
          
          // Drop database
          await client.query(`DROP DATABASE IF EXISTS "${dbInfo.database_name}"`);
          
          // Drop user
          await client.query(`DROP USER IF EXISTS "${dbInfo.database_user}"`);
        }
        
        // Delete tenant (cascade will delete related records)
        const deleteQuery = 'DELETE FROM tenants WHERE id = $1';
        await client.query(deleteQuery, [tenantId]);
        
        await client.query('COMMIT');
        
        // Clean up caches
        this.tenantCache.delete(tenant.subdomain);
        if (this.tenantConnections.has(tenantId)) {
          await this.tenantConnections.get(tenantId).end();
          this.tenantConnections.delete(tenantId);
        }
        
        console.log(`🗑️ Tenant deleted: ${tenant.name} (${tenant.subdomain})`);
        
        this.emit('tenant_deleted', tenant);
        
        return tenant;
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ Failed to delete tenant:', error);
      throw error;
    }
  }

  // Helper methods
  generateSecurePassword() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  getPlanFeatures(plan) {
    const features = {
      basic: {
        users: 5,
        storage: 1000, // MB
        api_calls: 10000,
        features: ['basic_analytics', 'email_support']
      },
      pro: {
        users: 20,
        storage: 10000, // MB
        api_calls: 100000,
        features: ['advanced_analytics', 'priority_support', 'custom_integrations']
      },
      enterprise: {
        users: -1, // unlimited
        storage: -1, // unlimited
        api_calls: -1, // unlimited
        features: ['white_label', 'dedicated_support', 'custom_features', 'sla']
      }
    };
    
    return features[plan] || features.basic;
  }

  getPlanLimits(plan) {
    const limits = {
      basic: {
        max_users: 5,
        max_storage_mb: 1000,
        max_api_calls_per_day: 10000,
        max_concurrent_requests: 10
      },
      pro: {
        max_users: 20,
        max_storage_mb: 10000,
        max_api_calls_per_day: 100000,
        max_concurrent_requests: 50
      },
      enterprise: {
        max_users: -1,
        max_storage_mb: -1,
        max_api_calls_per_day: -1,
        max_concurrent_requests: -1
      }
    };
    
    return limits[plan] || limits.basic;
  }

  getPlanPrice(plan) {
    const prices = {
      basic: 29.99,
      pro: 99.99,
      enterprise: 299.99
    };
    
    return prices[plan] || prices.basic;
  }

  async cacheTenantInfo(key, tenant) {
    // Memory cache
    this.tenantCache.set(key, tenant);
    
    // Redis cache
    if (this.redis) {
      const cacheKey = `tenant:${key}`;
      await this.redis.setex(cacheKey, 300, JSON.stringify(tenant));
    }
  }

  async updateUsageCache(tenantId, metric, value) {
    if (this.redis) {
      const cacheKey = `usage:${tenantId}:${metric}:daily`;
      const current = await this.redis.get(cacheKey);
      const newValue = (parseFloat(current || '0') + value).toString();
      await this.redis.setex(cacheKey, 300, newValue);
    }
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down tenant manager...');
    
    // Close all tenant connections
    for (const [tenantId, pool] of this.tenantConnections) {
      await pool.end();
    }
    
    // Close Redis connection
    if (this.redis) {
      await this.redis.quit();
    }
    
    // Close main database connection
    await this.db.end();
    
    console.log('✅ Tenant manager shut down');
  }
}

// Create singleton instance
const tenantManager = new TenantManager();

module.exports = tenantManager;
