// Content Marketing API Routes
// Handles automated content creation, SEO optimization, and scheduled publishing

const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');
const ContentAgent = require('../agents/contentAgent');
const AutomationAgent = require('../agents/automationAgent');
const logger = require('../utils/logger');

// Initialize agents
const contentAgent = new ContentAgent();
const automationAgent = new AutomationAgent();

// Middleware to check content access
const checkContentAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if organization has content features enabled
  if (req.user.organization.subscriptionPlan !== 'enterprise') {
    return res.status(403).json({ error: 'Content marketing features require enterprise plan' });
  }
  
  next();
};

// Apply rate limiting to content endpoints
router.use(rateLimiter.createContentRateLimiter());

// Content Generation Routes

// Generate content
router.post('/generate', checkContentAccess, async (req, res) => {
  try {
    const {
      contentType = 'product_review',
      products = [],
      keywords = [],
      targetAudience = 'general',
      tone = 'friendly',
      wordCount = 2000,
      includeAffiliateLinks = true
    } = req.body;
    
    const task = {
      type: 'content_generation',
      data: {
        contentType,
        products,
        keywords,
        targetAudience,
        tone,
        wordCount,
        includeAffiliateLinks,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await contentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error generating content:', error);
    res.status(500).json({ error: error.message });
  }
});

// Optimize content for SEO
router.post('/optimize/seo', checkContentAccess, async (req, res) => {
  try {
    const {
      content,
      targetKeywords = [],
      secondaryKeywords = [],
      lsiKeywords = []
    } = req.body;
    
    const task = {
      type: 'seo_optimization',
      data: {
        content,
        targetKeywords,
        secondaryKeywords,
        lsiKeywords,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await contentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error optimizing SEO:', error);
    res.status(500).json({ error: error.message });
  }
});

// Research products for content
router.post('/research/products', checkContentAccess, async (req, res) => {
  try {
    const {
      keywords = [],
      category = null,
      priceRange = null,
      minRating = 4.0,
      maxProducts = 10,
      networks = ['amazon', 'shopee', 'lazada']
    } = req.body;
    
    const task = {
      type: 'product_research',
      data: {
        keywords,
        category,
        priceRange,
        minRating,
        maxProducts,
        networks,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await contentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error researching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedule content
router.post('/schedule', checkContentAccess, async (req, res) => {
  try {
    const {
      content,
      platforms = ['facebook', 'instagram', 'twitter'],
      scheduleType = 'optimal',
      startDate = new Date(),
      frequency = 'daily',
      timeSlots = null
    } = req.body;
    
    const task = {
      type: 'content_scheduling',
      data: {
        content,
        platforms,
        scheduleType,
        startDate,
        frequency,
        timeSlots,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await contentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error scheduling content:', error);
    res.status(500).json({ error: error.message });
  }
});

// Post to social media
router.post('/social/post', checkContentAccess, async (req, res) => {
  try {
    const {
      postId,
      platform,
      content,
      media = [],
      hashtags = [],
      scheduledTime = null
    } = req.body;
    
    const task = {
      type: 'social_media_posting',
      data: {
        postId,
        platform,
        content,
        media,
        hashtags,
        scheduledTime,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await contentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error posting to social media:', error);
    res.status(500).json({ error: error.message });
  }
});

// Track content performance
router.post('/performance/track', checkContentAccess, async (req, res) => {
  try {
    const {
      contentId = null,
      postId = null,
      timeRange = '7d',
      metrics = ['engagement', 'reach', 'conversions', 'revenue']
    } = req.body;
    
    const task = {
      type: 'performance_tracking',
      data: {
        contentId,
        postId,
        timeRange,
        metrics,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await contentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error tracking performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze content
router.post('/analyze', checkContentAccess, async (req, res) => {
  try {
    const {
      content,
      analysisType = 'comprehensive',
      compareWith = null,
      benchmark = null
    } = req.body;
    
    const task = {
      type: 'content_analysis',
      data: {
        content,
        analysisType,
        compareWith,
        benchmark,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await contentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error analyzing content:', error);
    res.status(500).json({ error: error.message });
  }
});

// Integrate trends
router.post('/trends/integrate', checkContentAccess, async (req, res) => {
  try {
    const {
      content,
      trends = [],
      integrationLevel = 'moderate',
      platforms = ['facebook', 'instagram', 'twitter']
    } = req.body;
    
    const task = {
      type: 'trend_integration',
      data: {
        content,
        trends,
        integrationLevel,
        platforms,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await contentAgent.executeTask(task);
    
    res.json({
      success: true,
      result: result.result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error integrating trends:', error);
    res.status(500).json({ error: error.message });
  }
});

// Automation Routes

// Start automation
router.post('/automation/start', checkContentAccess, async (req, res) => {
  try {
    const {
      postingInterval = 15, // minutes
      platforms = ['facebook', 'instagram', 'twitter'],
      contentTypes = ['product_review', 'comparison', 'buying_guide'],
      workingHours = { start: 6, end: 22 }
    } = req.body;
    
    // Update automation config
    automationAgent.automationConfig.postingInterval = postingInterval * 60 * 1000;
    automationAgent.automationConfig.platforms = platforms;
    automationAgent.automationConfig.contentTypes = contentTypes;
    automationAgent.automationConfig.workingHours = workingHours;
    
    const result = await automationAgent.startAutomation();
    
    res.json({
      success: true,
      result,
      config: automationAgent.automationConfig,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error starting automation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop automation
router.post('/automation/stop', checkContentAccess, async (req, res) => {
  try {
    const result = await automationAgent.stopAutomation();
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error stopping automation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get automation status
router.get('/automation/status', checkContentAccess, async (req, res) => {
  try {
    const status = {
      isRunning: automationAgent.isRunning,
      config: automationAgent.automationConfig,
      stats: automationAgent.automationStats,
      contentQueue: {
        length: automationAgent.contentQueue.length,
        items: automationAgent.contentQueue.slice(0, 10) // Show first 10
      },
      publishedPosts: {
        total: automationAgent.publishedPosts.length,
        recent: automationAgent.publishedPosts.slice(-10) // Show last 10
      },
      lastPostTime: automationAgent.lastPostTime,
      performanceMetrics: Object.fromEntries(automationAgent.performanceMetrics)
    };
    
    res.json({
      success: true,
      status,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting automation status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get automation report
router.get('/automation/report', checkContentAccess, async (req, res) => {
  try {
    const report = await automationAgent.generateAutomationReport();
    
    res.json({
      success: true,
      report,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting automation report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual content creation for automation
router.post('/automation/create-content', checkContentAccess, async (req, res) => {
  try {
    const {
      product,
      contentType = 'auto',
      keywords = []
    } = req.body;
    
    const content = await automationAgent.generateAutomatedContent(product);
    
    if (content) {
      res.json({
        success: true,
        content,
        timestamp: new Date()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to generate content'
      });
    }
  } catch (error) {
    logger.error('Error creating automation content:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add content to queue
router.post('/automation/queue/add', checkContentAccess, async (req, res) => {
  try {
    const { content } = req.body;
    
    automationAgent.contentQueue.push(content);
    
    res.json({
      success: true,
      queueLength: automationAgent.contentQueue.length,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error adding to queue:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get content queue
router.get('/automation/queue', checkContentAccess, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const queue = automationAgent.contentQueue.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );
    
    res.json({
      success: true,
      queue,
      pagination: {
        total: automationAgent.contentQueue.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < automationAgent.contentQueue.length
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting content queue:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear content queue
router.delete('/automation/queue', checkContentAccess, async (req, res) => {
  try {
    const clearedCount = automationAgent.contentQueue.length;
    automationAgent.contentQueue = [];
    
    res.json({
      success: true,
      clearedCount,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error clearing queue:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get published posts
router.get('/automation/posts', checkContentAccess, async (req, res) => {
  try {
    const { limit = 20, offset = 0, platform = null } = req.query;
    
    let posts = automationAgent.publishedPosts;
    
    // Filter by platform if specified
    if (platform) {
      posts = posts.filter(post => post.platform === platform);
    }
    
    // Sort by publish date (newest first)
    posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    // Apply pagination
    const paginatedPosts = posts.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );
    
    res.json({
      success: true,
      posts: paginatedPosts,
      pagination: {
        total: posts.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < posts.length
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting published posts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch Operations

// Generate multiple content pieces
router.post('/batch/generate', checkContentAccess, async (req, res) => {
  try {
    const {
      contentRequests = [],
      maxConcurrent = 5
    } = req.body;
    
    if (!Array.isArray(contentRequests) || contentRequests.length === 0) {
      return res.status(400).json({ error: 'Content requests array is required' });
    }
    
    if (contentRequests.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 content requests per batch' });
    }
    
    const results = [];
    
    // Process in batches
    for (let i = 0; i < contentRequests.length; i += maxConcurrent) {
      const batch = contentRequests.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (request) => {
        try {
          const task = {
            type: 'content_generation',
            data: {
              ...request,
              organizationId: req.user.organization.id
            }
          };
          
          const result = await contentAgent.executeTask(task);
          
          return {
            success: true,
            content: result.result,
            request
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            request
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    res.json({
      success: true,
      results,
      summary: {
        total: contentRequests.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      },
      timestamp: new Date()
    });
    
  } catch (error) {
    logger.error('Error in batch content generation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete workflow: Research -> Generate -> Schedule
router.post('/workflow/complete', checkContentAccess, async (req, res) => {
  try {
    const {
      keywords = [],
      category = null,
      contentType = 'product_review',
      platforms = ['facebook', 'instagram'],
      scheduleType = 'optimal',
      autoStart = false
    } = req.body;
    
    // Step 1: Research products
    const researchTask = {
      type: 'product_research',
      data: {
        keywords,
        category,
        maxProducts: 5,
        organizationId: req.user.organization.id
      }
    };
    
    const researchResult = await contentAgent.executeTask(researchTask);
    
    if (!researchResult.success) {
      throw new Error('Product research failed');
    }
    
    // Step 2: Generate content
    const generateTask = {
      type: 'content_generation',
      data: {
        contentType,
        products: researchResult.result.products.slice(0, 3),
        keywords,
        organizationId: req.user.organization.id
      }
    };
    
    const generateResult = await contentAgent.executeTask(generateTask);
    
    if (!generateResult.success) {
      throw new Error('Content generation failed');
    }
    
    // Step 3: Schedule content
    const scheduleTask = {
      type: 'content_scheduling',
      data: {
        content: generateResult.result.content,
        platforms,
        scheduleType,
        organizationId: req.user.organization.id
      }
    };
    
    const scheduleResult = await contentAgent.executeTask(scheduleTask);
    
    // Step 4: Add to automation queue if requested
    if (autoStart && !automationAgent.isRunning) {
      await automationAgent.startAutomation();
    }
    
    logger.info(`🔄 Complete workflow executed: ${keywords.join(', ')}`);
    
    res.json({
      success: true,
      workflow: {
        research: researchResult.result,
        content: generateResult.result,
        schedule: scheduleResult.result,
        automationStarted: autoStart
      },
      timestamp: new Date()
    });
    
  } catch (error) {
    logger.error('Error in complete workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Content dashboard
router.get('/dashboard', checkContentAccess, async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    
    // Get automation status
    const automationStatus = {
      isRunning: automationAgent.isRunning,
      stats: automationAgent.automationStats,
      queueLength: automationAgent.contentQueue.length,
      publishedToday: automationAgent.publishedPosts.filter(post => 
        new Date(post.publishedAt).toDateString() === new Date().toDateString()
      ).length
    };
    
    // Get performance metrics
    const performanceTask = {
      type: 'performance_tracking',
      data: {
        timeRange,
        metrics: ['engagement', 'reach', 'conversions', 'revenue'],
        organizationId: req.user.organization.id
      }
    };
    
    const performanceResult = await contentAgent.executeTask(performanceTask);
    
    // Get recent posts
    const recentPosts = automationAgent.publishedPosts.slice(-10);
    
    res.json({
      success: true,
      dashboard: {
        automation: automationStatus,
        performance: performanceResult.result,
        recentPosts,
        timeRange
      },
      timestamp: new Date()
    });
    
  } catch (error) {
    logger.error('Error getting content dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    const health = {
      contentAgent: !!contentAgent,
      automationAgent: !!automationAgent,
      automationRunning: automationAgent.isRunning,
      contentQueue: automationAgent.contentQueue.length,
      publishedPosts: automationAgent.publishedPosts.length,
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
    logger.error('Error in content health check:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

// Graceful shutdown
const shutdown = async () => {
  try {
    await contentAgent.cleanup();
    await automationAgent.cleanup();
    logger.info('🔌 Content system shut down gracefully');
  } catch (error) {
    logger.error('Error shutting down Content system:', error);
  }
};

module.exports = {
  router,
  shutdown
};
