// Marketplace API Routes
// Handles API marketplace, subscriptions, and third-party integrations

const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');
const APIRegistry = require('../marketplace/apiRegistry');
const SubscriptionManager = require('../marketplace/subscriptionManager');
const logger = require('../utils/logger');

// Initialize marketplace systems
const apiRegistry = new APIRegistry();
const subscriptionManager = new SubscriptionManager();

// Middleware to check marketplace access
const checkMarketplaceAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if organization has marketplace access
  if (req.user.organization.subscriptionPlan === 'free') {
    return res.status(403).json({ error: 'Marketplace access requires paid plan' });
  }
  
  next();
};

// Apply rate limiting to marketplace endpoints
router.use(rateLimiter.createMarketplaceRateLimiter());

// API Registry Routes

// Get available APIs
router.get('/apis', checkMarketplaceAccess, async (req, res) => {
  try {
    const { category, provider, status, search, page = 1, limit = 20 } = req.query;
    
    const filters = {};
    if (category) filters.category = category;
    if (provider) filters.provider = provider;
    if (status) filters.status = status;
    if (search) filters.search = search;
    
    const apis = apiRegistry.getAvailableAPIs(filters);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedAPIs = apis.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      apis: paginatedAPIs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: apis.length,
        pages: Math.ceil(apis.length / limit)
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting available APIs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get API details
router.get('/apis/:apiId', checkMarketplaceAccess, async (req, res) => {
  try {
    const { apiId } = req.params;
    
    const apis = apiRegistry.getAvailableAPIs();
    const api = apis.find(a => a.id === apiId);
    
    if (!api) {
      return res.status(404).json({ error: 'API not found' });
    }
    
    // Get detailed documentation
    const documentation = apiRegistry.getAPIDocumentation(apiId);
    
    res.json({
      success: true,
      api: {
        ...api,
        documentation
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting API details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Subscribe to API
router.post('/apis/:apiId/subscribe', checkMarketplaceAccess, async (req, res) => {
  try {
    const { apiId } = req.params;
    const { plan = 'basic', paymentMethod } = req.body;
    
    // Check if user has permission to subscribe
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Admin or Manager access required' });
    }
    
    const subscription = await subscriptionManager.createSubscription(
      req.user.organization.id,
      apiId,
      plan,
      paymentMethod
    );
    
    res.status(201).json({
      success: true,
      subscription,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error subscribing to API:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute API call
router.post('/apis/call', checkMarketplaceAccess, async (req, res) => {
  try {
    const { apiKeyId, endpoint, method = 'GET', data, headers } = req.body;
    
    if (!apiKeyId || !endpoint) {
      return res.status(400).json({ error: 'API key and endpoint are required' });
    }
    
    const result = await apiRegistry.executeAPICall(
      apiKeyId,
      endpoint,
      method,
      data,
      headers
    );
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error executing API call:', error);
    res.status(500).json({ error: error.message });
  }
});

// Subscription Management Routes

// Get organization subscriptions
router.get('/subscriptions', checkMarketplaceAccess, async (req, res) => {
  try {
    const subscriptions = subscriptionManager.getOrganizationSubscriptions(
      req.user.organization.id
    );
    
    res.json({
      success: true,
      subscriptions,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting subscriptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get subscription details
router.get('/subscriptions/:subscriptionId', checkMarketplaceAccess, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    const subscriptions = subscriptionManager.getOrganizationSubscriptions(
      req.user.organization.id
    );
    
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    res.json({
      success: true,
      subscription,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting subscription details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update subscription plan
router.put('/subscriptions/:subscriptionId/plan', checkMarketplaceAccess, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { newPlanId } = req.body;
    
    if (!newPlanId) {
      return res.status(400).json({ error: 'New plan ID is required' });
    }
    
    // Check if user has permission
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Admin or Manager access required' });
    }
    
    const subscription = await subscriptionManager.updateSubscriptionPlan(
      subscriptionId,
      newPlanId
    );
    
    res.json({
      success: true,
      subscription,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error updating subscription plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
router.post('/subscriptions/:subscriptionId/cancel', checkMarketplaceAccess, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { cancelAtPeriodEnd = true } = req.body;
    
    // Check if user has permission
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Admin or Manager access required' });
    }
    
    const subscription = await subscriptionManager.cancelSubscription(
      subscriptionId,
      cancelAtPeriodEnd
    );
    
    res.json({
      success: true,
      subscription,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subscription usage
router.get('/subscriptions/:subscriptionId/usage', checkMarketplaceAccess, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { timeRange = 'current' } = req.query;
    
    // Check if user has access to this subscription
    const subscriptions = subscriptionManager.getOrganizationSubscriptions(
      req.user.organization.id
    );
    
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    const usage = subscriptionManager.getSubscriptionUsage(subscriptionId, timeRange);
    
    res.json({
      success: true,
      usage,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting subscription usage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Plans and Billing Routes

// Get available plans
router.get('/plans', async (req, res) => {
  try {
    const { apiId } = req.query;
    
    const plans = subscriptionManager.getAvailablePlans(apiId);
    
    res.json({
      success: true,
      plans,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting plans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get plan details
router.get('/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    
    const plans = subscriptionManager.getAvailablePlans();
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    res.json({
      success: true,
      plan,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting plan details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get organization invoices
router.get('/invoices', checkMarketplaceAccess, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const subscriptions = subscriptionManager.getOrganizationSubscriptions(
      req.user.organization.id
    );
    
    const allInvoices = subscriptions.flatMap(sub => sub.invoices || []);
    
    // Filter by status if specified
    let filteredInvoices = allInvoices;
    if (status) {
      filteredInvoices = allInvoices.filter(invoice => invoice.status === status);
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      invoices: paginatedInvoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredInvoices.length,
        pages: Math.ceil(filteredInvoices.length / limit)
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process payment for invoice
router.post('/invoices/:invoiceId/pay', checkMarketplaceAccess, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { paymentMethod, paymentDetails } = req.body;
    
    if (!paymentMethod || !paymentDetails) {
      return res.status(400).json({ error: 'Payment method and details are required' });
    }
    
    // Check if user has permission
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Admin or Manager access required' });
    }
    
    const invoice = await subscriptionManager.processPayment(
      invoiceId,
      paymentMethod,
      paymentDetails
    );
    
    res.json({
      success: true,
      invoice,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error processing payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analytics and Reporting Routes

// Get marketplace analytics (Admin only)
router.get('/analytics', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { timeRange = '30d' } = req.query;
    
    const analytics = {
      apis: {
        total: apiRegistry.apis.size,
        active: Array.from(apiRegistry.apis.values()).filter(api => api.status === 'active').length,
        categories: this.getAPICategoryDistribution(),
        topPerformers: this.getTopPerformingAPIs()
      },
      subscriptions: {
        total: subscriptionManager.subscriptions.size,
        active: Array.from(subscriptionManager.subscriptions.values()).filter(sub => sub.status === 'active').length,
        newThisMonth: this.getNewSubscriptions('month'),
        churnRate: this.calculateChurnRate()
      },
      revenue: {
        total: this.calculateTotalRevenue(),
        monthly: this.calculateMonthlyRevenue(),
        growth: this.calculateRevenueGrowth()
      },
      usage: {
        totalRequests: this.getTotalRequests(),
        averageResponseTime: this.getAverageResponseTime(),
        errorRate: this.getErrorRate()
      }
    };
    
    res.json({
      success: true,
      analytics,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting marketplace analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get API analytics (for API providers)
router.get('/apis/:apiId/analytics', checkMarketplaceAccess, async (req, res) => {
  try {
    const { apiId } = req.params;
    const { timeRange = '7d' } = req.query;
    
    // Check if user owns this API or has admin access
    if (req.user.role !== 'ADMIN') {
      // Check if user is the API provider
      const api = apiRegistry.apis.get(apiId);
      if (!api || api.provider !== req.user.organization.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const analytics = apiRegistry.getAPIAnalytics(apiId, timeRange);
    
    res.json({
      success: true,
      analytics,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting API analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Webhook handling
router.post('/webhooks/:apiId/:event', async (req, res) => {
  try {
    const { apiId, event } = req.params;
    const { data, signature } = req.body;
    
    const result = await apiRegistry.processWebhook(apiId, event, data, signature);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    const health = {
      apiRegistry: apiRegistry.apis.size > 0,
      subscriptionManager: subscriptionManager.subscriptions.size > 0,
      timestamp: new Date()
    };
    
    const isHealthy = Object.values(health).every(status => 
      typeof status === 'boolean' ? status : true
    );
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      ...health
    });
  } catch (error) {
    logger.error('Error in marketplace health check:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

// Helper functions for analytics
function getAPICategoryDistribution() {
  const categories = {};
  
  for (const api of apiRegistry.apis.values()) {
    categories[api.category] = (categories[api.category] || 0) + 1;
  }
  
  return categories;
}

function getTopPerformingAPIs() {
  const apis = Array.from(apiRegistry.apis.values());
  
  return apis
    .map(api => ({
      id: api.id,
      name: api.name,
      popularity: apiRegistry.getAPIPopularity(api.id),
      revenue: apiRegistry.getTotalRevenue(api.id)
    }))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 10);
}

function getNewSubscriptions(period) {
  const now = Date.now();
  let cutoff;
  
  switch (period) {
    case 'month':
      cutoff = now - 30 * 24 * 60 * 60 * 1000;
      break;
    case 'week':
      cutoff = now - 7 * 24 * 60 * 60 * 1000;
      break;
    default:
      cutoff = now - 30 * 24 * 60 * 60 * 1000;
  }
  
  return Array.from(subscriptionManager.subscriptions.values())
    .filter(sub => sub.createdAt.getTime() >= cutoff)
    .length;
}

function calculateChurnRate() {
  const total = subscriptionManager.subscriptions.size;
  const cancelled = Array.from(subscriptionManager.subscriptions.values())
    .filter(sub => sub.status === 'cancelled').length;
  
  return total > 0 ? cancelled / total : 0;
}

function calculateTotalRevenue() {
  return Array.from(subscriptionManager.subscriptions.values())
    .filter(sub => sub.status === 'active')
    .reduce((total, sub) => {
      const plan = subscriptionManager.plans.get(sub.planId);
      return total + (plan ? plan.pricing.price : 0);
    }, 0);
}

function calculateMonthlyRevenue() {
  // Calculate revenue for current month
  return calculateTotalRevenue(); // Simplified
}

function calculateRevenueGrowth() {
  // Calculate month-over-month growth
  return 0.15; // Placeholder
}

function getTotalRequests() {
  let total = 0;
  
  for (const stats of apiRegistry.usageStats.values()) {
    total += stats.totalRequests || 0;
  }
  
  return total;
}

function getAverageResponseTime() {
  let totalTime = 0;
  let totalRequests = 0;
  
  for (const stats of apiRegistry.usageStats.values()) {
    totalTime += stats.totalResponseTime || 0;
    totalRequests += stats.totalRequests || 0;
  }
  
  return totalRequests > 0 ? totalTime / totalRequests : 0;
}

function getErrorRate() {
  let totalErrors = 0;
  let totalRequests = 0;
  
  for (const stats of apiRegistry.usageStats.values()) {
    totalErrors += stats.errors || 0;
    totalRequests += stats.totalRequests || 0;
  }
  
  return totalRequests > 0 ? totalErrors / totalRequests : 0;
}

// Graceful shutdown
const shutdown = async () => {
  try {
    await Promise.all([
      apiRegistry.cleanup(),
      subscriptionManager.cleanup()
    ]);
    
    logger.info('🔌 Marketplace systems shut down gracefully');
  } catch (error) {
    logger.error('Error shutting down Marketplace systems:', error);
  }
};

module.exports = {
  router,
  shutdown
};
