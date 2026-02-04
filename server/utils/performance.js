// Production Performance Optimization Utilities
// Caching, connection pooling, query optimization, and performance monitoring

const Redis = require('redis');
const { Pool } = require('pg');

class PerformanceOptimizer {
  constructor() {
    this.redis = null;
    this.dbPool = null;
    this.cache = new Map();
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      dbQueries: 0,
      slowQueries: 0,
      avgResponseTime: 0,
      responseTimes: []
    };
    
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
    
    // Initialize database pool with optimized settings
    this.dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'servicenexus',
      user: process.env.DB_USER || 'servicenexus_user',
      password: process.env.DB_PASSWORD || 'servicenexus123',
      max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
      // Enable SSL for production
      ssl: process.env.DB_SSL === 'true',
      sslmode: 'require',
      // Performance optimizations
      statement_timeout: 30000,
      query_timeout: 30000,
      application_name: 'servicenexus'
    });
    
    // Set up pool event listeners
    this.dbPool.on('connect', () => {
      console.log('Database pool connected');
    });
    
    this.dbPool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
    
    console.log('🚀 Performance optimizer initialized');
  }

  // Caching middleware
  cacheMiddleware(options = {}) {
    const {
      ttl = options.ttl || 300, // 5 minutes default
      keyGenerator = options.keyGenerator || ((req) => req.originalUrl),
      condition = options.condition || (() => true),
      skipCache = options.skipCache || (() => false)
    } = options;

    return async (req, res, next) => {
      if (!condition(req) || skipCache(req)) {
        return next();
      }

      const cacheKey = keyGenerator(req);
      
      try {
        // Try to get from Redis cache
        if (this.redis) {
          const cached = await this.redis.get(cacheKey);
          if (cached) {
            this.metrics.cacheHits++;
            const data = JSON.parse(cached);
            
            res.set('X-Cache', 'HIT');
            res.set('X-Cache-TTL', await this.redis.ttl(cacheKey));
            return res.json(data);
          }
        }
        
        // Try memory cache
        const memoryCached = this.cache.get(cacheKey);
        if (memoryCached) {
          this.metrics.cacheHits++;
          res.set('X-Cache', 'HIT');
          res.set('X-Cache-TTL', 'memory');
          return res.json(memoryCached);
        }
        
        this.metrics.cacheMisses++;
        
        // Capture original res.json
        const originalJson = res.json;
        res.json = function(data) {
          // Cache the response
          const responseData = JSON.stringify(data);
          
          if (this.redis) {
            this.redis.setex(cacheKey, ttl, responseData);
          }
          
          // Also cache in memory (limited size)
          if (this.cache.size < 1000) {
            this.cache.set(cacheKey, data);
          }
          
          res.set('X-Cache', 'MISS');
          return originalJson.call(this, data);
        };
        
        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }

  // Database query optimization
  async optimizedQuery(query, params = [], options = {}) {
    const startTime = Date.now();
    
    try {
      const result = await this.dbPool.query(query, params);
      
      const queryTime = Date.now() - startTime;
      this.metrics.dbQueries++;
      this.metrics.responseTimes.push(queryTime);
      
      // Track slow queries
      if (queryTime > 1000) {
        this.metrics.slowQueries++;
        console.warn('Slow query detected:', {
          query: query.substring(0, 200),
          params,
          duration: queryTime
        });
      }
      
      // Update average response time
      if (this.metrics.responseTimes.length > 100) {
        this.metrics.responseTimes.shift();
      }
      
      this.metrics.avgResponseTime = 
        this.metrics.responseTimes.reduce((sum, time) => sum + time, 0) / 
        this.metrics.responseTimes.length;
      
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Batch query optimization
  async batchQuery(queries) {
    const client = await this.dbPool.connect();
    
    try {
      const results = [];
      
      for (const { query, params } of queries) {
        const result = await client.query(query, params);
        results.push(result);
      }
      
      return results;
    } finally {
      client.release();
    }
  }

  // Connection pooling optimization
  async getConnection() {
    return this.dbPool.connect();
  }

  // Cache invalidation
  async invalidateCache(pattern) {
    try {
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          console.log(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
        }
      }
      
      // Clear memory cache
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // Warm up cache
  async warmupCache() {
    console.log('🔥 Warming up cache...');
    
    try {
      // Cache frequently accessed data
      const warmupQueries = [
        { query: 'SELECT COUNT(*) as total_users FROM users WHERE is_active = true' },
        { query: 'SELECT COUNT(*) as total_organizations FROM organizations' },
        { query: 'SELECT COUNT(*) as total_services FROM services WHERE status = $1', params: ['COMPLETED'] },
        { query: 'SELECT industry_type, COUNT(*) as count FROM services GROUP BY industry_type' }
      ];
      
      for (const { query, params } of warmupQueries) {
        const result = await this.optimizedQuery(query, params);
        const cacheKey = `warmup:${query.substring(0, 50).replace(/\s+/g, '_')}`;
        
        if (this.redis) {
          await this.redis.setex(cacheKey, 300, JSON.stringify(result.rows));
        }
        
        this.cache.set(cacheKey, result.rows);
      }
      
      console.log('✅ Cache warmup completed');
    } catch (error) {
      console.error('Cache warmup error:', error);
    }
  }

  // Performance monitoring
  getMetrics() {
    const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0 
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 
      : 0;
    
    const slowQueryRate = this.metrics.dbQueries > 0 
      ? (this.metrics.slowQueries / this.metrics.dbQueries) * 100 
      : 0;
    
    return {
      cache: {
        hitRate: cacheHitRate.toFixed(2) + '%',
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        memoryCacheSize: this.cache.size
      },
      database: {
        totalQueries: this.metrics.dbQueries,
        slowQueries: this.metrics.slowQueries,
        slowQueryRate: slowQueryRate.toFixed(2) + '%',
        avgResponseTime: this.metrics.avgResponseTime.toFixed(2) + 'ms',
        pool: {
          totalCount: this.dbPool.totalCount,
          idleCount: this.dbPool.idleCount,
          waitingCount: this.dbPool.waitingCount
        }
      },
      redis: this.redis ? {
        connected: this.redis.status === 'ready',
        memory: this.redis.options.memory || 'N/A'
      } : null
    };
  }

  // Query optimization suggestions
  async analyzeSlowQueries() {
    try {
      // Get slow query statistics from PostgreSQL
      const result = await this.optimizedQuery(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements
        WHERE mean_time > 1000
        ORDER BY mean_time DESC
        LIMIT 10
      `);
      
      console.log('📊 Slow Query Analysis:');
      console.table(result.rows);
      
      return result.rows;
    } catch (error) {
      console.error('Slow query analysis failed:', error);
      return [];
    }
  }

  // Index optimization suggestions
  async analyzeIndexes() {
    try {
      // Get unused indexes
      const unusedIndexes = await this.optimizedQuery(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_size
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        ORDER BY idx_size DESC
      `);
      
      // Get missing indexes
      const missingIndexes = await this.optimizedQuery(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE correlation > 0.9 
          AND n_distinct > 100
        ORDER BY correlation DESC
        LIMIT 10
      `);
      
      console.log('📊 Index Analysis:');
      console.log('\n🗑️ Unused Indexes:');
      console.table(unusedIndexes.rows);
      
      console.log('\n🔍 Potential Missing Indexes:');
      console.table(missingIndexes.rows);
      
      return {
        unusedIndexes: unusedIndexes.rows,
        missingIndexes: missingIndexes.rows
      };
    } catch (error) {
      console.error('Index analysis failed:', error);
      return { unusedIndexes: [], missingIndexes: [] };
    }
  }

  // Memory optimization
  optimizeMemory() {
    // Clear old cache entries
    if (this.cache.size > 1000) {
      const entriesToDelete = Array.from(this.cache.entries()).slice(0, 500);
      entriesToDelete.forEach(([key]) => this.cache.delete(key));
      console.log('🧹 Cleared 500 old cache entries');
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('🗑️ Forced garbage collection');
    }
  }

  // Connection pool optimization
  optimizePool() {
    const pool = this.dbPool;
    
    console.log('🔧 Database Pool Status:');
    console.log(`  Total connections: ${pool.totalCount}`);
    console.log(`  Idle connections: ${pool.idleCount}`);
    console.log(`  Waiting clients: ${pool.waitingCount}`);
    
    // Adjust pool size based on load
    if (pool.waitingCount > 5 && pool.totalCount < 20) {
      console.log('⚠️ High load detected, consider increasing pool size');
    }
    
    if (pool.idleCount > pool.totalCount * 0.8 && pool.totalCount > 2) {
      console.log('⚠️ Many idle connections, consider decreasing pool size');
    }
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down performance optimizer...');
    
    // Close Redis connection
    if (this.redis) {
      await this.redis.quit();
    }
    
    // Close database pool
    await this.dbPool.end();
    
    console.log('✅ Performance optimizer shut down');
  }
}

// Query builder for optimized queries
class QueryBuilder {
  constructor() {
    this.query = '';
    this.params = [];
    this.joins = [];
    this.conditions = [];
    this.orderBy = [];
    this.limit = null;
    this.offset = null;
  }

  select(columns = '*') {
    this.query = `SELECT ${columns}`;
    return this;
  }

  from(table) {
    this.query += ` FROM ${table}`;
    return this;
  }

  join(table, on) {
    this.joins.push(`JOIN ${table} ON ${on}`);
    return this;
  }

  leftJoin(table, on) {
    this.joins.push(`LEFT JOIN ${table} ON ${on}`);
    return this;
  }

  where(condition, params = []) {
    this.conditions.push(condition);
    this.params.push(...params);
    return this;
  }

  whereIn(column, values) {
    const placeholders = values.map((_, index) => `$${this.params.length + index + 1}`).join(', ');
    this.conditions.push(`${column} IN (${placeholders})`);
    this.params.push(...values);
    return this;
  }

  orderBy(column, direction = 'ASC') {
    this.orderBy.push(`${column} ${direction}`);
    return this;
  }

  limit(count) {
    this.limit = count;
    return this;
  }

  offset(count) {
    this.offset = count;
    return this;
  }

  build() {
    let finalQuery = this.query;
    
    // Add joins
    if (this.joins.length > 0) {
      finalQuery += ' ' + this.joins.join(' ');
    }
    
    // Add conditions
    if (this.conditions.length > 0) {
      finalQuery += ' WHERE ' + this.conditions.join(' AND ');
    }
    
    // Add order by
    if (this.orderBy.length > 0) {
      finalQuery += ' ORDER BY ' + this.orderBy.join(', ');
    }
    
    // Add limit
    if (this.limit) {
      finalQuery += ` LIMIT ${this.limit}`;
    }
    
    // Add offset
    if (this.offset) {
      finalQuery += ` OFFSET ${this.offset}`;
    }
    
    return {
      query: finalQuery,
      params: this.params
    };
  }
}

// Performance monitoring middleware
const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests
    if (duration > 1000) {
      console.warn('Slow request detected:', {
        method: req.method,
        url: req.originalUrl,
        duration: duration + 'ms',
        statusCode: res.statusCode
      });
    }
    
    // Add performance headers
    res.set('X-Response-Time', duration + 'ms');
    res.set('X-Performance-Timestamp', new Date().toISOString());
  });
  
  next();
};

// Create singleton instance
const performanceOptimizer = new PerformanceOptimizer();

module.exports = {
  performanceOptimizer,
  QueryBuilder,
  performanceMiddleware
};
