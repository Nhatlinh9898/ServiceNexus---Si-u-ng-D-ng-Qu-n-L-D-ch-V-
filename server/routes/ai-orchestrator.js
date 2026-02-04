const express = require('express');
const AIOrchestrator = require('../services/aiOrchestrator');
const router = express.Router();

// Initialize AI Orchestrator
const orchestrator = new AIOrchestrator();

// Event listeners for real-time updates
orchestrator.on('agentsInitialized', (agents) => {
  console.log('🤖 AI Agents initialized:', agents);
});

orchestrator.on('taskStarted', (task) => {
  console.log(`🚀 Task started: ${task.id} (${task.workflow})`);
});

orchestrator.on('stepCompleted', (data) => {
  console.log(`✅ Step completed: ${data.step.agent}.${data.step.action} (${data.progress.toFixed(1)}%)`);
});

orchestrator.on('taskCompleted', (task) => {
  console.log(`🎉 Task completed: ${task.id} in ${task.duration}ms`);
});

orchestrator.on('taskFailed', (task) => {
  console.error(`❌ Task failed: ${task.id} - ${task.error}`);
});

orchestrator.on('taskCancelled', (task) => {
  console.log(`🛑 Task cancelled: ${task.id}`);
});

orchestrator.on('error', (error) => {
  console.error('🚨 Orchestrator error:', error);
});

// Middleware for request validation
const validateRequest = (req, res, next) => {
  try {
    if (!req.body && req.method !== 'GET') {
      return res.status(400).json({
        success: false,
        error: 'Request body is required'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Request validation failed'
    });
  }
};

// Execute workflow
router.post('/execute', validateRequest, async (req, res) => {
  try {
    const { workflow, data, options = {} } = req.body;
    
    if (!workflow) {
      return res.status(400).json({
        success: false,
        error: 'Workflow name is required'
      });
    }

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for workflow execution'
      });
    }

    console.log(`🔄 Executing workflow: ${workflow}`);
    const taskId = await orchestrator.executeWorkflow(workflow, data, options);
    
    res.json({
      success: true,
      data: {
        taskId: taskId,
        workflow: workflow,
        status: 'queued'
      },
      message: 'Workflow queued for execution'
    });
  } catch (error) {
    console.error('❌ Workflow execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get task status
router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Task ID is required'
      });
    }

    const taskStatus = orchestrator.getTaskStatus(taskId);
    
    if (!taskStatus) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: taskStatus,
      message: 'Task status retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Task status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all tasks
router.get('/tasks', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let tasks = orchestrator.getAllTasks();
    
    // Filter by status if provided
    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }
    
    // Apply pagination
    const paginatedTasks = tasks.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      success: true,
      data: {
        tasks: paginatedTasks,
        total: tasks.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      },
      message: 'Tasks retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Tasks retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel task
