// API Registry for ServiceNexus Marketplace
// Manages third-party API integrations and marketplace functionality

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { Organization, User } = require('../models');

class APIRegistry {
  constructor() {
    this.apis = new Map();
    this.subscriptions = new Map();
    this.apiKeys = new Map();
    this.usageStats = new Map();
    this.rateLimits = new Map();
    this.webhooks = new Map();
    
    this.initialize();
  }

  async initialize() {
    try {
      logger.info('🏪 Initializing API Registry...');
      
      // Load built-in APIs
      await this.loadBuiltinAPIs();
      
      // Load third-party APIs
      await this.loadThirdPartyAPIs();
      
      // Initialize rate limiting
      await this.initializeRateLimits();
      
      logger.info('✅ API Registry initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize API Registry:', error);
    }
  }

  // Register a new API in the marketplace
  async registerAPI(apiData) {
    try {
      const api = {
        id: uuidv4(),
        name: apiData.name,
        description: apiData.description,
        version: apiData.version || '1.0.0',
        category: apiData.category,
        provider: apiData.provider,
        pricing: apiData.pricing,
        documentation: apiData.documentation,
        endpoints: apiData.endpoints || [],
        authentication: apiData.authentication || 'api_key',
        webhookSupport: apiData.webhookSupport || false,
        rateLimit: apiData.rateLimit || { requests: 1000, window: 3600000 },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: apiData.metadata || {}
      };

      // Validate API structure
      this.validateAPI(api);
      
      // Store API
      this.apis.set(api.id, api);
      
      logger.info(`📝 API registered: ${api.name} (${api.id})`);
      
      return api;
    } catch (error) {
      logger.error('Error registering API:', error);
      throw error;
    }
  }

  // Subscribe organization to an API
  async subscribeToAPI(organizationId, apiId, plan = 'basic') {
    try {
      const api = this.apis.get(apiId);
      if (!api) {
        throw new Error('API not found');
      }

      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Check if already subscribed
      const existingSubscription = this.getSubscription(organizationId, apiId);
      if (existingSubscription) {
        throw new Error('Already subscribed to this API');
      }

      // Create subscription
      const subscription = {
        id: uuidv4(),
        organizationId,
        apiId,
        plan,
        status: 'active',
        apiKey: this.generateAPIKey(organizationId, apiId),
        webhookSecret: api.webhookSupport ? this.generateWebhookSecret() : null,
        usage: {
          requests: 0,
          bandwidth: 0,
          lastReset: new Date()
        },
        billing: {
          cycle: 'monthly',
          nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount: this.calculatePricing(api.pricing, plan)
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.subscriptions.set(subscription.id, subscription);
      this.apiKeys.set(subscription.apiKey, subscription);
      
      logger.info(`🔗 Organization ${organizationId} subscribed to API ${apiId}`);
      
      return subscription;
    } catch (error) {
      logger.error('Error subscribing to API:', error);
      throw error;
    }
  }

  // Execute API call with authentication and rate limiting
  async executeAPICall(apiKeyId, endpoint, method = 'GET', data = null, headers = {}) {
    try {
      const subscription = this.apiKeys.get(apiKeyId);
      if (!subscription) {
        throw new Error('Invalid API key');
      }

      const api = this.apis.get(subscription.apiId);
      if (!api) {
        throw new Error('API not found');
      }

      // Check subscription status
      if (subscription.status !== 'active') {
        throw new Error('Subscription not active');
      }

      // Check rate limits
      await this.checkRateLimit(subscription);

      // Find endpoint configuration
      const endpointConfig = api.endpoints.find(ep => ep.path === endpoint);
      if (!endpointConfig) {
        throw new Error('Endpoint not found');
      }

      // Make the API call
      const startTime = Date.now();
      const response = await this.makeAPICall(api, endpointConfig, method, data, headers);
      const duration = Date.now() - startTime;

      // Update usage statistics
      this.updateUsageStats(subscription, response, duration);

      return {
        success: true,
        data: response.data,
        metadata: {
          requestId: uuidv4(),
          duration,
          apiId: api.id,
          endpoint,
          remainingRequests: this.getRemainingRequests(subscription)
        }
      };
    } catch (error) {
      logger.error('Error executing API call:', error);
      
      // Log failed call
      this.logFailedCall(apiKeyId, endpoint, error);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          requestId: uuidv4(),
          timestamp: new Date()
        }
      };
    }
  }

