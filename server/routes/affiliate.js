// Affiliate Marketing API Routes
// Handles affiliate marketing operations and payment processing

const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');
const AffiliateAgent = require('../agents/affiliateAgent');
const PaymentAgent = require('../agents/paymentAgent');
const logger = require('../utils/logger');

// Initialize agents
const affiliateAgent = new AffiliateAgent();
const paymentAgent = new PaymentAgent();

// Middleware to check affiliate access
const checkAffiliateAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if organization has affiliate features enabled
  if (req.user.organization.subscriptionPlan !== 'enterprise') {
    return res.status(403).json({ error: 'Affiliate features require enterprise plan' });
  }
  
  next();
};

// Apply rate limiting to affiliate endpoints
router.use(rateLimiter.createAffiliateRateLimiter());

// Product Discovery Routes

// Search for products across affiliate networks
router.post('/products/search', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      keywords,
      category,
      priceRange,
      networks = ['amazon', 'shopee', 'lazada'],
      filters = {},
      limit = 20
    } = req.body;
    
    const task = {
      type: 'product_discovery',
      data: {
        keywords,
        category,
        priceRange,
        networks,
        filters,
        limit,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await affiliateAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error searching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Compare prices across networks
router.post('/products/compare', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      productId,
      productTitle,
      category,
      networks = ['amazon', 'shopee', 'lazada']
    } = req.body;
    
    const task = {
      type: 'price_comparison',
      data: {
        productId,
        productTitle,
        category,
        networks,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await affiliateAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error comparing prices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate affiliate links
router.post('/links/generate', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      productId,
      network,
      customParameters = {},
      trackingId = null
    } = req.body;
    
    const task = {
      type: 'affiliate_link_generation',
      data: {
        productId,
        network,
        customParameters,
        trackingId,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await affiliateAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error generating affiliate link:', error);
    res.status(500).json({ error: error.message });
  }
});

// Track commissions
router.post('/commissions/track', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      timeRange = '30d',
      networks = ['amazon', 'shopee', 'lazada'],
      trackingIds = []
    } = req.body;
    
    const task = {
      type: 'commission_tracking',
      data: {
        timeRange,
        networks,
        trackingIds,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await affiliateAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error tracking commissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze product
router.post('/products/analyze', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      productId,
      network,
      analysisType = 'comprehensive',
      includeCompetitors = true
    } = req.body;
    
    const task = {
      type: 'product_analysis',
      data: {
        productId,
        network,
        analysisType,
        includeCompetitors,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await affiliateAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error analyzing product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Market research
router.post('/market/research', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      category,
      region = 'global',
      timeRange = '90d',
      focusAreas = ['trends', 'competition', 'opportunities']
    } = req.body;
    
    const task = {
      type: 'market_research',
      data: {
        category,
        region,
        timeRange,
        focusAreas,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await affiliateAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error conducting market research:', error);
    res.status(500).json({ error: error.message });
  }
});

// Competitor analysis
router.post('/competitors/analyze', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      competitors = [],
      category,
      analysisDepth = 'standard',
      includePricing = true,
      includeProducts = true
    } = req.body;
    
    const task = {
      type: 'competitor_analysis',
      data: {
        competitors,
        category,
        analysisDepth,
        includePricing,
        includeProducts,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await affiliateAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error analyzing competitors:', error);
    res.status(500).json({ error: error.message });
  }
});

// Identify trends
router.post('/trends/identify', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      category,
      timeRange = '30d',
      trendTypes = ['product', 'pricing', 'consumer'],
      region = 'global'
    } = req.body;
    
    const task = {
      type: 'trend_identification',
      data: {
        category,
        timeRange,
        trendTypes,
        region,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await affiliateAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error identifying trends:', error);
    res.status(500).json({ error: error.message });
  }
});

// Payment Processing Routes

// Process payment
router.post('/payments/process', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      amount,
      currency,
      payment_method,
      gateway,
      customer_info,
      order_info,
      metadata = {}
    } = req.body;
    
    const task = {
      type: 'payment_processing',
      data: {
        amount,
        currency,
        payment_method,
        gateway,
        customer_info,
        order_info,
        metadata,
        organizationId: req.user.organization.id
      },
      priority: 'high'
    };
    
    const result = await paymentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error processing payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Monitor transaction
router.post('/payments/monitor', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      transaction_id,
      monitoring_type = 'comprehensive',
      time_range = '24h'
    } = req.body;
    
    const task = {
      type: 'transaction_monitoring',
      data: {
        transaction_id,
        monitoring_type,
        time_range,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await paymentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error monitoring transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Detect fraud
router.post('/payments/fraud-detect', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      transaction_id,
      customer_info,
      payment_method,
      amount,
      detection_level = 'comprehensive'
    } = req.body;
    
    const task = {
      type: 'fraud_detection',
      data: {
        transaction_id,
        customer_info,
        payment_method,
        amount,
        detection_level,
        organizationId: req.user.organization.id
      },
      priority: 'high'
    };
    
    const result = await paymentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error detecting fraud:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process refund
router.post('/payments/refund', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      transaction_id,
      refund_amount,
      refund_reason,
      refund_method = 'original',
      customer_info
    } = req.body;
    
    const task = {
      type: 'refund_processing',
      data: {
        transaction_id,
        refund_amount,
        refund_reason,
        refund_method,
        customer_info,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await paymentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error processing refund:', error);
    res.status(500).json({ error: error.message });
  }
});

// Payment analytics
router.post('/payments/analytics', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      analytics_type = 'comprehensive',
      time_range = '30d',
      filters = {}
    } = req.body;
    
    const task = {
      type: 'payment_analytics',
      data: {
        analytics_type,
        time_range,
        filters,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await paymentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting payment analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Settlement management
router.post('/payments/settlements', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      settlement_type = 'daily',
      gateway = 'all',
      date_range = null
    } = req.body;
    
    const task = {
      type: 'settlement_management',
      data: {
        settlement_type,
        gateway,
        date_range,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await paymentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error managing settlements:', error);
    res.status(500).json({ error: error.message });
  }
});

// Compliance checking
router.post('/payments/compliance', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      compliance_type = 'comprehensive',
      transaction_id = null,
      time_range = '30d'
    } = req.body;
    
    const task = {
      type: 'compliance_checking',
      data: {
        compliance_type,
        transaction_id,
        time_range,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await paymentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error checking compliance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Currency conversion
router.post('/payments/convert', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      from_currency,
      to_currency,
      amount,
      conversion_method = 'market_rate',
      gateway = null
    } = req.body;
    
    const task = {
      type: 'currency_conversion',
      data: {
        from_currency,
        to_currency,
        amount,
        conversion_method,
        gateway,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await paymentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error converting currency:', error);
    res.status(500).json({ error: error.message });
  }
});

// Combined Operations

// Complete affiliate purchase flow
router.post('/purchase/complete', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      productId,
      network,
      quantity = 1,
      customer_info,
      payment_method,
      gateway,
      shipping_info = {}
    } = req.body;
    
    // Step 1: Get product details
    const productTask = {
      type: 'product_analysis',
      data: {
        productId,
        network,
        analysisType: 'basic',
        organizationId: req.user.organization.id
      }
    };
    
    const productResult = await affiliateAgent.executeTask(productTask);
    
    // Step 2: Generate affiliate link
    const linkTask = {
      type: 'affiliate_link_generation',
      data: {
        productId,
        network,
        organizationId: req.user.organization.id
      }
    };
    
    const linkResult = await affiliateAgent.executeTask(linkTask);
    
    // Step 3: Process payment
    const paymentTask = {
      type: 'payment_processing',
      data: {
        amount: productResult.result.productDetails.price * quantity,
        currency: productResult.result.productDetails.currency,
        payment_method,
        gateway,
        customer_info,
        order_info: {
          productId,
          network,
          quantity,
          affiliateLink: linkResult.result.affiliateLink,
          shipping_info
        },
        organizationId: req.user.organization.id
      }
    };
    
    const paymentResult = await paymentAgent.executeTask(paymentTask);
    
    // Step 4: Track commission
    const commissionTask = {
      type: 'commission_tracking',
      data: {
        timeRange: '1d',
        networks: [network],
        trackingIds: [linkResult.result.validation.affiliate_tag],
        organizationId: req.user.organization.id
      }
    };
    
    const commissionResult = await affiliateAgent.executeTask(commissionTask);
    
    logger.info(`🛒 Complete purchase flow: ${productId} - ${network}`);
    
    res.json({
      success: true,
      purchase: {
        product: productResult.result.productDetails,
        affiliateLink: linkResult.result.affiliateLink,
        payment: paymentResult.result.transaction,
        commission: commissionResult.result.totalCommissions
      },
      timestamp: new Date()
    });
    
  } catch (error) {
    logger.error('Error in complete purchase flow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch product search and analysis
router.post('/products/batch-analyze', checkAffiliateAccess, async (req, res) => {
  try {
    const {
      products = [],
      analysisType = 'comprehensive',
      includePriceComparison = true,
      includeCommissionTracking = false
    } = req.body;
    
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is required' });
    }
    
    if (products.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 products per batch' });
    }
    
    const results = [];
    
    for (const product of products) {
      try {
        // Product analysis
        const analysisTask = {
          type: 'product_analysis',
          data: {
            productId: product.productId,
            network: product.network,
            analysisType,
            organizationId: req.user.organization.id
          }
        };
        
        const analysisResult = await affiliateAgent.executeTask(analysisTask);
        
        // Price comparison if requested
        let priceComparison = null;
        if (includePriceComparison) {
          const priceTask = {
            type: 'price_comparison',
            data: {
              productId: product.productId,
              productTitle: product.title,
              category: product.category,
              networks: ['amazon', 'shopee', 'lazada'],
              organizationId: req.user.organization.id
            }
          };
          
          const priceResult = await affiliateAgent.executeTask(priceTask);
          priceComparison = priceResult.result;
        }
        
        results.push({
          productId: product.productId,
          network: product.network,
          analysis: analysisResult.result,
          priceComparison,
          success: true
        });
        
      } catch (error) {
        results.push({
          productId: product.productId,
          network: product.network,
          error: error.message,
          success: false
        });
      }
    }
    
    res.json({
      success: true,
      results,
      timestamp: new Date()
    });
    
  } catch (error) {
    logger.error('Error in batch product analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get affiliate dashboard data
router.get('/dashboard', checkAffiliateAccess, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // Get commission data
    const commissionTask = {
      type: 'commission_tracking',
      data: {
        timeRange,
        networks: ['amazon', 'shopee', 'lazada'],
        organizationId: req.user.organization.id
      }
    };
    
    const commissionResult = await affiliateAgent.executeTask(commissionTask);
    
    // Get payment analytics
    const paymentTask = {
      type: 'payment_analytics',
      data: {
        analytics_type: 'comprehensive',
        timeRange,
        organizationId: req.user.organization.id
      }
    };
    
    const paymentResult = await paymentAgent.executeTask(paymentTask);
    
    // Get market trends
    const trendsTask = {
      type: 'trend_identification',
      data: {
        category: 'all',
        timeRange,
        trendTypes: ['product', 'pricing'],
        organizationId: req.user.organization.id
      }
    };
    
    const trendsResult = await affiliateAgent.executeTask(trendsTask);
    
    res.json({
      success: true,
      dashboard: {
        commissions: commissionResult.result,
        payments: paymentResult.result.analytics,
        trends: trendsResult.result.trends,
        timeRange
      },
      timestamp: new Date()
    });
    
  } catch (error) {
    logger.error('Error getting affiliate dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    const health = {
      affiliateAgent: !!affiliateAgent,
      paymentAgent: !!paymentAgent,
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
    logger.error('Error in affiliate health check:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

// Graceful shutdown
const shutdown = async () => {
  try {
    await affiliateAgent.cleanup();
    await paymentAgent.cleanup();
    logger.info('🔌 Affiliate system shut down gracefully');
  } catch (error) {
    logger.error('Error shutting down Affiliate system:', error);
  }
};

module.exports = {
  router,
  shutdown
};
