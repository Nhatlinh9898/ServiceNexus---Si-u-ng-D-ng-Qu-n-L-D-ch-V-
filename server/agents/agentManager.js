// Agent Manager
// Central management system for all specialized agents

const EventEmitter = require('events');
const ServiceAgent = require('./serviceAgent');
const AnalyticsAgent = require('./analyticsAgent');
const logger = require('../utils/logger');

class AgentManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.id = 'agent_manager';
    this.agents = new Map();
    this.taskQueue = [];
    this.activeTasks = new Map();
    this.agentMetrics = new Map();
    this.taskHistory = [];
    
    this.config = {
      maxConcurrentTasks: 50,
      taskTimeout: 1800000, // 30 minutes
      retryAttempts: 3,
      loadBalancing: true,
      autoScaling: true,
      healthCheckInterval: 60000, // 1 minute
      ...config
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      logger.info('🎛️ Initializing Agent Manager...');
      
      // Register specialized agents
      await this.registerAgents();
      
      // Setup task routing
      this.setupTaskRouting();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      // Start task processing
      this.startTaskProcessing();
      
      logger.info('✅ Agent Manager initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Agent Manager:', error);
      throw error;
    }
  }

  // Register specialized agents
  async registerAgents() {
    try {
      // Register Service Agent
      const serviceAgent = new ServiceAgent({
        id: 'service_agent_001',
        maxConcurrentTasks: 10,
        taskTimeout: 600000
      });
      this.agents.set('service', serviceAgent);
      
      // Register Analytics Agent
      const analyticsAgent = new AnalyticsAgent({
        id: 'analytics_agent_001',
        maxConcurrentTasks: 8,
        taskTimeout: 900000
      });
      this.agents.set('analytics', analyticsAgent);
      
      // Register Affiliate Agent
      const AffiliateAgent = require('./affiliateAgent');
      const affiliateAgent = new AffiliateAgent({
        id: 'affiliate_agent_001',
        maxConcurrentTasks: 12,
        taskTimeout: 600000
      });
      this.agents.set('affiliate', affiliateAgent);
      
      // Register Payment Agent
      const PaymentAgent = require('./paymentAgent');
      const paymentAgent = new PaymentAgent({
        id: 'payment_agent_001',
        maxConcurrentTasks: 15,
        taskTimeout: 300000
      });
      this.agents.set('payment', paymentAgent);
      
      // Register Content Agent
      const ContentAgent = require('./contentAgent');
      const contentAgent = new ContentAgent({
        id: 'content_agent_001',
        maxConcurrentTasks: 20,
        taskTimeout: 900000
      });
      this.agents.set('content', contentAgent);
      
      // Register Automation Agent
      const AutomationAgent = require('./automationAgent');
      const automationAgent = new AutomationAgent({
        id: 'automation_agent_001',
        maxConcurrentTasks: 25,
        taskTimeout: 1200000
      });
      this.agents.set('automation', automationAgent);
      
      // Register Learning Agent
      const LearningAgent = require('./learningAgent');
      const learningAgent = new LearningAgent({
        id: 'learning_agent_001',
        maxConcurrentTasks: 10,
        taskTimeout: 1800000
      });
      this.agents.set('learning', learningAgent);
      
      // Register Media Agent
      const MediaAgent = require('./mediaAgent');
      const mediaAgent = new MediaAgent({
        id: 'media_agent_001',
        maxConcurrentTasks: 15,
        taskTimeout: 1200000
      });
      this.agents.set('media', mediaAgent);
      
      // Setup agent event listeners
      this.setupAgentEventListeners();
      
      logger.info(`🤖 Registered ${this.agents.size} specialized agents`);
    } catch (error) {
      logger.error('Error registering agents:', error);
      throw error;
    }
  }

  // Setup event listeners for agents
  setupAgentEventListeners() {
    for (const [agentType, agent] of this.agents) {
      agent.on('initialized', () => {
        logger.info(`🤖 Agent ${agentType} initialized`);
      });
      
      agent.on('task:completed', (result) => {
        this.handleTaskCompletion(agentType, result);
      });
      
      agent.on('task:failed', (error) => {
        this.handleTaskFailure(agentType, error);
      });
      
      agent.on('health:check', (health) => {
        this.updateAgentMetrics(agentType, health);
      });
      
      agent.on('error', (error) => {
        logger.error(`❌ Agent ${agentType} error:`, error);
      });
    }
  }

  // Submit task to agent manager
  async submitTask(task) {
    try {
      // Validate task
      if (!this.validateTask(task)) {
        throw new Error('Invalid task format');
      }
      
      // Add task metadata
      const enrichedTask = {
        ...task,
        id: this.generateTaskId(),
        submittedAt: new Date(),
        status: 'queued',
        priority: task.priority || 'normal',
        retryCount: 0
      };
      
      // Add to queue
      this.taskQueue.push(enrichedTask);
      
      // Sort queue by priority
      this.sortTaskQueue();
      
      // Emit task submitted event
      this.emit('task:submitted', enrichedTask);
      
      logger.info(`📋 Task submitted: ${enrichedTask.id} - ${task.type}`);
      
      return {
        success: true,
        taskId: enrichedTask.id,
        queuePosition: this.taskQueue.indexOf(enrichedTask) + 1
      };
      
    } catch (error) {
      logger.error('Error submitting task:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process task queue
  async processTaskQueue() {
    while (this.taskQueue.length > 0 && this.canProcessMoreTasks()) {
      const task = this.taskQueue.shift();
      await this.assignTask(task);
    }
  }

  // Assign task to appropriate agent
  async assignTask(task) {
    try {
      // Find best agent for this task
      const agentType = this.selectAgentForTask(task);
      const agent = this.agents.get(agentType);
      
      if (!agent) {
        throw new Error(`No agent available for task type: ${task.type}`);
      }
      
      // Check if agent can handle the task
      if (!agent.canHandleTask(task)) {
        throw new Error(`Agent ${agentType} cannot handle this task`);
      }
      
      // Update task status
      task.status = 'assigned';
      task.assignedTo = agentType;
      task.assignedAt = new Date();
      
      // Track active task
      this.activeTasks.set(task.id, {
        task,
        agentType,
        startTime: Date.now()
      });
      
      // Execute task
      const result = await agent.executeTask(task);
      
      // Handle result
      if (result.success) {
        this.handleTaskCompletion(agentType, result);
      } else {
        await this.handleTaskFailure(agentType, result);
      }
      
    } catch (error) {
      logger.error('Error assigning task:', error);
      await this.handleTaskFailure('unknown', { task, error: error.message });
    }
  }

  // Select best agent for task
  selectAgentForTask(task) {
    const suitableAgents = [];
    
    for (const [agentType, agent] of this.agents) {
      if (agent.canHandleTask(task)) {
        const score = this.calculateAgentScore(agent, task);
        suitableAgents.push({ agentType, score });
      }
    }
    
    if (suitableAgents.length === 0) {
      throw new Error('No suitable agent found for task');
    }
    
    // Sort by score and return best
    suitableAgents.sort((a, b) => b.score - a.score);
    return suitableAgents[0].agentType;
  }

  // Calculate agent score for task assignment
  calculateAgentScore(agent, task) {
    let score = 0;
    
    // Base score for capability
    score += agent.capabilities.includes(task.type) ? 50 : 0;
    
    // Specialization bonus
    if (agent.specializations.some(spec => task.type.includes(spec))) {
      score += 30;
    }
    
    // Workload consideration
    const currentLoad = agent.getCurrentTaskCount();
    const maxLoad = agent.config.maxConcurrentTasks;
    const loadScore = (1 - currentLoad / maxLoad) * 20;
    score += loadScore;
    
    // Performance consideration
    if (agent.metrics.successRate > 0.9) {
      score += 10;
    }
    
    // Priority consideration
    if (task.priority === 'urgent' && agent.capabilities.includes('urgent_handling')) {
      score += 15;
    }
    
    return score;
  }

  // Check if more tasks can be processed
  canProcessMoreTasks() {
    const totalActiveTasks = this.activeTasks.size;
    return totalActiveTasks < this.config.maxConcurrentTasks;
  }

  // Handle task completion
  handleTaskCompletion(agentType, result) {
    const activeTask = this.activeTasks.get(result.taskId);
    if (activeTask) {
      // Update task status
      activeTask.task.status = 'completed';
      activeTask.task.completedAt = new Date();
      activeTask.task.result = result.result;
      activeTask.task.executionTime = result.executionTime;
      
      // Move to history
      this.taskHistory.push(activeTask.task);
      
      // Remove from active tasks
      this.activeTasks.delete(result.taskId);
      
      // Update agent metrics
      this.updateAgentTaskMetrics(agentType, true, result.executionTime);
      
      // Emit completion event
      this.emit('task:completed', result);
      
      logger.info(`✅ Task completed: ${result.taskId} by ${agentType}`);
    }
  }

  // Handle task failure
  async handleTaskFailure(agentType, result) {
    const activeTask = this.activeTasks.get(result.taskId);
    if (activeTask) {
      // Check if retry is possible
      if (activeTask.task.retryCount < this.config.retryAttempts) {
        // Retry task
        activeTask.task.retryCount++;
        activeTask.task.status = 'retrying';
        
        // Add back to queue with lower priority
        this.taskQueue.push(activeTask.task);
        this.sortTaskQueue();
        
        logger.info(`🔄 Retrying task: ${result.taskId} (attempt ${activeTask.task.retryCount})`);
      } else {
        // Mark as failed
        activeTask.task.status = 'failed';
        activeTask.task.failedAt = new Date();
        activeTask.task.error = result.error;
        
        // Move to history
        this.taskHistory.push(activeTask.task);
        
        // Remove from active tasks
        this.activeTasks.delete(result.taskId);
        
        // Update agent metrics
        this.updateAgentTaskMetrics(agentType, false, 0);
        
        // Emit failure event
        this.emit('task:failed', result);
        
        logger.error(`❌ Task failed: ${result.taskId} by ${agentType} - ${result.error}`);
      }
    }
  }

  // Update agent task metrics
  updateAgentTaskMetrics(agentType, success, executionTime) {
    if (!this.agentMetrics.has(agentType)) {
      this.agentMetrics.set(agentType, {
        tasksCompleted: 0,
        tasksFailed: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        successRate: 0,
        lastUpdated: new Date()
      });
    }
    
    const metrics = this.agentMetrics.get(agentType);
    
    if (success) {
      metrics.tasksCompleted++;
      metrics.totalExecutionTime += executionTime;
    } else {
      metrics.tasksFailed++;
    }
    
    // Calculate averages
    const totalTasks = metrics.tasksCompleted + metrics.tasksFailed;
    metrics.successRate = metrics.tasksCompleted / totalTasks;
    metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.tasksCompleted;
    metrics.lastUpdated = new Date();
  }

  // Update agent health metrics
  updateAgentMetrics(agentType, health) {
    if (!this.agentMetrics.has(agentType)) {
      this.agentMetrics.set(agentType, {});
    }
    
    const metrics = this.agentMetrics.get(agentType);
    metrics.health = health;
    metrics.lastHealthCheck = new Date();
  }

  // Sort task queue by priority
  sortTaskQueue() {
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    
    this.taskQueue.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by submission time
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    });
  }

  // Validate task format
  validateTask(task) {
    return task && 
           typeof task === 'object' && 
           task.type && 
           typeof task.type === 'string' &&
           task.data;
  }

  // Generate unique task ID
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get agent status
  getAgentStatus(agentType = null) {
    if (agentType) {
      const agent = this.agents.get(agentType);
      return agent ? agent.getStatus() : null;
    }
    
    const status = {};
    for (const [type, agent] of this.agents) {
      status[type] = agent.getStatus();
    }
    return status;
  }

  // Get system status
  getSystemStatus() {
    return {
      agents: this.agents.size,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      completedTasks: this.taskHistory.length,
      systemLoad: this.calculateSystemLoad(),
      uptime: Date.now(),
      metrics: this.getSystemMetrics()
    };
  }

  // Calculate system load
  calculateSystemLoad() {
    const totalCapacity = Array.from(this.agents.values())
      .reduce((sum, agent) => sum + agent.config.maxConcurrentTasks, 0);
    
    return this.activeTasks.size / totalCapacity;
  }

  // Get system metrics
  getSystemMetrics() {
    const metrics = {
      totalTasksCompleted: 0,
      totalTasksFailed: 0,
      averageExecutionTime: 0,
      systemSuccessRate: 0,
      agentMetrics: {}
    };
    
    for (const [agentType, agentMetrics] of this.agentMetrics) {
      metrics.agentMetrics[agentType] = agentMetrics;
      metrics.totalTasksCompleted += agentMetrics.tasksCompleted;
      metrics.totalTasksFailed += agentMetrics.tasksFailed;
    }
    
    const totalTasks = metrics.totalTasksCompleted + metrics.totalTasksFailed;
    if (totalTasks > 0) {
      metrics.systemSuccessRate = metrics.totalTasksCompleted / totalTasks;
    }
    
    return metrics;
  }

  // Get task status
  getTaskStatus(taskId) {
    // Check active tasks
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      return {
        ...activeTask.task,
        agentType: activeTask.agentType,
        executionTime: Date.now() - activeTask.startTime
      };
    }
    
    // Check queue
    const queuedTask = this.taskQueue.find(task => task.id === taskId);
    if (queuedTask) {
      return {
        ...queuedTask,
        queuePosition: this.taskQueue.indexOf(queuedTask) + 1
      };
    }
    
    // Check history
    const historicalTask = this.taskHistory.find(task => task.id === taskId);
    if (historicalTask) {
      return historicalTask;
    }
    
    return null;
  }

  // Cancel task
  async cancelTask(taskId) {
    try {
      // Check if task is in queue
      const queueIndex = this.taskQueue.findIndex(task => task.id === taskId);
      if (queueIndex !== -1) {
        const task = this.taskQueue.splice(queueIndex, 1)[0];
        task.status = 'cancelled';
        task.cancelledAt = new Date();
        this.taskHistory.push(task);
        
        this.emit('task:cancelled', { taskId });
        logger.info(`❌ Task cancelled: ${taskId}`);
        
        return { success: true, taskId };
      }
      
      // Check if task is active
      const activeTask = this.activeTasks.get(taskId);
      if (activeTask) {
        // Cannot cancel active tasks (would need agent support)
        throw new Error('Cannot cancel active task');
      }
      
      throw new Error('Task not found');
    } catch (error) {
      logger.error('Error cancelling task:', error);
      return { success: false, error: error.message };
    }
  }

  // Setup task routing
  setupTaskRouting() {
    // Setup routing rules for different task types
    this.routingRules = {
      'service_*': 'service',
      'analytics_*': 'analytics',
      'report_*': 'analytics',
      'monitoring_*': 'analytics',
      'product_*': 'affiliate',
      'affiliate_*': 'affiliate',
      'commission_*': 'affiliate',
      'market_*': 'affiliate',
      'competitor_*': 'affiliate',
      'trend_*': 'affiliate',
      'payment_*': 'payment',
      'transaction_*': 'payment',
      'refund_*': 'payment',
      'settlement_*': 'payment',
      'compliance_*': 'payment',
      'fraud_*': 'payment',
      'content_*': 'content',
      'seo_*': 'content',
      'social_*': 'content',
      'automation_*': 'automation',
      'schedule_*': 'automation',
      'batch_*': 'automation',
      'machine_learning': 'learning',
      'trend_prediction': 'learning',
      'behavioral_analysis': 'learning',
      'adaptive_optimization': 'learning',
      'pattern_recognition': 'learning',
      'anomaly_detection': 'learning',
      'recommendation_engine': 'learning',
      'performance_prediction': 'learning',
      'image_generation': 'media',
      'video_creation': 'media',
      'content_visualization': 'media',
      'brand_consistency': 'media',
      'media_optimization': 'media',
      'template_generation': 'media',
      'automated_editing': 'media',
      'multi_format_export': 'media'
    };
  }

  // Start health monitoring
  startHealthMonitoring() {
    setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  // Perform health check
  async performHealthCheck() {
    try {
      const healthStatus = {
        system: this.getSystemStatus(),
        agents: this.getAgentStatus(),
        timestamp: new Date()
      };
      
      // Check for issues
      const issues = this.identifyHealthIssues(healthStatus);
      
      if (issues.length > 0) {
        this.emit('health:issues', issues);
        logger.warn('⚠️ Health issues detected:', issues);
      }
      
      this.emit('health:check', healthStatus);
    } catch (error) {
      logger.error('Error during health check:', error);
    }
  }

  // Identify health issues
  identifyHealthIssues(healthStatus) {
    const issues = [];
    
    // Check system load
    if (healthStatus.system.systemLoad > 0.9) {
      issues.push({
        type: 'high_load',
        severity: 'high',
        message: 'System load is above 90%'
      });
    }
    
    // Check agent health
    for (const [agentType, agentStatus] of Object.entries(healthStatus.agents)) {
      if (agentStatus.status === 'error') {
        issues.push({
          type: 'agent_error',
          severity: 'high',
          message: `Agent ${agentType} is in error state`
        });
      }
      
      if (agentStatus.metrics && agentStatus.metrics.successRate < 0.8) {
        issues.push({
          type: 'low_success_rate',
          severity: 'medium',
          message: `Agent ${agentType} has low success rate: ${agentStatus.metrics.successRate}`
        });
      }
    }
    
    return issues;
  }

  // Setup performance monitoring
  setupPerformanceMonitoring() {
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 300000); // Every 5 minutes
  }

  // Collect performance metrics
  async collectPerformanceMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        system: this.getSystemStatus(),
        agents: this.getAgentStatus(),
        queue: {
          length: this.taskQueue.length,
          oldestTask: this.taskQueue.length > 0 ? this.taskQueue[0].submittedAt : null
        }
      };
      
      // Store metrics for analysis
      this.storePerformanceMetrics(metrics);
      
      this.emit('performance:metrics', metrics);
    } catch (error) {
      logger.error('Error collecting performance metrics:', error);
    }
  }

  // Store performance metrics
  storePerformanceMetrics(metrics) {
    // This would store metrics in database or time series store
    logger.debug('📊 Performance metrics stored');
  }

  // Start task processing
  startTaskProcessing() {
    setInterval(() => {
      this.processTaskQueue();
    }, 1000); // Process queue every second
  }

  // Get performance report
  getPerformanceReport(timeRange = '1h') {
    const report = {
      timeRange,
      system: this.getSystemStatus(),
      agents: this.getAgentStatus(),
      metrics: this.getSystemMetrics(),
      recommendations: this.generatePerformanceRecommendations()
    };
    
    return report;
  }

  // Generate performance recommendations
  generatePerformanceRecommendations() {
    const recommendations = [];
    const systemStatus = this.getSystemStatus();
    
    if (systemStatus.systemLoad > 0.8) {
      recommendations.push({
        type: 'scaling',
        priority: 'high',
        message: 'Consider scaling up agent capacity to handle high load'
      });
    }
    
    if (systemStatus.queuedTasks > 50) {
      recommendations.push({
        type: 'queue',
        priority: 'medium',
        message: 'Task queue is building up, consider increasing processing capacity'
      });
    }
    
    for (const [agentType, metrics] of this.agentMetrics) {
      if (metrics.successRate < 0.8) {
        recommendations.push({
          type: 'agent_optimization',
          priority: 'medium',
          message: `Agent ${agentType} has low success rate, review task handling logic`
        });
      }
    }
    
    return recommendations;
  }

  // Scale agents based on load
  async scaleAgents() {
    if (!this.config.autoScaling) return;
    
    const systemLoad = this.calculateSystemLoad();
    
    if (systemLoad > 0.8) {
      // Scale up
      await this.scaleUp();
    } else if (systemLoad < 0.3) {
      // Scale down
      await this.scaleDown();
    }
  }

  // Scale up agents
  async scaleUp() {
    logger.info('📈 Scaling up agents due to high load');
    // Implementation would create additional agent instances
  }

  // Scale down agents
  async scaleDown() {
    logger.info('📉 Scaling down agents due to low load');
    // Implementation would terminate excess agent instances
  }

  // Cleanup resources
  async cleanup() {
    try {
      logger.info('🧹 Cleaning up Agent Manager...');
      
      // Cleanup all agents
      for (const [agentType, agent] of this.agents) {
        await agent.cleanup();
      }
      
      // Clear collections
      this.agents.clear();
      this.taskQueue = [];
      this.activeTasks.clear();
      this.agentMetrics.clear();
      this.taskHistory = [];
      
      // Remove all listeners
      this.removeAllListeners();
      
      logger.info('✅ Agent Manager cleaned up');
    } catch (error) {
      logger.error('Error cleaning up Agent Manager:', error);
    }
  }
}

module.exports = AgentManager;
