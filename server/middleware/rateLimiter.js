// Advanced API Rate Limiting and Throttling Middleware
// Supports multiple strategies, distributed limiting, and dynamic configuration

const Redis = require('redis');
const { performance } = require('perf_hooks');

class RateLimiter {
  constructor(options = {}) {
    this.redis = null;
    this.memoryStore = new Map();
    this.options = {
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
      maxRequests: options.maxRequests || 100,
      message: options.message || 'Too many requests',
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator,
      handler: options.handler || this.defaultHandler,
      onLimitReached: options.onLimitReached || this.defaultOnLimitReached,
      store: options.store || 'memory', // 'memory', 'redis', 'database'
      ...options
    };
    
    this.initialize();
  }

  async initialize() {
    if (this.options.store === 'redis') {
      this.redis = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retry_delay_on_failover: 100,
        enable_offline_queue: false,
        connectTimeout: 60000,
        lazyConnect: true
      });
      
      this.redis.on('error', (err) => {
        console.error('Redis rate limiter error:', err);
      });
      
      await this.redis.connect();
    }
    
    console.log(`🚦 Rate limiter initialized (${this.options.store} store)`);
  }

  // Main middleware function
  middleware() {
    return async (req, res, next) => {
      try {
        const key = this.options.keyGenerator(req);
        const result = await this.checkLimit(key, req);
        
        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': result.limit,
          'X-RateLimit-Remaining': Math.max(0, result.remaining),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        });
        
        if (result.allowed) {
          // Track request if needed
          if (!this.shouldSkipRequest(req, res)) {
            await this.trackRequest(key, req);
          }
          return next();
        } else {
          // Rate limit exceeded
          await this.options.onLimitReached(req, res, result);
          return this.options.handler(req, res, result);
        }
        
      } catch (error) {
        console.error('Rate limiter error:', error);
        // Fail open - allow request if rate limiter fails
        return next();
      }
    };
  }

  // Check if request should be rate limited
  async checkLimit(key, req) {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    if (this.options.store === 'redis') {
      return await this.checkRedisLimit(key, now, windowStart);
    } else {
      return this.checkMemoryLimit(key, now, windowStart);
    }
  }

  // Redis-based rate limiting
  async checkRedisLimit(key, now, windowStart) {
    const pipeline = this.redis.pipeline();
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiration
    pipeline.expire(key, Math.ceil(this.options.windowMs / 1000));
    
    const results = await pipeline.exec();
    const currentCount = results[1][1];
    
    return {
      allowed: currentCount < this.options.maxRequests,
      limit: this.options.maxRequests,
      remaining: Math.max(0, this.options.maxRequests - currentCount - 1),
      resetTime: now + this.options.windowMs,
      currentCount: currentCount + 1
    };
  }

  // Memory-based rate limiting
  checkMemoryLimit(key, now, windowStart) {
    if (!this.memoryStore.has(key)) {
      this.memoryStore.set(key, []);
    }
    
    const requests = this.memoryStore.get(key);
    
    // Remove expired requests
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check limit
    const allowed = validRequests.length < this.options.maxRequests;
    
    if (allowed) {
      validRequests.push(now);
    }
    
    // Update store
    this.memoryStore.set(key, validRequests);
    
    return {
      allowed,
      limit: this.options.maxRequests,
      remaining: Math.max(0, this.options.maxRequests - validRequests.length),
      resetTime: now + this.options.windowMs,
      currentCount: validRequests.length
    };
  }

  // Track request for analytics
  async trackRequest(key, req) {
    // This could be used for analytics and monitoring
    // Implementation depends on requirements
  }

  // Check if request should be skipped
  shouldSkipRequest(req, res) {
    if (this.options.skipSuccessfulRequests && res.statusCode >= 200 && res.statusCode < 300) {
      return true;
    }
    
    if (this.options.skipFailedRequests && res.statusCode >= 400) {
      return true;
    }
    
    return false;
  }

  // Default key generator
  defaultKeyGenerator(req) {
    // Use IP address and user ID if available
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userId = req.user ? req.user.id : 'anonymous';
    const endpoint = req.route ? req.route.path : req.path;
    
    return `${ip}:${userId}:${endpoint}`;
  }

  // Default handler
  defaultHandler(req, res, result) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: this.options.message,
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      limit: result.limit,
      remaining: result.remaining,
      resetTime: result.resetTime
    });
  }

  // Default on limit reached callback
  defaultOnLimitReached(req, res, result) {
    console.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
  }

  // Reset rate limit for a key
  async resetKey(key) {
    if (this.options.store === 'redis') {
      await this.redis.del(key);
    } else {
      this.memoryStore.delete(key);
    }
  }

  // Get current rate limit status
  async getStatus(key) {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    if (this.options.store === 'redis') {
      const pipeline = this.redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zcard(key);
      
      const results = await pipeline.exec();
      const currentCount = results[1][1];
      
      return {
        currentCount,
        limit: this.options.maxRequests,
        remaining: Math.max(0, this.options.maxRequests - currentCount),
        resetTime: now + this.options.windowMs
      };
    } else {
      const requests = this.memoryStore.get(key) || [];
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      
      return {
        currentCount: validRequests.length,
        limit: this.options.maxRequests,
        remaining: Math.max(0, this.options.maxRequests - validRequests.length),
        resetTime: now + this.options.windowMs
      };
    }
  }

  // Clean up expired entries
  async cleanup() {
    if (this.options.store === 'memory') {
      const now = Date.now();
      const windowStart = now - this.options.windowMs;
      
      for (const [key, requests] of this.memoryStore.entries()) {
        const validRequests = requests.filter(timestamp => timestamp > windowStart);
        if (validRequests.length === 0) {
          this.memoryStore.delete(key);
        } else {
          this.memoryStore.set(key, validRequests);
        }
      }
    }
  }

  // Graceful shutdown
  async shutdown() {
    if (this.redis) {
      await this.redis.quit();
    }
    this.memoryStore.clear();
  }
}

