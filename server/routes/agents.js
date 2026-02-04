// Agents API Routes
// Handles AI agent operations and task management

const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');
const AgentManager = require('../agents/agentManager');
const logger = require('../utils/logger');

// Initialize Agent Manager
const agentManager = new AgentManager();

// Middleware to check agent access
const checkAgentAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if organization has agent features enabled
  if (req.user.organization.subscriptionPlan !== 'enterprise') {
    return res.status(403).json({ error: 'AI agents require enterprise plan' });
  }
  
  next();
};

// Apply rate limiting to agent endpoints
router.use(rateLimiter.createAgentRateLimiter());

// Task Management Routes

// Submit task to agent
router.post('/tasks', checkAgentAccess, async (req, res) => {
  try {
    const { type, data, priority = 'normal' } = req.body;
    
    if (!type || !data) {
      return res.status(400).json({ error: 'Task type and data are required' });
    }
    
    const task = {
      type,
      data,
      priority,
      submittedBy: req.user.id,
      organizationId: req.user.organization.id
    };
    
    const result = await agentManager.submitTask(task);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error submitting task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get task status
router.get('/tasks/:taskId', checkAgentAccess, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const taskStatus = agentManager.getTaskStatus(taskId);
    
    if (!taskStatus) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user has access to this task
    if (taskStatus.organizationId && taskStatus.organizationId !== req.user.organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      success: true,
      task: taskStatus,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting task status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel task
router.post('/tasks/:taskId/cancel', checkAgentAccess, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Check if user has access to cancel this task
    const taskStatus = agentManager.getTaskStatus(taskId);
    if (!taskStatus) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (taskStatus.organizationId && taskStatus.organizationId !== req.user.organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await agentManager.cancelTask(taskId);
    
    res.json({
      success: result.success,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error cancelling task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's tasks
router.get('/tasks', checkAgentAccess, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    // Get all tasks and filter by user's organization
    const allTasks = [
      ...agentManager.taskHistory,
      ...Array.from(agentManager.activeTasks.values()).map(t => t.task),
      ...agentManager.taskQueue
    ];
    
    const userTasks = allTasks.filter(task => 
      task.organizationId === req.user.organization.id
    );
    
    // Filter by status if specified
    let filteredTasks = userTasks;
    if (status) {
      filteredTasks = userTasks.filter(task => task.status === status);
    }
    
    // Sort by submission time (newest first)
    filteredTasks.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    // Apply pagination
    const paginatedTasks = filteredTasks.slice(
      parseInt(offset), 
      parseInt(offset) + parseInt(limit)
    );
    
    res.json({
      success: true,
      tasks: paginatedTasks,
      pagination: {
        total: filteredTasks.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < filteredTasks.length
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting user tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Agent Management Routes

// Get system status
router.get('/status', checkAgentAccess, async (req, res) => {
  try {
    const systemStatus = agentManager.getSystemStatus();
    
    res.json({
      success: true,
      status: systemStatus,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting system status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get agent status
router.get('/agents/:agentType/status', checkAgentAccess, async (req, res) => {
  try {
    const { agentType } = req.params;
    
    const agentStatus = agentManager.getAgentStatus(agentType);
    
    if (!agentStatus) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({
      success: true,
      agent: agentStatus,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting agent status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all agents status
router.get('/agents/status', checkAgentAccess, async (req, res) => {
  try {
    const agentsStatus = agentManager.getAgentStatus();
    
    res.json({
      success: true,
      agents: agentsStatus,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting agents status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get performance report
router.get('/performance', checkAgentAccess, async (req, res) => {
  try {
    const { timeRange = '1h' } = req.query;
    
    const performanceReport = agentManager.getPerformanceReport(timeRange);
    
    res.json({
      success: true,
      report: performanceReport,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting performance report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Service Agent Specific Routes

// Create service with agent
router.post('/services/create', checkAgentAccess, async (req, res) => {
  try {
    const serviceData = req.body;
    
    const task = {
      type: 'service_creation',
      data: {
        ...serviceData,
        organizationId: req.user.organization.id,
        createdBy: req.user.id
      },
      priority: serviceData.priority || 'normal'
    };
    
    const result = await agentManager.submitTask(task);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error creating service with agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Assign service with agent
router.post('/services/:serviceId/assign', checkAgentAccess, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { manualAssignment = false, assignedTo = null } = req.body;
    
    const task = {
      type: 'service_assignment',
      data: {
        serviceId,
        manualAssignment,
        assignedTo,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await agentManager.submitTask(task);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error assigning service with agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Track service with agent
router.post('/services/:serviceId/track', checkAgentAccess, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { trackingLevel = 'standard' } = req.body;
    
    const task = {
      type: 'service_tracking',
      data: {
        serviceId,
        trackingLevel,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await agentManager.submitTask(task);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error tracking service with agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete service with agent
router.post('/services/:serviceId/complete', checkAgentAccess, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { completionData, customerFeedback, qualityMetrics } = req.body;
    
    const task = {
      type: 'service_completion',
      data: {
        serviceId,
        completionData,
        customerFeedback,
        qualityMetrics,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await agentManager.submitTask(task);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error completing service with agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analytics Agent Specific Routes

// Analyze data with agent
router.post('/analytics/analyze', checkAgentAccess, async (req, res) => {
  try {
    const { analysisType, dataSource, timeRange, filters = {} } = req.body;
    
    const task = {
      type: 'data_analysis',
      data: {
        analysisType,
        dataSource,
        timeRange,
        filters,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await agentManager.submitTask(task);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error analyzing data with agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate report with agent
router.post('/analytics/reports', checkAgentAccess, async (req, res) => {
  try {
    const { reportType, template, timeRange, filters = {}, format = 'json' } = req.body;
    
    const task = {
      type: 'report_generation',
      data: {
        reportType,
        template,
        timeRange,
        filters,
        format,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await agentManager.submitTask(task);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error generating report with agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze trends with agent
router.post('/analytics/trends', checkAgentAccess, async (req, res) => {
  try {
    const { metric, timeRange, granularity = 'daily', compareWith = null } = req.body;
    
    const task = {
      type: 'trend_analysis',
      data: {
        metric,
        timeRange,
        granularity,
        compareWith,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await agentManager.submitTask(task);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error analyzing trends with agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Predictive analytics with agent
router.post('/analytics/predict', checkAgentAccess, async (req, res) => {
  try {
    const { predictionType, targetVariable, features, timeRange, modelType = 'linear_regression' } = req.body;
    
    const task = {
      type: 'predictive_analytics',
      data: {
        predictionType,
        targetVariable,
        features,
        timeRange,
        modelType,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await agentManager.submitTask(task);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error in predictive analytics with agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Monitor performance with agent
router.post('/analytics/monitor', checkAgentAccess, async (req, res) => {
  try {
    const { monitoringType = 'comprehensive', timeRange = '24h', alertThresholds = null } = req.body;
    
    const task = {
      type: 'performance_monitoring',
      data: {
        monitoringType,
        timeRange,
        alertThresholds,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await agentManager.submitTask(task);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error monitoring performance with agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Track KPIs with agent
router.post('/analytics/kpi', checkAgentAccess, async (req, res) => {
  try {
    const { kpiTypes = 'all', timeRange = '30d', targets = null } = req.body;
    
    const task = {
      type: 'kpi_tracking',
      data: {
        kpiTypes,
        timeRange,
        targets,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await agentManager.submitTask(task);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error tracking KPIs with agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Business intelligence with agent
router.post('/analytics/intelligence', checkAgentAccess, async (req, res) => {
  try {
    const { analysisScope = 'comprehensive', timeRange = '90d', focusAreas = null } = req.body;
    
    const task = {
      type: 'business_intelligence',
      data: {
        analysisScope,
        timeRange,
        focusAreas,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await agentManager.submitTask(task);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error in business intelligence with agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create data visualization with agent
router.post('/analytics/visualize', checkAgentAccess, async (req, res) => {
  try {
    const { visualizationType, dataSource, chartType, timeRange, filters = {} } = req.body;
    
    const task = {
      type: 'data_visualization',
      data: {
        visualizationType,
        dataSource,
        chartType,
        timeRange,
        filters,
        organizationId: req.user.organization.id
      },
      priority: 'normal'
    };
    
    const result = await agentManager.submitTask(task);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error creating visualization with agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch Operations

// Submit multiple tasks
router.post('/tasks/batch', checkAgentAccess, async (req, res) => {
  try {
    const { tasks } = req.body;
    
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Tasks array is required' });
    }
    
    if (tasks.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 tasks per batch' });
    }
    
    const results = [];
    
    for (const taskData of tasks) {
      const task = {
        ...taskData,
        organizationId: req.user.organization.id,
        submittedBy: req.user.id
      };
      
      const result = await agentManager.submitTask(task);
      results.push(result);
    }
    
    res.json({
      success: true,
      results,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error submitting batch tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    const health = {
      agentManager: !!agentManager,
      agents: agentManager.agents.size,
      activeTasks: agentManager.activeTasks.size,
      queuedTasks: agentManager.taskQueue.length,
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
    logger.error('Error in agent health check:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

// WebSocket endpoint for real-time task updates (would be implemented with Socket.io)
router.get('/tasks/:taskId/stream', checkAgentAccess, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // This would set up Server-Sent Events for real-time updates
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Send initial status
    const taskStatus = agentManager.getTaskStatus(taskId);
    res.write(`data: ${JSON.stringify({ type: 'status', data: taskStatus })}\n\n`);
    
    // Setup event listener for task updates
    const updateListener = (result) => {
      if (result.taskId === taskId) {
        res.write(`data: ${JSON.stringify({ type: 'update', data: result })}\n\n`);
      }
    };
    
    agentManager.on('task:completed', updateListener);
    agentManager.on('task:failed', updateListener);
    
    // Cleanup on disconnect
    req.on('close', () => {
      agentManager.removeListener('task:completed', updateListener);
      agentManager.removeListener('task:failed', updateListener);
    });
    
  } catch (error) {
    logger.error('Error setting up task stream:', error);
    res.status(500).json({ error: error.message });
  }
});

// Graceful shutdown
const shutdown = async () => {
  try {
    await agentManager.cleanup();
    logger.info('🔌 Agent system shut down gracefully');
  } catch (error) {
    logger.error('Error shutting down Agent system:', error);
  }
};

module.exports = {
  router,
  shutdown
};
