// Machine Learning API Routes
// Provides endpoints for ML predictions, recommendations, and anomaly detection

const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');
const PredictionEngine = require('../ml/predictionEngine');
const RecommendationSystem = require('../ml/recommendationSystem');
const AnomalyDetection = require('../ml/anomalyDetection');
const logger = require('../utils/logger');

// Initialize ML systems
const predictionEngine = new PredictionEngine();
const recommendationSystem = new RecommendationSystem();
const anomalyDetection = new AnomalyDetection();

// Middleware to check if user has access to ML features
const checkMLAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if organization has ML features enabled
  if (req.user.organization.subscriptionPlan !== 'enterprise' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'ML features require enterprise plan' });
  }
  
  next();
};

// Apply rate limiting to ML endpoints
router.use(rateLimiter.createMLRateLimiter());

// Prediction Engine Routes

// Predict service completion
router.post('/predictions/service-completion', checkMLAccess, async (req, res) => {
  try {
    const { serviceData } = req.body;
    
    if (!serviceData) {
      return res.status(400).json({ error: 'Service data is required' });
    }
    
    const prediction = await predictionEngine.predictServiceCompletion(serviceData);
    
    if (!prediction) {
      return res.status(500).json({ error: 'Failed to generate prediction' });
    }
    
    res.json({
      success: true,
      prediction,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error in service completion prediction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forecast revenue
router.post('/predictions/revenue-forecast', checkMLAccess, async (req, res) => {
  try {
    const { organizationId, timeHorizon } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }
    
    // Check if user has access to this organization's data
    if (req.user.role !== 'ADMIN' && req.user.organization.id !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const forecast = await predictionEngine.forecastRevenue(organizationId, timeHorizon);
    
    if (!forecast) {
      return res.status(500).json({ error: 'Failed to generate forecast' });
    }
    
    res.json({
      success: true,
      forecast,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error in revenue forecasting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Predict customer churn
router.post('/predictions/customer-churn', checkMLAccess, async (req, res) => {
  try {
    const { organizationId } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }
    
    // Check access
    if (req.user.role !== 'ADMIN' && req.user.organization.id !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const churnPredictions = await predictionEngine.predictCustomerChurn(organizationId);
    
    res.json({
      success: true,
      predictions: churnPredictions,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error in customer churn prediction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Predict service demand
router.post('/predictions/service-demand', checkMLAccess, async (req, res) => {
  try {
    const { organizationId, timeHorizon } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }
    
    // Check access
    if (req.user.role !== 'ADMIN' && req.user.organization.id !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const demandPrediction = await predictionEngine.predictServiceDemand(organizationId, timeHorizon);
    
    if (!demandPrediction) {
      return res.status(500).json({ error: 'Failed to generate demand prediction' });
    }
    
    res.json({
      success: true,
      prediction: demandPrediction,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error in service demand prediction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Detect anomalies
router.post('/anomalies/detect', checkMLAccess, async (req, res) => {
  try {
    const { type, organizationId, timeWindow } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: 'Anomaly type is required' });
    }
    
    let result;
    
    switch (type) {
      case 'service':
        if (!organizationId) {
          return res.status(400).json({ error: 'Organization ID is required for service anomalies' });
        }
        
        // Check access
        if (req.user.role !== 'ADMIN' && req.user.organization.id !== organizationId) {
          return res.status(403).json({ error: 'Access denied' });
        }
        
        result = await anomalyDetection.detectServiceAnomalies(organizationId, timeWindow);
        break;
        
      case 'user':
        result = await anomalyDetection.detectUserAnomalies(req.user.id, timeWindow);
        break;
        
      case 'financial':
        if (!organizationId) {
          return res.status(400).json({ error: 'Organization ID is required for financial anomalies' });
        }
        
        // Check access
        if (req.user.role !== 'ADMIN' && req.user.organization.id !== organizationId) {
          return res.status(403).json({ error: 'Access denied' });
        }
        
        result = await anomalyDetection.detectFinancialAnomalies(organizationId, timeWindow);
        break;
        
      case 'system':
        if (req.user.role !== 'ADMIN') {
          return res.status(403).json({ error: 'Admin access required for system anomalies' });
        }
        
        result = await anomalyDetection.detectSystemAnomalies();
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid anomaly type' });
    }
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error in anomaly detection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recommendation System Routes

// Get service recommendations
router.get('/recommendations/services', checkMLAccess, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recommendations = await recommendationSystem.getServiceRecommendations(
      req.user.id,
      parseInt(limit)
    );
    
    res.json({
      success: true,
      recommendations,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting service recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user recommendations
router.get('/recommendations/users', checkMLAccess, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const recommendations = await recommendationSystem.getUserRecommendations(
      req.user.id,
      parseInt(limit)
    );
    
    res.json({
      success: true,
      recommendations,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting user recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get department recommendations
router.get('/recommendations/departments/:departmentId', checkMLAccess, async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { limit = 10 } = req.query;
    
    // Check if user has access to this department
    if (req.user.role !== 'ADMIN' && 
        (!req.user.department || req.user.department.id !== departmentId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const recommendations = await recommendationSystem.getDepartmentRecommendations(
      departmentId,
      parseInt(limit)
    );
    
    if (!recommendations) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json({
      success: true,
      recommendations,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting department recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sentiment Analysis
router.post('/sentiment/analyze', checkMLAccess, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required for sentiment analysis' });
    }
    
    const sentiment = await predictionEngine.analyzeSentiment(text);
    
    if (!sentiment) {
      return res.status(500).json({ error: 'Failed to analyze sentiment' });
    }
    
    res.json({
      success: true,
      sentiment,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error in sentiment analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Model Management Routes (Admin only)

// Get model metrics
router.get('/models/metrics', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const metrics = predictionEngine.getModelMetrics();
    
    res.json({
      success: true,
      metrics,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting model metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update models
router.post('/models/update', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { modelType } = req.body;
    
    if (modelType) {
      // Update specific model
      switch (modelType) {
        case 'prediction':
          await predictionEngine.loadModels();
          break;
        case 'recommendation':
          await recommendationSystem.updateModels();
          break;
        case 'anomaly':
          await anomalyDetection.updateModels();
          break;
        default:
          return res.status(400).json({ error: 'Invalid model type' });
      }
    } else {
      // Update all models
      await Promise.all([
        predictionEngine.loadModels(),
        recommendationSystem.updateModels(),
        anomalyDetection.updateModels()
      ]);
    }
    
    res.json({
      success: true,
      message: 'Models updated successfully',
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error updating models:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear caches
router.post('/cache/clear', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { cacheType } = req.body;
    
    if (cacheType) {
      // Clear specific cache
      switch (cacheType) {
        case 'prediction':
          predictionEngine.predictionCache.clear();
          break;
        case 'recommendation':
          recommendationSystem.clearCache();
          break;
        case 'anomaly':
          anomalyDetection.clearCache();
          break;
        default:
          return res.status(400).json({ error: 'Invalid cache type' });
      }
    } else {
      // Clear all caches
      predictionEngine.predictionCache.clear();
      recommendationSystem.clearCache();
      anomalyDetection.clearCache();
    }
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check for ML systems
router.get('/health', async (req, res) => {
  try {
    const health = {
      predictionEngine: !!predictionEngine.models.size > 0,
      recommendationSystem: !!recommendationSystem.userItemMatrix,
      anomalyDetection: !!anomalyDetection.models.size > 0,
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
    logger.error('Error in ML health check:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

// Batch prediction endpoint
router.post('/predictions/batch', checkMLAccess, async (req, res) => {
  try {
    const { predictions } = req.body;
    
    if (!Array.isArray(predictions) || predictions.length === 0) {
      return res.status(400).json({ error: 'Predictions array is required' });
    }
    
    if (predictions.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 predictions per batch' });
    }
    
    const results = await Promise.all(
      predictions.map(async (prediction) => {
        try {
          switch (prediction.type) {
            case 'service_completion':
              return await predictionEngine.predictServiceCompletion(prediction.data);
            case 'sentiment':
              return await predictionEngine.analyzeSentiment(prediction.data.text);
            default:
              return { error: 'Invalid prediction type' };
          }
        } catch (error) {
          return { error: error.message };
        }
      })
    );
    
    res.json({
      success: true,
      results,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error in batch prediction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export ML data
router.get('/export/:type', checkMLAccess, async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json', organizationId } = req.query;
    
    // Check access for organization-specific exports
    if (organizationId && req.user.role !== 'ADMIN' && req.user.organization.id !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    let data;
    
    switch (type) {
      case 'predictions':
        // Export prediction history
        data = await this.exportPredictionHistory(organizationId);
        break;
      case 'recommendations':
        // Export recommendation data
        data = await this.exportRecommendationData(organizationId);
        break;
      case 'anomalies':
        // Export anomaly data
        data = await this.exportAnomalyData(organizationId);
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }
    
    if (format === 'csv') {
      // Convert to CSV and send
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_export.csv"`);
      return res.send(this.convertToCSV(data));
    }
    
    res.json({
      success: true,
      data,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error exporting ML data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions for export
async function exportPredictionHistory(organizationId) {
  // Implementation would query prediction history from database
  return [];
}

async function exportRecommendationData(organizationId) {
  // Implementation would query recommendation data from database
  return [];
}

async function exportAnomalyData(organizationId) {
  // Implementation would query anomaly data from database
  return [];
}

function convertToCSV(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}

// Graceful shutdown
const shutdown = async () => {
  try {
    await Promise.all([
      predictionEngine.cleanup(),
      anomalyDetection.cleanup()
    ]);
    
    logger.info('🔌 ML systems shut down gracefully');
  } catch (error) {
    logger.error('Error shutting down ML systems:', error);
  }
};

module.exports = {
  router,
  shutdown
};