// Advanced rate limiter with multiple strategies
class AdvancedRateLimiter extends RateLimiter {
  constructor(options = {}) {
    super(options);
    this.strategies = new Map();
    this.globalLimits = options.globalLimits || {};
    this.endpointLimits = options.endpointLimits || {};
    this.userLimits = options.userLimits || {};
    this.ipLimits = options.ipLimits || {};
    
    this.setupStrategies();
  }

  setupStrategies() {
    // Global rate limiting
    if (this.globalLimits.enabled) {
      this.strategies.set('global', new RateLimiter({
        windowMs: this.globalLimits.windowMs || 60 * 1000,
        maxRequests: this.globalLimits.maxRequests || 1000,
        keyGenerator: (req) => 'global',
        store: this.options.store,
        message: 'Global rate limit exceeded'
      }));
    }

    // Endpoint-specific rate limiting
    for (const [endpoint, config] of Object.entries(this.endpointLimits)) {
      this.strategies.set(`endpoint:${endpoint}`, new RateLimiter({
        windowMs: config.windowMs || 60 * 1000,
        maxRequests: config.maxRequests || 100,
        keyGenerator: (req) => `endpoint:${req.path}`,
        store: this.options.store,
        message: `Rate limit exceeded for ${endpoint}`
      }));
    }

    // User-specific rate limiting
    for (const [role, config] of Object.entries(this.userLimits)) {
      this.strategies.set(`user:${role}`, new RateLimiter({
        windowMs: config.windowMs || 60 * 1000,
        maxRequests: config.maxRequests || 100,
        keyGenerator: (req) => `user:${req.user?.role || 'anonymous'}`,
        store: this.options.store,
        message: `Rate limit exceeded for ${role} users`
      }));
    }

    // IP-specific rate limiting
    this.strategies.set('ip', new RateLimiter({
      windowMs: this.ipLimits.windowMs || 60 * 1000,
      maxRequests: this.ipLimits.maxRequests || 200,
      keyGenerator: (req) => `ip:${req.ip}`,
      store: this.options.store,
      message: 'IP rate limit exceeded'
    }));
  }

  // Advanced middleware that checks multiple strategies
  middleware() {
    return async (req, res, next) => {
      try {
        const strategies = this.getApplicableStrategies(req);
        const results = [];
        
        // Check each applicable strategy
        for (const [name, limiter] of strategies) {
          const result = await limiter.checkLimit(limiter.options.keyGenerator(req), req);
          
          if (!result.allowed) {
            // Rate limit exceeded for this strategy
            await limiter.options.onLimitReached(req, res, result);
            return limiter.options.handler(req, res, result);
          }
          
          results.push({ name, result });
        }
        
        // Add rate limit headers from the strictest limit
        const strictest = results.reduce((prev, curr) => 
          curr.result.remaining < prev.result.remaining ? curr : prev
        );
        
        res.set({
          'X-RateLimit-Limit': strictest.result.limit,
          'X-RateLimit-Remaining': strictest.result.remaining,
          'X-RateLimit-Reset': new Date(strictest.result.resetTime).toISOString(),
          'X-RateLimit-Strategy': strictest.name
        });
        
        return next();
        
      } catch (error) {
        console.error('Advanced rate limiter error:', error);
        return next();
      }
    };
  }

