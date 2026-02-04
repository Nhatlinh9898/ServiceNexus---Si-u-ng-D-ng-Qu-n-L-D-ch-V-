// Base Agent Class for ServiceNexus
// Core functionality and shared capabilities for all specialized agents

const EventEmitter = require('events');
const logger = require('../utils/logger');

class BaseAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.id = config.id || this.generateId();
    this.name = config.name || 'BaseAgent';
    this.type = config.type || 'base';
    this.version = config.version || '1.0.0';
    
    // Agent capabilities
    this.capabilities = config.capabilities || [];
    this.specializations = config.specializations || [];
    
    // Agent state
    this.status = 'idle';
    this.currentTask = null;
    this.taskHistory = [];
    this.knowledgeBase = new Map();
    this.memory = new Map();
    
    // Configuration
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks || 5,
      taskTimeout: config.taskTimeout || 300000, // 5 minutes
      retryAttempts: config.retryAttempts || 3,
      learningEnabled: config.learningEnabled !== false,
      autoUpdate: config.autoUpdate !== false,
      ...config
    };
    
    // Performance metrics
    this.metrics = {
      tasksCompleted: 0,
      tasksFailed: 0,
      averageTaskTime: 0,
      successRate: 0,
      lastActivity: new Date(),
      uptime: Date.now()
    };
    
    // Initialize agent
    this.initialize();
  }

  // Initialize agent
  async initialize() {
    try {
      logger.info(`🤖 Initializing agent: ${this.name} (${this.id})`);
      
      // Load knowledge base
      await this.loadKnowledgeBase();
      
      // Setup event handlers
      this.setupEventHandlers();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Initialize learning system
      if (this.config.learningEnabled) {
        await this.initializeLearning();
      }
      
      this.status = 'ready';
      this.emit('initialized', { agentId: this.id, name: this.name });
      
      logger.info(`✅ Agent initialized: ${this.name}`);
    } catch (error) {
      logger.error(`❌ Failed to initialize agent ${this.name}:`, error);
      this.status = 'error';
      this.emit('error', error);
    }
  }

  // Execute a task
  async executeTask(task) {
    const taskId = this.generateId();
    const startTime = Date.now();
    
    try {
      // Validate task
      if (!this.validateTask(task)) {
        throw new Error('Invalid task format');
      }
      
      // Check if agent can handle this task
      if (!this.canHandleTask(task)) {
        throw new Error('Agent cannot handle this task type');
      }
      
      // Check capacity
      if (this.getCurrentTaskCount() >= this.config.maxConcurrentTasks) {
        throw new Error('Agent at maximum capacity');
      }
      
      this.status = 'working';
      this.currentTask = { ...task, id: taskId, startTime };
      
      logger.info(`🎯 Agent ${this.name} executing task: ${task.type}`);
      
      // Execute task with timeout
      const result = await this.executeWithTimeout(task, this.config.taskTimeout);
      
      // Update metrics
      const executionTime = Date.now() - startTime;
      this.updateMetrics(true, executionTime);
      
      // Store in history
      this.taskHistory.push({
        id: taskId,
        task,
        result,
        executionTime,
        status: 'completed',
        timestamp: new Date()
      });
      
      // Learn from successful execution
      if (this.config.learningEnabled) {
        await this.learnFromTask(task, result, true);
      }
      
      this.status = 'ready';
      this.currentTask = null;
      
      logger.info(`✅ Task completed: ${taskId} by ${this.name}`);
      
      return {
        success: true,
        taskId,
        result,
        executionTime,
        agent: this.name
      };
      
    } catch (error) {
      // Update metrics
      const executionTime = Date.now() - startTime;
      this.updateMetrics(false, executionTime);
      
      // Store in history
      this.taskHistory.push({
        id: taskId,
        task,
        error: error.message,
        executionTime,
        status: 'failed',
        timestamp: new Date()
      });
      
      // Learn from failure
      if (this.config.learningEnabled) {
        await this.learnFromTask(task, error, false);
      }
      
      this.status = 'ready';
      this.currentTask = null;
      
      logger.error(`❌ Task failed: ${taskId} by ${this.name} - ${error.message}`);
      
      return {
        success: false,
        taskId,
        error: error.message,
        executionTime,
        agent: this.name
      };
    }
  }

  // Execute task with timeout
  async executeWithTimeout(task, timeout) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Task execution timeout'));
      }, timeout);
      
      try {
        const result = await this.performTask(task);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  // Perform task (to be implemented by subclasses)
  async performTask(task) {
    throw new Error('performTask must be implemented by subclass');
  }

  // Validate task format
  validateTask(task) {
    return task && 
           typeof task === 'object' && 
           task.type && 
           typeof task.type === 'string';
  }

  // Check if agent can handle task
  canHandleTask(task) {
    return this.capabilities.includes(task.type) ||
           this.specializations.some(spec => task.type.includes(spec));
  }

  // Get current task count
  getCurrentTaskCount() {
    return this.currentTask ? 1 : 0;
  }

  // Update performance metrics
  updateMetrics(success, executionTime) {
    this.metrics.tasksCompleted += success ? 1 : 0;
    this.metrics.tasksFailed += success ? 0 : 1;
    this.metrics.lastActivity = new Date();
    
    // Update average task time
    const totalTasks = this.metrics.tasksCompleted + this.metrics.tasksFailed;
    this.metrics.averageTaskTime = 
      (this.metrics.averageTaskTime * (totalTasks - 1) + executionTime) / totalTasks;
    
    // Update success rate
    this.metrics.successRate = this.metrics.tasksCompleted / totalTasks;
  }

  // Load knowledge base
  async loadKnowledgeBase() {
    try {
      // Load domain-specific knowledge
      const knowledge = await this.loadDomainKnowledge();
      
      for (const [key, value] of Object.entries(knowledge)) {
        this.knowledgeBase.set(key, value);
      }
      
      logger.info(`📚 Knowledge base loaded for ${this.name}: ${this.knowledgeBase.size} entries`);
    } catch (error) {
      logger.error(`Error loading knowledge base for ${this.name}:`, error);
    }
  }

  // Load domain-specific knowledge (to be implemented by subclasses)
  async loadDomainKnowledge() {
    return {};
  }

  // Setup event handlers
  setupEventHandlers() {
    this.on('task:assigned', (task) => {
      logger.info(`📋 Task assigned to ${this.name}: ${task.type}`);
    });
    
    this.on('task:completed', (result) => {
      logger.info(`✅ Task completed by ${this.name}: ${result.taskId}`);
    });
    
    this.on('task:failed', (error) => {
      logger.error(`❌ Task failed by ${this.name}: ${error.message}`);
    });
    
    this.on('knowledge:updated', (update) => {
      logger.info(`🧠 Knowledge updated for ${this.name}: ${update.key}`);
    });
  }

  // Start health monitoring
  startHealthMonitoring() {
    setInterval(() => {
      this.checkHealth();
    }, 60000); // Check every minute
  }

  // Check agent health
  checkHealth() {
    const health = {
      status: this.status,
      uptime: Date.now() - this.metrics.uptime,
      memoryUsage: process.memoryUsage(),
      taskCount: this.getCurrentTaskCount(),
      successRate: this.metrics.successRate,
      lastActivity: this.metrics.lastActivity
    };
    
    // Emit health status
    this.emit('health:check', health);
    
    // Log warnings for potential issues
    if (health.successRate < 0.8 && this.metrics.tasksCompleted > 10) {
      logger.warn(`⚠️ Low success rate for ${this.name}: ${health.successRate}`);
    }
    
    if (Date.now() - health.lastActivity.getTime() > 300000) { // 5 minutes
      logger.warn(`⚠️ Agent ${this.name} inactive for 5+ minutes`);
    }
  }

  // Initialize learning system
  async initializeLearning() {
    try {
      // Load learning models and data
      this.learningData = new Map();
      this.patterns = new Map();
      
      logger.info(`🧠 Learning system initialized for ${this.name}`);
    } catch (error) {
      logger.error(`Error initializing learning for ${this.name}:`, error);
    }
  }

  // Learn from task execution
  async learnFromTask(task, result, success) {
    try {
      const learningKey = `${task.type}_${success ? 'success' : 'failure'}`;
      
      if (!this.learningData.has(learningKey)) {
        this.learningData.set(learningKey, []);
      }
      
      this.learningData.get(learningKey).push({
        task,
        result: success ? result : result.message,
        timestamp: new Date()
      });
      
      // Update patterns
      await this.updatePatterns(task, result, success);
      
      logger.debug(`📚 Learning from task: ${learningKey}`);
    } catch (error) {
      logger.error(`Error learning from task:`, error);
    }
  }

  // Update patterns based on task execution
  async updatePatterns(task, result, success) {
    try {
      const patternKey = task.type;
      
      if (!this.patterns.has(patternKey)) {
        this.patterns.set(patternKey, {
          successCount: 0,
          failureCount: 0,
          averageTime: 0,
          commonErrors: new Map(),
          optimizations: []
        });
      }
      
      const pattern = this.patterns.get(patternKey);
      
      if (success) {
        pattern.successCount++;
      } else {
        pattern.failureCount++;
        
        // Track common errors
        const errorMessage = result.message;
        pattern.commonErrors.set(errorMessage, (pattern.commonErrors.get(errorMessage) || 0) + 1);
      }
      
      // Update optimization suggestions
      if (pattern.successCount > 10 && pattern.successCount / (pattern.successCount + pattern.failureCount) > 0.9) {
        pattern.optimizations.push({
          type: 'high_success_rate',
          suggestion: 'Consider increasing task complexity or scope'
        });
      }
      
    } catch (error) {
      logger.error(`Error updating patterns:`, error);
    }
  }

  // Get agent status
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      version: this.version,
      status: this.status,
      currentTask: this.currentTask,
      capabilities: this.capabilities,
      specializations: this.specializations,
      metrics: this.metrics,
      knowledgeBaseSize: this.knowledgeBase.size,
      learningDataSize: this.learningData?.size || 0,
      patternsSize: this.patterns?.size || 0
    };
  }

  // Get performance report
  getPerformanceReport() {
    const recentTasks = this.taskHistory.slice(-50); // Last 50 tasks
    
    return {
      agent: this.name,
      period: {
        start: recentTasks.length > 0 ? recentTasks[0].timestamp : new Date(),
        end: new Date()
      },
      metrics: this.metrics,
      recentTasks: {
        total: recentTasks.length,
        completed: recentTasks.filter(t => t.status === 'completed').length,
        failed: recentTasks.filter(t => t.status === 'failed').length,
        averageTime: recentTasks.reduce((sum, t) => sum + t.executionTime, 0) / recentTasks.length
      },
      patterns: Array.from(this.patterns.entries()).map(([key, pattern]) => ({
        taskType: key,
        ...pattern,
        commonErrors: Array.from(pattern.commonErrors.entries())
      })),
      recommendations: this.generateRecommendations()
    };
  }

  // Generate performance recommendations
  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.successRate < 0.8) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Success rate is below 80%. Review task handling logic.'
      });
    }
    
    if (this.metrics.averageTaskTime > 10000) { // 10 seconds
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Average task time is high. Consider optimization.'
      });
    }
    
    if (this.getCurrentTaskCount() >= this.config.maxConcurrentTasks) {
      recommendations.push({
        type: 'capacity',
        priority: 'medium',
        message: 'Agent frequently at maximum capacity. Consider scaling.'
      });
    }
    
    return recommendations;
  }

  // Update knowledge base
  updateKnowledge(key, value) {
    this.knowledgeBase.set(key, value);
    this.emit('knowledge:updated', { key, value });
  }

  // Get knowledge
  getKnowledge(key) {
    return this.knowledgeBase.get(key);
  }

  // Search knowledge base
  searchKnowledge(query) {
    const results = [];
    
    for (const [key, value] of this.knowledgeBase.entries()) {
      if (key.toLowerCase().includes(query.toLowerCase()) ||
          JSON.stringify(value).toLowerCase().includes(query.toLowerCase())) {
        results.push({ key, value });
      }
    }
    
    return results;
  }

  // Store memory
  storeMemory(key, value) {
    this.memory.set(key, {
      value,
      timestamp: new Date(),
      accessCount: 0
    });
  }

  // Retrieve memory
  retrieveMemory(key) {
    const memory = this.memory.get(key);
    if (memory) {
      memory.accessCount++;
      memory.lastAccessed = new Date();
    }
    return memory?.value;
  }

  // Generate unique ID
  generateId() {
    return `${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup resources
  async cleanup() {
    try {
      logger.info(`🧹 Cleaning up agent: ${this.name}`);
      
      this.status = 'shutting_down';
      
      // Clear event listeners
      this.removeAllListeners();
      
      // Clear memory
      this.knowledgeBase.clear();
      this.memory.clear();
      this.learningData?.clear();
      this.patterns?.clear();
      
      this.status = 'shutdown';
      
      logger.info(`✅ Agent cleaned up: ${this.name}`);
    } catch (error) {
      logger.error(`Error cleaning up agent ${this.name}:`, error);
    }
  }

  // Restart agent
  async restart() {
    try {
      logger.info(`🔄 Restarting agent: ${this.name}`);
      
      await this.cleanup();
      await this.initialize();
      
      logger.info(`✅ Agent restarted: ${this.name}`);
    } catch (error) {
      logger.error(`Error restarting agent ${this.name}:`, error);
    }
  }
}

module.exports = BaseAgent;