  // Get available APIs
  getAvailableAPIs(filters = {}) {
    let apis = Array.from(this.apis.values());
    
    if (filters.category) {
      apis = apis.filter(api => api.category === filters.category);
    }
    
    if (filters.provider) {
      apis = apis.filter(api => api.provider === filters.provider);
    }
    
    if (filters.status) {
      apis = apis.filter(api => api.status === filters.status);
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      apis = apis.filter(api => 
        api.name.toLowerCase().includes(search) ||
        api.description.toLowerCase().includes(search)
      );
    }
    
    return apis.map(api => ({
      ...api,
      subscribers: this.getSubscriberCount(api.id),
      rating: this.getAPIRating(api.id),
      popularity: this.getAPIPopularity(api.id)
    }));
  }

  // Get organization subscriptions
  getOrganizationSubscriptions(organizationId) {
    const subscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.organizationId === organizationId)
      .map(sub => ({
        ...sub,
        api: this.apis.get(sub.apiId),
        usageStats: this.getUsageStats(sub.id)
      }));
    
    return subscriptions;
  }

  // Get API documentation
  getAPIDocumentation(apiId) {
    const api = this.apis.get(apiId);
    if (!api) {
      throw new Error('API not found');
    }
    
    return {
      ...api.documentation,
      endpoints: api.endpoints.map(endpoint => ({
        ...endpoint,
        examples: this.generateEndpointExamples(endpoint)
      })),
      authentication: {
        type: api.authentication,
        examples: this.generateAuthExamples(api.authentication)
      },
      webhooks: api.webhookSupport ? {
        supported: true,
        events: this.getWebhookEvents(apiId),
        examples: this.generateWebhookExamples(apiId)
      } : {
        supported: false
      }
    };
  }

  // Webhook handling
  async processWebhook(apiId, event, data, signature = null) {
    try {
      const api = this.apis.get(apiId);
      if (!api || !api.webhookSupport) {
        throw new Error('Webhook not supported for this API');
      }

      // Verify signature if provided
      if (signature) {
        const subscription = this.findSubscriptionByAPI(apiId);
        if (!this.verifyWebhookSignature(signature, data, subscription.webhookSecret)) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Process webhook event
      const result = await this.handleWebhookEvent(apiId, event, data);
      
      logger.info(`🪝 Webhook processed: ${apiId} - ${event}`);
      
      return result;
    } catch (error) {
      logger.error('Error processing webhook:', error);
      throw error;
    }
  }

  // Analytics and reporting
  getAPIAnalytics(apiId, timeRange = '7d') {
    const api = this.apis.get(apiId);
    if (!api) {
      throw new Error('API not found');
    }

    const stats = this.usageStats.get(apiId) || {};
    
    return {
      api: {
        id: api.id,
        name: api.name,
        category: api.category
      },
      usage: {
        totalRequests: stats.totalRequests || 0,
        uniqueUsers: stats.uniqueUsers || 0,
        averageResponseTime: stats.averageResponseTime || 0,
        errorRate: stats.errorRate || 0,
        bandwidth: stats.bandwidth || 0
      },
      subscribers: {
        total: this.getSubscriberCount(apiId),
        active: this.getActiveSubscriberCount(apiId),
        newThisMonth: this.getNewSubscribers(apiId, 'month')
      },
      revenue: {
        total: this.getTotalRevenue(apiId),
        monthly: this.getMonthlyRevenue(apiId),
        growth: this.getRevenueGrowth(apiId)
      },
      performance: {
        uptime: this.getAPIUptime(apiId),
        responseTime: this.getAverageResponseTime(apiId),
        successRate: this.getSuccessRate(apiId)
      }
    };
  }

  // Utility methods
  generateAPIKey(organizationId, apiId) {
    const prefix = 'snx_';
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256')
      .update(`${organizationId}${apiId}${timestamp}${random}`)
      .digest('hex')
      .substring(0, 16);
    
    return `${prefix}${timestamp}_${hash}`;
  }

  generateWebhookSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  verifyWebhookSignature(signature, payload, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === expectedSignature;
  }

  calculatePricing(pricing, plan) {
    if (!pricing || !pricing.plans || !pricing.plans[plan]) {
      return 0;
    }
    
    return pricing.plans[plan].price || 0;
  }

  async checkRateLimit(subscription) {
    const api = this.apis.get(subscription.apiId);
    const limit = api.rateLimit;
    
    const currentUsage = subscription.usage.requests;
    const windowStart = Date.now() - limit.window;
    
    if (currentUsage >= limit.requests) {
      throw new Error('Rate limit exceeded');
    }
    
    // Update usage
    subscription.usage.requests++;
    subscription.usage.lastReset = new Date();
  }

  getRemainingRequests(subscription) {
    const api = this.apis.get(subscription.apiId);
    return Math.max(0, api.rateLimit.requests - subscription.usage.requests);
  }

  updateUsageStats(subscription, response, duration) {
    const apiId = subscription.apiId;
    const stats = this.usageStats.get(apiId) || {
      totalRequests: 0,
      totalResponseTime: 0,
      errors: 0,
      bandwidth: 0,
      uniqueUsers: new Set()
    };
    
    stats.totalRequests++;
    stats.totalResponseTime += duration;
    stats.bandwidth += JSON.stringify(response.data).length;
    stats.uniqueUsers.add(subscription.organizationId);
    
    if (!response.success) {
      stats.errors++;
    }
    
    this.usageStats.set(apiId, stats);
  }

  validateAPI(api) {
    const required = ['name', 'description', 'category', 'provider'];
    for (const field of required) {
      if (!api[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (!api.endpoints || api.endpoints.length === 0) {
      throw new Error('API must have at least one endpoint');
    }
    
    // Validate endpoints
    for (const endpoint of api.endpoints) {
      if (!endpoint.path || !endpoint.method) {
        throw new Error('Each endpoint must have path and method');
      }
    }
  }

  async makeAPICall(api, endpoint, method, data, headers) {
    // This would implement the actual HTTP call to the third-party API
    // For now, return a mock response
    return {
      success: true,
      data: { message: 'Mock API response', endpoint: endpoint.path },
      status: 200,
      headers: {}
    };
  }

  // Built-in APIs
  async loadBuiltinAPIs() {
    const builtinAPIs = [
      {
        name: 'Email Service',
        description: 'Send emails through ServiceNexus email infrastructure',
        category: 'communication',
        provider: 'ServiceNexus',
        pricing: {
          plans: {
            basic: { price: 0, limits: { emails: 1000 } },
            pro: { price: 29, limits: { emails: 10000 } },
            enterprise: { price: 99, limits: { emails: 100000 } }
          }
        },
        endpoints: [
          {
            path: '/send',
            method: 'POST',
            description: 'Send an email',
            parameters: [
              { name: 'to', type: 'string', required: true },
              { name: 'subject', type: 'string', required: true },
              { name: 'body', type: 'string', required: true }
            ]
          }
        ],
        authentication: 'api_key',
        webhookSupport: true
      },
      {
        name: 'Analytics API',
        description: 'Access ServiceNexus analytics data',
        category: 'analytics',
        provider: 'ServiceNexus',
        pricing: {
          plans: {
            basic: { price: 0, limits: { requests: 1000 } },
            pro: { price: 49, limits: { requests: 10000 } },
            enterprise: { price: 199, limits: { requests: 100000 } }
          }
        },
        endpoints: [
          {
            path: '/metrics',
            method: 'GET',
            description: 'Get analytics metrics',
            parameters: [
              { name: 'timeRange', type: 'string', required: false },
              { name: 'metrics', type: 'array', required: false }
            ]
          }
        ],
        authentication: 'api_key',
        webhookSupport: false
      },
      {
        name: 'Storage API',
        description: 'File storage and management',
        category: 'storage',
        provider: 'ServiceNexus',
        pricing: {
          plans: {
            basic: { price: 0, limits: { storage: 1024 * 1024 * 1024 } }, // 1GB
            pro: { price: 19, limits: { storage: 10 * 1024 * 1024 * 1024 } }, // 10GB
            enterprise: { price: 79, limits: { storage: 100 * 1024 * 1024 * 1024 } } // 100GB
          }
        },
        endpoints: [
          {
            path: '/upload',
            method: 'POST',
            description: 'Upload a file',
            parameters: [
              { name: 'file', type: 'file', required: true },
              { name: 'path', type: 'string', required: false }
            ]
          },
          {
            path: '/download/:fileId',
            method: 'GET',
            description: 'Download a file',
            parameters: [
              { name: 'fileId', type: 'string', required: true }
            ]
          }
        ],
        authentication: 'api_key',
        webhookSupport: true
      }
    ];
    
    for (const apiData of builtinAPIs) {
      await this.registerAPI(apiData);
    }
  }

  async loadThirdPartyAPIs() {
    // Load third-party APIs from database or configuration
    // For now, this is a placeholder
  }

  async initializeRateLimits() {
    // Initialize rate limiting configurations
    // For now, this is a placeholder
  }

  // Getters and utility methods
  getSubscription(organizationId, apiId) {
    return Array.from(this.subscriptions.values())
      .find(sub => sub.organizationId === organizationId && sub.apiId === apiId);
  }

  getSubscriberCount(apiId) {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.apiId === apiId && sub.status === 'active')
      .length;
  }

  getActiveSubscriberCount(apiId) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return Array.from(this.subscriptions.values())
      .filter(sub => 
        sub.apiId === apiId && 
        sub.status === 'active' && 
        sub.usage.lastReset.getTime() > thirtyDaysAgo
      )
      .length;
  }

  getAPIRating(apiId) {
    // Calculate average rating from reviews
    // For now, return a placeholder
    return 4.5;
  }

  getAPIPopularity(apiId) {
    const stats = this.usageStats.get(apiId) || {};
    return stats.totalRequests || 0;
  }

  getUsageStats(subscriptionId) {
    return this.usageStats.get(subscriptionId) || {
      requests: 0,
      bandwidth: 0,
      lastReset: new Date()
    };
  }

  generateEndpointExamples(endpoint) {
    // Generate example requests/responses for documentation
    return {
      request: {
        method: endpoint.method,
        url: endpoint.path,
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.parameters?.reduce((acc, param) => {
          if (param.required) {
            acc[param.name] = param.type === 'string' ? 'example' : 
                           param.type === 'number' ? 123 : 
                           param.type === 'boolean' ? true : null;
          }
          return acc;
        }, {}) || {}
      },
      response: {
        status: 200,
        data: { message: 'Success' }
      }
    };
  }

  generateAuthExamples(authType) {
    const examples = {
      api_key: {
        headers: { 'X-API-Key': 'your_api_key_here' }
      },
      oauth2: {
        headers: { 'Authorization': 'Bearer your_access_token_here' }
      },
      basic: {
        headers: { 'Authorization': 'Basic base64(username:password)' }
      }
    };
    
    return examples[authType] || examples.api_key;
  }

  getWebhookEvents(apiId) {
    // Return available webhook events for the API
    return ['created', 'updated', 'deleted'];
  }

  generateWebhookExamples(apiId) {
    return {
      event: 'created',
      data: { id: '123', name: 'Example Resource' },
      timestamp: new Date().toISOString()
    };
  }

  findSubscriptionByAPI(apiId) {
    return Array.from(this.subscriptions.values())
      .find(sub => sub.apiId === apiId);
  }

  async handleWebhookEvent(apiId, event, data) {
    // Process webhook event based on API and event type
    logger.info(`Processing webhook event: ${apiId} - ${event}`);
    
    return {
      processed: true,
      event,
      timestamp: new Date()
    };
  }

  logFailedCall(apiKeyId, endpoint, error) {
    logger.error(`API call failed: ${apiKeyId} - ${endpoint} - ${error.message}`);
  }

  getNewSubscribers(apiId, period) {
    // Calculate new subscribers in the given period
    // For now, return a placeholder
    return 0;
  }

  getTotalRevenue(apiId) {
    // Calculate total revenue for the API
    // For now, return a placeholder
    return 0;
  }

  getMonthlyRevenue(apiId) {
    // Calculate monthly revenue for the API
    // For now, return a placeholder
    return 0;
  }

  getRevenueGrowth(apiId) {
    // Calculate revenue growth rate
    // For now, return a placeholder
    return 0.1;
  }

  getAPIUptime(apiId) {
    // Calculate API uptime percentage
    // For now, return a placeholder
    return 99.9;
  }

  getAverageResponseTime(apiId) {
    const stats = this.usageStats.get(apiId) || {};
    return stats.totalRequests > 0 ? 
      stats.totalResponseTime / stats.totalRequests : 0;
  }

  getSuccessRate(apiId) {
    const stats = this.usageStats.get(apiId) || {};
    return stats.totalRequests > 0 ? 
      (stats.totalRequests - stats.errors) / stats.totalRequests : 1.0;
  }

  // Cleanup
  async cleanup() {
    try {
      this.apis.clear();
      this.subscriptions.clear();
      this.apiKeys.clear();
      this.usageStats.clear();
      this.rateLimits.clear();
      this.webhooks.clear();
      
      logger.info('🧹 API Registry cleaned up');
    } catch (error) {
      logger.error('Error cleaning up API Registry:', error);
    }
  }
}

module.exports = APIRegistry;