  // Get applicable strategies for a request
  getApplicableStrategies(req) {
    const applicable = new Map();
    
    // Always check IP-based limiting
    if (this.strategies.has('ip')) {
      applicable.set('ip', this.strategies.get('ip'));
    }
    
    // Check global limiting
    if (this.strategies.has('global')) {
      applicable.set('global', this.strategies.get('global'));
    }
    
    // Check endpoint-specific limiting
    const endpointKey = `endpoint:${req.path}`;
    if (this.strategies.has(endpointKey)) {
      applicable.set(endpointKey, this.strategies.get(endpointKey));
    }
    
    // Check user-specific limiting
    if (req.user && req.user.role) {
      const userKey = `user:${req.user.role}`;
      if (this.strategies.has(userKey)) {
        applicable.set(userKey, this.strategies.get(userKey));
      }
    }
    
    return applicable;
  }

  // Add new strategy dynamically
  addStrategy(name, config) {
    this.strategies.set(name, new RateLimiter({
      ...config,
      store: this.options.store
    }));
  }

  // Remove strategy
  removeStrategy(name) {
    const limiter = this.strategies.get(name);
    if (limiter) {
      limiter.shutdown();
      this.strategies.delete(name);
    }
  }

  // Get all strategy statuses
  async getAllStatuses(req) {
    const statuses = {};
    
    for (const [name, limiter] of this.strategies) {
      const key = limiter.options.keyGenerator(req);
      statuses[name] = await limiter.getStatus(key);
    }
    
    return statuses;
  }
}

// Adaptive rate limiter that adjusts based on server load
class AdaptiveRateLimiter extends AdvancedRateLimiter {
  constructor(options = {}) {
    super(options);
    this.loadThreshold = options.loadThreshold || 0.8;
    this.adaptationFactor = options.adaptationFactor || 0.5;
    this.currentLoad = 0;
    this.baseLimits = { ...this.options };
    
    // Start load monitoring
    this.startLoadMonitoring();
  }

  startLoadMonitoring() {
    setInterval(async () => {
      this.currentLoad = await this.calculateServerLoad();
      await this.adaptLimits();
    }, 5000); // Check every 5 seconds
  }

  async calculateServerLoad() {
    // Simple load calculation based on CPU and memory
    const usage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    // This is a simplified calculation
    // In production, you'd use more sophisticated metrics
    const cpuLoad = (usage.user + usage.system) / 1000000; // Convert to seconds
    const memLoad = memUsage.heapUsed / memUsage.heapTotal;
    
    return Math.max(cpuLoad, memLoad);
  }

  async adaptLimits() {
    if (this.currentLoad > this.loadThreshold) {
      // Reduce limits when load is high
      const reductionFactor = 1 - (this.currentLoad - this.loadThreshold) * this.adaptationFactor;
      
      for (const [name, limiter] of this.strategies) {
        const originalLimit = this.baseLimits.maxRequests || 100;
        limiter.options.maxRequests = Math.max(1, Math.floor(originalLimit * reductionFactor));
      }
      
      console.log(`🔥 High load detected (${(this.currentLoad * 100).toFixed(1)}%), reducing rate limits`);
    } else {
      // Restore normal limits when load is low
      for (const [name, limiter] of this.strategies) {
        limiter.options.maxRequests = this.baseLimits.maxRequests || 100;
      }
    }
  }

  middleware() {
    return async (req, res, next) => {
      // Add current load to headers
      res.set('X-Server-Load', this.currentLoad.toFixed(3));
      
      // Call parent middleware
      return super.middleware()(req, res, next);
    };
  }
}

// Factory functions for common rate limiting scenarios
const createApiLimiter = (options = {}) => {
  return new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many API requests, please try again later',
    store: process.env.REDIS_HOST ? 'redis' : 'memory',
    ...options
  });
};

const createAuthLimiter = (options = {}) => {
  return new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // Very strict for auth endpoints
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    store: process.env.REDIS_HOST ? 'redis' : 'memory',
    ...options
  });
};

const createUploadLimiter = (options = {}) => {
  return new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 uploads per hour
    message: 'Upload limit exceeded, please try again later',
    store: process.env.REDIS_HOST ? 'redis' : 'memory',
    ...options
  });
};

const createAdvancedLimiter = (options = {}) => {
  return new AdvancedRateLimiter({
    globalLimits: {
      enabled: true,
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 1000
    },
    endpointLimits: {
      '/api/auth/login': {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5
      },
      '/api/auth/register': {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 3
      },
      '/api/upload': {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 50
      }
    },
    userLimits: {
      admin: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 200
      },
      manager: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100
      },
      user: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 50
      }
    },
    ipLimits: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 200
    },
    store: process.env.REDIS_HOST ? 'redis' : 'memory',
    ...options
  });
};

module.exports = {
  RateLimiter,
  AdvancedRateLimiter,
  AdaptiveRateLimiter,
  createApiLimiter,
  createAuthLimiter,
  createUploadLimiter,
  createAdvancedLimiter
};
