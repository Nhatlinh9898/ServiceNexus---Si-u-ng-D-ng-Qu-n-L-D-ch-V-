const EventEmitter = require('events');
const TableDataAgent = require('./tableDataAgent');
const ColumnAgent = require('./columnAgent');
const RowAgent = require('./rowAgent');
const VisualizationAgent = require('./visualizationAgent');

class AIOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.workflows = new Map();
    this.taskQueue = [];
    this.isProcessing = false;
    this.results = new Map();
    this.performance = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageProcessingTime: 0
    };
    
    this.initializeAgents();
    this.initializeWorkflows();
  }

  // Initialize all AI agents
  initializeAgents() {
    try {
      // Initialize Table Data Agent
      const tableAgent = new TableDataAgent();
      this.agents.set('tableData', {
        instance: tableAgent,
        capabilities: [
          'parse_table', 'analyze_table', 'matrix_operations',
          'correlation_analysis', 'data_validation', 'format_conversion'
        ],
        status: 'ready'
      });

      // Initialize Column Agent
      const columnAgent = new ColumnAgent();
      this.agents.set('column', {
        instance: columnAgent,
        capabilities: [
          'column_analysis', 'statistical_analysis', 'pattern_detection',
          'anomaly_detection', 'distribution_analysis', 'quality_assessment'
        ],
        status: 'ready'
      });

      // Initialize Row Agent
      const rowAgent = new RowAgent();
      this.agents.set('row', {
        instance: rowAgent,
        capabilities: [
          'row_analysis', 'similarity_detection', 'profiling',
          'comparison_analysis', 'anomaly_detection', 'pattern_recognition'
        ],
        status: 'ready'
      });

      // Initialize Visualization Agent
      const vizAgent = new VisualizationAgent();
      this.agents.set('visualization', {
        instance: vizAgent,
        capabilities: [
          'chart_generation', 'diagram_creation', 'architecture_design',
          '3d_modeling', 'export_visualization', 'interactive_display'
        ],
        status: 'ready'
      });

      console.log('✅ All AI agents initialized successfully');
      this.emit('agentsInitialized', Array.from(this.agents.keys()));
    } catch (error) {
      console.error('❌ Failed to initialize agents:', error);
      this.emit('error', { type: 'initialization', error });
    }
  }

  // Initialize predefined workflows
  initializeWorkflows() {
    // Comprehensive Data Analysis Workflow
    this.workflows.set('comprehensive_analysis', {
      name: 'Comprehensive Data Analysis',
      description: 'Complete analysis of tabular data with visualizations',
      steps: [
        { agent: 'tableData', action: 'parse_table', required: true },
        { agent: 'tableData', action: 'analyze_table', required: true },
        { agent: 'column', action: 'column_analysis', required: true },
        { agent: 'row', action: 'row_analysis', required: true },
        { agent: 'visualization', action: 'chart_generation', required: false },
        { agent: 'visualization', action: 'diagram_creation', required: false }
      ]
    });

    // Quick Analysis Workflow
    this.workflows.set('quick_analysis', {
      name: 'Quick Data Analysis',
      description: 'Fast analysis with basic insights',
      steps: [
        { agent: 'tableData', action: 'parse_table', required: true },
        { agent: 'tableData', action: 'analyze_table', required: true },
        { agent: 'visualization', action: 'chart_generation', required: false }
      ]
    });

    // Deep Dive Workflow
    this.workflows.set('deep_dive', {
      name: 'Deep Dive Analysis',
      description: 'In-depth analysis with pattern detection',
      steps: [
        { agent: 'tableData', action: 'parse_table', required: true },
        { agent: 'tableData', action: 'analyze_table', required: true },
        { agent: 'column', action: 'column_analysis', required: true },
        { agent: 'column', action: 'pattern_detection', required: true },
        { agent: 'row', action: 'row_analysis', required: true },
        { agent: 'row', action: 'similarity_detection', required: true },
        { agent: 'visualization', action: 'chart_generation', required: false },
        { agent: 'visualization', action: 'diagram_creation', required: false }
      ]
    });

    // Visualization Workflow
    this.workflows.set('visualization_only', {
      name: 'Visualization Only',
      description: 'Generate visualizations from existing data',
      steps: [
        { agent: 'visualization', action: 'chart_generation', required: true },
        { agent: 'visualization', action: 'diagram_creation', required: false }
      ]
    });

    console.log('✅ Workflows initialized successfully');
  }

  // Execute a workflow
  async executeWorkflow(workflowName, data, options = {}) {
    try {
      const workflow = this.workflows.get(workflowName);
      if (!workflow) {
        throw new Error(`Workflow '${workflowName}' not found`);
      }

      const taskId = this.generateTaskId();
      const task = {
        id: taskId,
        workflow: workflowName,
        data: data,
        options: options,
        startTime: Date.now(),
        status: 'pending',
        steps: [],
        results: {}
      };

      this.taskQueue.push(task);
      this.processQueue();

      return taskId;
    } catch (error) {
      console.error('❌ Workflow execution failed:', error);
      throw error;
    }
  }

  // Process the task queue
  async processQueue() {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      await this.executeTask(task);
    }

    this.isProcessing = false;
  }

  // Execute a single task
  async executeTask(task) {
    try {
      task.status = 'running';
      this.emit('taskStarted', task);

      const workflow = this.workflows.get(task.workflow);
      
      for (const step of workflow.steps) {
        const stepResult = await this.executeStep(task, step);
        task.steps.push(stepResult);
        task.results[step.agent] = task.results[step.agent] || {};
        task.results[step.agent][step.action] = stepResult.data;

        // Emit progress update
        this.emit('stepCompleted', {
          taskId: task.id,
          step: stepResult,
          progress: (task.steps.length / workflow.steps.length) * 100
        });
      }

      task.status = 'completed';
      task.endTime = Date.now();
      task.duration = task.endTime - task.startTime;

      this.results.set(task.id, task);
      this.updatePerformance(task);

      this.emit('taskCompleted', task);
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      task.endTime = Date.now();

      this.emit('taskFailed', task);
      console.error('❌ Task execution failed:', error);
    }
  }

  // Execute a single step
  async executeStep(task, step) {
    const startTime = Date.now();
    const agent = this.agents.get(step.agent);
    
    if (!agent) {
      throw new Error(`Agent '${step.agent}' not found`);
    }

    if (!agent.capabilities.includes(step.action)) {
      throw new Error(`Agent '${step.agent}' cannot perform action '${step.action}'`);
    }

    try {
      let result;
      const data = this.prepareDataForStep(task, step);

      switch (step.agent) {
        case 'tableData':
          result = await this.executeTableDataStep(agent.instance, step.action, data, task.options);
          break;
        case 'column':
          result = await this.executeColumnStep(agent.instance, step.action, data, task.options);
          break;
        case 'row':
          result = await this.executeRowStep(agent.instance, step.action, data, task.options);
          break;
        case 'visualization':
          result = await this.executeVisualizationStep(agent.instance, step.action, data, task.options);
          break;
        default:
          throw new Error(`Unknown agent: ${step.agent}`);
      }

      return {
        agent: step.agent,
        action: step.action,
        data: result,
        duration: Date.now() - startTime,
        status: 'success'
      };
    } catch (error) {
      return {
        agent: step.agent,
        action: step.action,
        error: error.message,
        duration: Date.now() - startTime,
        status: 'failed'
      };
    }
  }

  // Prepare data for specific step
  prepareDataForStep(task, step) {
    // Use previous results if available
    if (step.agent === 'column' || step.agent === 'row') {
      return task.results.tableData?.analyze_table || task.data;
    }
    
    if (step.agent === 'visualization') {
      // Combine results from all agents for visualization
      return {
        originalData: task.data,
        analysis: task.results.tableData?.analyze_table,
        columnAnalysis: task.results.column?.column_analysis,
        rowAnalysis: task.results.row?.row_analysis
      };
    }

    return task.data;
  }

  // Execute Table Data Agent steps
  async executeTableDataStep(agent, action, data, options) {
    switch (action) {
      case 'parse_table':
        return await agent.parseTableData(data, options.format || 'auto');
      case 'analyze_table':
        return await agent.analyzeTable(data, options.analysisType || 'comprehensive');
      case 'matrix_operations':
        return await agent.matrixMultiply(data.matrixA, data.matrixB);
      case 'correlation_analysis':
        return await agent.correlationMatrix(data);
      case 'data_validation':
        return await agent.validateTableData(data);
      case 'format_conversion':
        return await agent.tableToMatrix(data, options.includeHeaders);
      default:
        throw new Error(`Unknown table data action: ${action}`);
    }
  }

  // Execute Column Agent steps
  async executeColumnStep(agent, action, data, options) {
    const columnName = options.columnName || Object.keys(data[0] || {})[0];
    
    switch (action) {
      case 'column_analysis':
        return await agent.analyzeColumn(data, columnName, options.analysisType || 'comprehensive');
      case 'statistical_analysis':
        return await agent.getColumnStatistics(data, columnName);
      case 'pattern_detection':
        return await agent.detectColumnPatterns(data, columnName);
      case 'anomaly_detection':
        return await agent.detectColumnAnomalies(data, columnName);
      case 'distribution_analysis':
        return await agent.analyzeColumnDistribution(data, columnName);
      case 'quality_assessment':
        return await agent.assessColumnQuality(data, columnName);
      default:
        throw new Error(`Unknown column action: ${action}`);
    }
  }

  // Execute Row Agent steps
  async executeRowStep(agent, action, data, options) {
    const rowIndex = options.rowIndex || 0;
    
    switch (action) {
      case 'row_analysis':
        return await agent.analyzeRow(data, rowIndex, options.analysisType || 'comprehensive');
      case 'similarity_detection':
        return await agent.findSimilarRows(data[rowIndex], data);
      case 'profiling':
        return await agent.getRowProfile(data[rowIndex]);
      case 'comparison_analysis':
        return await agent.compareRowToDataset(data[rowIndex], data);
      case 'anomaly_detection':
        return await agent.detectRowAnomalies(data[rowIndex], data);
      case 'pattern_recognition':
        return await agent.recognizeRowPatterns(data[rowIndex], data);
      default:
        throw new Error(`Unknown row action: ${action}`);
    }
  }

  // Execute Visualization Agent steps
  async executeVisualizationStep(agent, action, data, options) {
    switch (action) {
      case 'chart_generation':
        return await agent.generateChart(data.originalData || data, {
          type: options.chartType || 'bar',
          title: options.title || 'Data Visualization',
          ...options
        });
      case 'diagram_creation':
        return await agent.generateDiagram(data, {
          type: options.diagramType || 'flowchart',
          title: options.title || 'Process Diagram',
          ...options
        });
      case 'architecture_design':
        return await agent.generateArchitecture(data, {
          type: options.archType || 'system',
          title: options.title || 'System Architecture',
          ...options
        });
      case '3d_modeling':
        return await agent.generateModel(data, {
          type: '3d',
          title: options.title || '3D Model',
          ...options
        });
      case 'export_visualization':
        return await agent.exportVisualization(data.id, options.format);
      case 'interactive_display':
        return await agent.createInteractiveDisplay(data, options);
      default:
        throw new Error(`Unknown visualization action: ${action}`);
    }
  }

  // Get task status
  getTaskStatus(taskId) {
    const task = this.results.get(taskId);
    if (!task) {
      const queuedTask = this.taskQueue.find(t => t.id === taskId);
      return queuedTask ? { status: 'queued', task: queuedTask } : null;
    }
    return task;
  }

  // Get all tasks
  getAllTasks() {
    const completedTasks = Array.from(this.results.values());
    const queuedTasks = this.taskQueue.map(task => ({ ...task, status: 'queued' }));
    return [...queuedTasks, ...completedTasks];
  }

  // Cancel task
  cancelTask(taskId) {
    const queueIndex = this.taskQueue.findIndex(task => task.id === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue.splice(queueIndex, 1)[0];
      task.status = 'cancelled';
      this.emit('taskCancelled', task);
      return true;
    }
    return false;
  }

  // Get agent status
  getAgentStatus() {
    const status = {};
    for (const [name, agent] of this.agents) {
      status[name] = {
        capabilities: agent.capabilities,
        status: agent.status,
        lastUsed: agent.lastUsed || null
      };
    }
    return status;
  }

  // Get available workflows
  getAvailableWorkflows() {
    const workflows = {};
    for (const [name, workflow] of this.workflows) {
      workflows[name] = {
        name: workflow.name,
        description: workflow.description,
        steps: workflow.steps.length,
        estimatedTime: this.estimateWorkflowTime(workflow)
      };
    }
    return workflows;
  }

  // Estimate workflow execution time
  estimateWorkflowTime(workflow) {
    const stepTimes = {
      'tableData': 2000,
      'column': 1500,
      'row': 1500,
      'visualization': 3000
    };

    return workflow.steps.reduce((total, step) => {
      return total + (stepTimes[step.agent] || 1000);
    }, 0);
  }

  // Update performance metrics
  updatePerformance(task) {
    this.performance.totalTasks++;
    
    if (task.status === 'completed') {
      this.performance.completedTasks++;
      this.performance.averageProcessingTime = 
        (this.performance.averageProcessingTime * (this.performance.completedTasks - 1) + task.duration) 
        / this.performance.completedTasks;
    } else {
      this.performance.failedTasks++;
    }
  }

  // Get performance metrics
  getPerformance() {
    return { ...this.performance };
  }

  // Generate unique task ID
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Health check
  async healthCheck() {
    const health = {
      status: 'healthy',
      agents: {},
      workflows: this.workflows.size,
      queue: this.taskQueue.length,
      performance: this.performance
    };

    for (const [name, agent] of this.agents) {
      try {
        // Simple health check - try to access agent
        agent.instance.constructor.name;
        health.agents[name] = 'healthy';
      } catch (error) {
        health.agents[name] = 'unhealthy';
        health.status = 'degraded';
      }
    }

    return health;
  }

  // Cleanup resources
  async cleanup() {
    this.taskQueue = [];
    this.results.clear();
    this.removeAllListeners();
    
    // Cleanup agents if they have cleanup methods
    for (const agent of this.agents.values()) {
      if (agent.instance && typeof agent.instance.cleanup === 'function') {
        await agent.instance.cleanup();
      }
    }
    
    console.log('✅ AI Orchestrator cleaned up successfully');
  }
}

module.exports = AIOrchestrator;