router.delete('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Task ID is required'
      });
    }

    const cancelled = orchestrator.cancelTask(taskId);
    
    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or cannot be cancelled'
      });
    }

    res.json({
      success: true,
      data: { taskId: taskId },
      message: 'Task cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Task cancellation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get agent status
router.get('/agents', async (req, res) => {
  try {
    const agentStatus = orchestrator.getAgentStatus();
    
    res.json({
      success: true,
      data: agentStatus,
      message: 'Agent status retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Agent status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available workflows
router.get('/workflows', async (req, res) => {
  try {
    const workflows = orchestrator.getAvailableWorkflows();
    
    res.json({
      success: true,
      data: workflows,
      message: 'Workflows retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Workflows retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get performance metrics
router.get('/performance', async (req, res) => {
  try {
    const performance = orchestrator.getPerformance();
    
    res.json({
      success: true,
      data: performance,
      message: 'Performance metrics retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    const health = await orchestrator.healthCheck();
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status === 'healthy',
      data: health,
      message: `System status: ${health.status}`
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Execute specific agent action
router.post('/agent/:agentName/:action', validateRequest, async (req, res) => {
  try {
    const { agentName, action } = req.params;
    const { data, options = {} } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for agent action'
      });
    }

    // Create a single-step workflow for direct agent execution
    const taskId = await orchestrator.executeWorkflow('quick_analysis', data, {
      ...options,
      directExecution: true,
      targetAgent: agentName,
      targetAction: action
    });
    
    res.json({
      success: true,
      data: {
        taskId: taskId,
        agent: agentName,
        action: action,
        status: 'queued'
      },
      message: 'Agent action queued for execution'
    });
  } catch (error) {
    console.error('❌ Agent action error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch execute multiple workflows
router.post('/batch', validateRequest, async (req, res) => {
  try {
    const { workflows } = req.body;
    
    if (!Array.isArray(workflows) || workflows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Workflows array is required'
      });
    }

    console.log(`🔄 Starting batch execution for ${workflows.length} workflows`);
    
    const taskIds = [];
    for (const workflowConfig of workflows) {
      try {
        const taskId = await orchestrator.executeWorkflow(
          workflowConfig.workflow,
          workflowConfig.data,
          workflowConfig.options || {}
        );
        taskIds.push({
          ...workflowConfig,
          taskId: taskId,
          status: 'queued'
        });
      } catch (error) {
        taskIds.push({
          ...workflowConfig,
          taskId: null,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        submitted: taskIds.length,
        successful: taskIds.filter(t => t.status === 'queued').length,
        failed: taskIds.filter(t => t.status === 'failed').length,
        taskIds: taskIds
      },
      message: 'Batch workflows submitted'
    });
  } catch (error) {
    console.error('❌ Batch execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const agentStatus = orchestrator.getAgentStatus();
    const performance = orchestrator.getPerformance();
    const workflows = orchestrator.getAvailableWorkflows();
    const tasks = orchestrator.getAllTasks();
    
    const stats = {
      agents: {
        total: Object.keys(agentStatus).length,
        healthy: Object.values(agentStatus).filter(status => status.status === 'ready').length,
        details: agentStatus
      },
      workflows: {
        total: Object.keys(workflows).length,
        available: workflows
      },
      tasks: {
        total: tasks.length,
        queued: tasks.filter(t => t.status === 'queued').length,
        running: tasks.filter(t => t.status === 'running').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length
      },
      performance: performance,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    };
    
    res.json({
      success: true,
      data: stats,
      message: 'System statistics retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create custom workflow
router.post('/workflow/create', validateRequest, async (req, res) => {
  try {
    const { name, description, steps } = req.body;
    
    if (!name || !description || !Array.isArray(steps)) {
      return res.status(400).json({
        success: false,
        error: 'Name, description, and steps are required'
      });
    }

    // Validate steps
    const agentStatus = orchestrator.getAgentStatus();
    for (const step of steps) {
      if (!step.agent || !step.action) {
        return res.status(400).json({
          success: false,
          error: 'Each step must have agent and action'
        });
      }
      
      const agent = agentStatus[step.agent];
      if (!agent) {
        return res.status(400).json({
          success: false,
          error: `Agent '${step.agent}' not found`
        });
      }
      
      if (!agent.capabilities.includes(step.action)) {
        return res.status(400).json({
          success: false,
          error: `Agent '${step.agent}' cannot perform action '${step.action}'`
        });
      }
    }

    // Add custom workflow to orchestrator
    orchestrator.workflows.set(name, {
      name: name,
      description: description,
      steps: steps,
      custom: true
    });
    
    res.json({
      success: true,
      data: {
        name: name,
        description: description,
        steps: steps,
        estimatedTime: orchestrator.estimateWorkflowTime({ steps })
      },
      message: 'Custom workflow created successfully'
    });
  } catch (error) {
    console.error('❌ Workflow creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete custom workflow
router.delete('/workflow/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Workflow name is required'
      });
    }

    const workflow = orchestrator.workflows.get(name);
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    if (!workflow.custom) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete built-in workflows'
      });
    }

    orchestrator.workflows.delete(name);
    
    res.json({
      success: true,
      data: { name: name },
      message: 'Custom workflow deleted successfully'
    });
  } catch (error) {
    console.error('❌ Workflow deletion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cleanup resources
router.post('/cleanup', async (req, res) => {
  try {
    await orchestrator.cleanup();
    
    res.json({
      success: true,
      message: 'AI Orchestrator cleaned up successfully'
    });
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// WebSocket endpoint for real-time updates (would need Socket.io implementation)
router.get('/events', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'WebSocket endpoint for real-time updates',
      available: true,
      implementation: 'Socket.io required for full functionality'
    }
  });
});

module.exports = router;
