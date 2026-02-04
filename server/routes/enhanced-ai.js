// Enhanced AI Routes with Local AI Support
// AI-powered features with local fallback

const express = require('express');
const { AppError } = require('../middleware/errorHandler');
const aiServiceFactory = require('../../services/aiServiceFactory');
const AIModelManager = require('../../services/aiModelManager');
const AIPluginSystem = require('../../services/aiPluginSystem');

const router = express.Router();

// Initialize AI components
const modelManager = new AIModelManager();
const pluginSystem = new AIPluginSystem();

// Initialize AI Service Factory
aiServiceFactory.initialize({
  defaultService: process.env.GEMINI_API_KEY ? 'gemini' : 'local',
  local: {
    modelsPath: './models',
    cachePath: './cache/ai',
    enableOffline: true
  }
}).catch(console.error);

// AI operational advice (enhanced with local fallback)
router.post('/advice', async (req, res, next) => {
  try {
    const { query, context_data, organization_id, use_local = false } = req.body;
    
    if (!query) {
      return next(new AppError('Query is required', 400));
    }

    // Determine which service to use
    const serviceName = use_local || !process.env.GEMINI_API_KEY ? 'local' : 'gemini';
    
    const result = await aiServiceFactory.process({
      type: 'operational_advice',
      query,
      contextData: context_data,
      organization_id
    }, {
      service: serviceName
    });

    res.json({
      success: true,
      advice: result.response,
      model: result.model,
      confidence: result.confidence,
      fallback: result.fallback || false
    });

  } catch (error) {
    console.error('AI Advice Error:', error);
    next(new AppError('Failed to get AI advice', 500));
  }
});

// Business analysis
router.post('/analyze', async (req, res, next) => {
  try {
    const { data, analysis_type = 'general', use_local = false } = req.body;
    
    if (!data) {
      return next(new AppError('Data is required', 400));
    }

    const serviceName = use_local || !process.env.GEMINI_API_KEY ? 'local' : 'gemini';
    
    const result = await aiServiceFactory.process({
      type: 'business_analysis',
      data,
      analysisType: analysis_type
    }, {
      service: serviceName
    });

    res.json({
      success: true,
      analysis: result.response,
      model: result.model,
      confidence: result.confidence,
      fallback: result.fallback || false
    });

  } catch (error) {
    console.error('AI Analysis Error:', error);
    next(new AppError('Failed to analyze data', 500));
  }
});

// Content generation
router.post('/generate', async (req, res, next) => {
  try {
    const { content_type, context, use_local = false } = req.body;
    
    if (!content_type || !context) {
      return next(new AppError('Content type and context are required', 400));
    }

    const serviceName = use_local || !process.env.GEMINI_API_KEY ? 'local' : 'gemini';
    
    const result = await aiServiceFactory.process({
      type: 'content_generation',
      contentType: content_type,
      context
    }, {
      service: serviceName
    });

    res.json({
      success: true,
      content: result.response,
      model: result.model,
      confidence: result.confidence,
      fallback: result.fallback || false
    });

  } catch (error) {
    console.error('Content Generation Error:', error);
    next(new AppError('Failed to generate content', 500));
  }
});

// Get AI system status
router.get('/status', async (req, res, next) => {
  try {
    const status = aiServiceFactory.getStatus();
    const modelStatus = modelManager.getSystemStatus();
    const pluginStatus = {
      total: pluginSystem.plugins.size,
      loaded: pluginSystem.loadedPlugins.size
    };

    res.json({
      success: true,
      services: status,
      models: modelStatus,
      plugins: pluginStatus,
      has_api_key: !!process.env.GEMINI_API_KEY
    });

  } catch (error) {
    console.error('Status Error:', error);
    next(new AppError('Failed to get AI status', 500));
  }
});

// Model management endpoints
router.get('/models', async (req, res, next) => {
  try {
    const models = modelManager.getAvailableModels();
    res.json({ success: true, models });
  } catch (error) {
    next(new AppError('Failed to get models', 500));
  }
});

router.post('/models/:modelId/download', async (req, res, next) => {
  try {
    const { modelId } = req.params;
    const options = req.body || {};
    
    const model = await modelManager.downloadModel(modelId, options);
    res.json({ success: true, model });
  } catch (error) {
    next(new AppError('Failed to download model', 500));
  }
});

router.delete('/models/:modelId', async (req, res, next) => {
  try {
    const { modelId } = req.params;
    await modelManager.deleteModel(modelId);
    res.json({ success: true });
  } catch (error) {
    next(new AppError('Failed to delete model', 500));
  }
});

// Service management
router.get('/services', async (req, res, next) => {
  try {
    const services = aiServiceFactory.getAvailableServices();
    res.json({ success: true, services });
  } catch (error) {
    next(new AppError('Failed to get services', 500));
  }
});

router.post('/services/:serviceName/set-default', async (req, res, next) => {
  try {
    const { serviceName } = req.params;
    aiServiceFactory.setDefaultService(serviceName);
    res.json({ success: true, defaultService: serviceName });
  } catch (error) {
    next(new AppError('Failed to set default service', 500));
  }
});

// Plugin management
router.get('/plugins', async (req, res, next) => {
  try {
    const plugins = pluginSystem.getAvailablePlugins();
    res.json({ success: true, plugins });
  } catch (error) {
    next(new AppError('Failed to get plugins', 500));
  }
});

router.post('/plugins/:pluginName/register', async (req, res, next) => {
  try {
    const { pluginName } = req.params;
    const config = req.body || {};
    
    const plugin = await pluginSystem.registerPlugin(pluginName, config);
    res.json({ success: true, plugin });
  } catch (error) {
    next(new AppError('Failed to register plugin', 500));
  }
});

// Health check
router.get('/health', async (req, res, next) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        aiFactory: aiServiceFactory.getStatus().totalServices > 0,
        modelManager: modelManager.getSystemStatus().totalModels > 0,
        pluginSystem: pluginSystem.plugins.size >= 0
      },
      has_api_key: !!process.env.GEMINI_API_KEY
    };

    const isHealthy = Object.values(health.services).every(Boolean);
    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    next(new AppError('Health check failed', 500));
  }
});

// Batch processing
router.post('/batch', async (req, res, next) => {
  try {
    const { requests, use_local = false } = req.body;
    
    if (!Array.isArray(requests)) {
      return next(new AppError('Requests must be an array', 400));
    }

    const serviceName = use_local || !process.env.GEMINI_API_KEY ? 'local' : 'gemini';
    const results = [];

    for (const request of requests) {
      try {
        const result = await aiServiceFactory.process(request.input, {
          ...request.options,
          service: serviceName
        });
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      results,
      processed: results.length,
      successful: results.filter(r => r.success).length
    });

  } catch (error) {
    next(new AppError('Batch processing failed', 500));
  }
});

// AI capabilities
router.get('/capabilities', async (req, res, next) => {
  try {
    const capabilities = {
      text_generation: true,
      analysis: true,
      content_creation: true,
      business_intelligence: true,
      operational_advice: true,
      data_analysis: true,
      pattern_recognition: true,
      rule_processing: true,
      offline_mode: true,
      plugin_system: true,
      model_management: true
    };

    res.json({
      success: true,
      capabilities,
      default_model: aiServiceFactory.getStatus().defaultService
    });

  } catch (error) {
    next(new AppError('Failed to get capabilities', 500));
  }
});

module.exports = router;
