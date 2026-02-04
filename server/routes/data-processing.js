const express = require('express');
const DataProcessingAI = require('../services/dataProcessingAI');
const router = express.Router();

// Initialize Data Processing AI
const dataAI = new DataProcessingAI();

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

// Process data with AI
router.post('/process', validateRequest, async (req, res) => {
  try {
    const { data, options = {} } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for processing'
      });
    }

    console.log('🤖 Starting AI data processing...');
    const result = await dataAI.processData(data, options);
    
    res.json({
      success: true,
      data: result,
      message: 'Data processed successfully'
    });
  } catch (error) {
    console.error('❌ Data processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Analyze data
router.post('/analyze', validateRequest, async (req, res) => {
  try {
    const { data, algorithm = 'auto' } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for analysis'
      });
    }

    const result = await dataAI.analyzeData(data, algorithm);
    
    res.json({
      success: true,
      data: result,
      message: 'Data analysis completed'
    });
  } catch (error) {
    console.error('❌ Data analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Optimize data
router.post('/optimize', validateRequest, async (req, res) => {
  try {
    const { data, algorithm = 'auto' } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for optimization'
      });
    }

    const result = await dataAI.optimizeData(data, algorithm);
    
    res.json({
      success: true,
      data: result,
      message: 'Data optimization completed'
    });
  } catch (error) {
    console.error('❌ Data optimization error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Predict data
router.post('/predict', validateRequest, async (req, res) => {
  try {
    const { data, algorithm = 'auto' } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for prediction'
      });
    }

    const result = await dataAI.predictData(data, algorithm);
    
    res.json({
      success: true,
      data: result,
      message: 'Data prediction completed'
    });
  } catch (error) {
    console.error('❌ Data prediction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cluster data
router.post('/cluster', validateRequest, async (req, res) => {
  try {
    const { data, algorithm = 'auto' } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for clustering'
      });
    }

    const result = await dataAI.clusterData(data, algorithm);
    
    res.json({
      success: true,
      data: result,
      message: 'Data clustering completed'
    });
  } catch (error) {
    console.error('❌ Data clustering error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Detect anomalies
router.post('/detect-anomalies', validateRequest, async (req, res) => {
  try {
    const { data, algorithm = 'auto' } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for anomaly detection'
      });
    }

    const result = await dataAI.detectAnomalies(data, algorithm);
    
    res.json({
      success: true,
      data: result,
      message: 'Anomaly detection completed'
    });
  } catch (error) {
    console.error('❌ Anomaly detection error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save data to server storage
router.post('/save', validateRequest, async (req, res) => {
  try {
    const { data, filename } = req.body;
    
    if (!data || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Data and filename are required'
      });
    }

    const result = await dataAI.saveData(data, filename);
    
    res.json({
      success: true,
      data: result,
      message: 'Data saved successfully'
    });
  } catch (error) {
    console.error('❌ Data save error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Load data from server storage
router.get('/load/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
    }

    const result = await dataAI.loadData(filename);
    
    res.json({
      success: true,
      data: result,
      message: 'Data loaded successfully'
    });
  } catch (error) {
    console.error('❌ Data load error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List all saved data
router.get('/list', async (req, res) => {
  try {
    const result = await dataAI.listSavedData();
    
    res.json({
      success: true,
      data: result,
      message: 'Data list retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Data list error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete saved data
router.delete('/delete/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
    }

    const result = await dataAI.deleteData(filename);
    
    res.json({
      success: true,
      data: result,
      message: 'Data deleted successfully'
    });
  } catch (error) {
    console.error('❌ Data delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create backup
router.post('/backup', validateRequest, async (req, res) => {
  try {
    const { data, backupName } = req.body;
    
    if (!data || !backupName) {
      return res.status(400).json({
        success: false,
        error: 'Data and backup name are required'
      });
    }

    const result = await dataAI.createBackup(data, backupName);
    
    res.json({
      success: true,
      data: result,
      message: 'Backup created successfully'
    });
  } catch (error) {
    console.error('❌ Backup creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get system status
router.get('/status', async (req, res) => {
  try {
    const status = {
      service: 'Data Processing AI',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      capabilities: [
        'data_analysis',
        'data_optimization',
        'prediction',
        'clustering',
        'anomaly_detection',
        'data_storage',
        'backup_creation'
      ]
    };
    
    res.json({
      success: true,
      data: status,
      message: 'Status retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch processing endpoint
router.post('/batch-process', validateRequest, async (req, res) => {
  try {
    const { datasets, options = {} } = req.body;
    
    if (!Array.isArray(datasets) || datasets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Datasets array is required'
      });
    }

    console.log(`🤖 Starting batch processing for ${datasets.length} datasets...`);
    
    const results = [];
    for (let i = 0; i < datasets.length; i++) {
      const dataset = datasets[i];
      try {
        const result = await dataAI.processData(dataset.data, dataset.options || options);
        results.push({
          index: i,
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results: results
      },
      message: 'Batch processing completed'
    });
  } catch (error) {
    console.error('❌ Batch processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
