const express = require('express');
const VisualizationAgent = require('../services/visualizationAgent');
const router = express.Router();

// Initialize visualization agent
const vizAgent = new VisualizationAgent();

// Initialize directories on startup
vizAgent.initialize().catch(console.error);

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

// Generate chart
router.post('/chart', validateRequest, async (req, res) => {
  try {
    const { data, options = {} } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for chart generation'
      });
    }

    console.log('📊 Generating chart...');
    const result = await vizAgent.generateChart(data, options);
    
    res.json({
      success: true,
      data: result,
      message: 'Chart generated successfully'
    });
  } catch (error) {
    console.error('❌ Chart generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate diagram
router.post('/diagram', validateRequest, async (req, res) => {
  try {
    const { data, options = {} } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for diagram generation'
      });
    }

    console.log('📈 Generating diagram...');
    const result = await vizAgent.generateDiagram(data, options);
    
    res.json({
      success: true,
      data: result,
      message: 'Diagram generated successfully'
    });
  } catch (error) {
    console.error('❌ Diagram generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate architecture diagram
router.post('/architecture', validateRequest, async (req, res) => {
  try {
    const { data, options = {} } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for architecture generation'
      });
    }

    console.log('🏗️ Generating architecture diagram...');
    const result = await vizAgent.generateArchitecture(data, options);
    
    res.json({
      success: true,
      data: result,
      message: 'Architecture diagram generated successfully'
    });
  } catch (error) {
    console.error('❌ Architecture generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate 3D model
router.post('/model', validateRequest, async (req, res) => {
  try {
    const { data, options = {} } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for model generation'
      });
    }

    console.log('🎨 Generating 3D model...');
    const result = await vizAgent.generateModel(data, options);
    
    res.json({
      success: true,
      data: result,
      message: '3D model generated successfully'
    });
  } catch (error) {
    console.error('❌ Model generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List visualizations
router.get('/list', async (req, res) => {
  try {
    const { type } = req.query;
    const result = await vizAgent.listVisualizations(type);
    
    res.json({
      success: true,
      data: result.data,
      message: 'Visualizations listed successfully'
    });
  } catch (error) {
    console.error('❌ List visualizations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete visualization
router.delete('/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    if (!type || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Type and filename are required'
      });
    }

    const result = await vizAgent.deleteVisualization(filename, type);
    
    res.json({
      success: true,
      data: result,
      message: 'Visualization deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete visualization error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const result = await vizAgent.getStatistics();
    
    res.json({
      success: true,
      data: result.data,
      message: 'Statistics retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available chart types
router.get('/chart-types', async (req, res) => {
  try {
    const chartTypes = vizAgent.chartTypes;
    
    res.json({
      success: true,
      data: {
        chartTypes: chartTypes,
        count: chartTypes.length
      },
      message: 'Chart types retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Chart types error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available diagram types
router.get('/diagram-types', async (req, res) => {
  try {
    const diagramTypes = vizAgent.diagramTypes;
    
    res.json({
      success: true,
      data: {
        diagramTypes: diagramTypes,
        count: diagramTypes.length
      },
      message: 'Diagram types retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Diagram types error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available architecture types
router.get('/architecture-types', async (req, res) => {
  try {
    const architectureTypes = vizAgent.architectureTypes;
    
    res.json({
      success: true,
      data: {
        architectureTypes: architectureTypes,
        count: architectureTypes.length
      },
      message: 'Architecture types retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Architecture types error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch generate visualizations
router.post('/batch', validateRequest, async (req, res) => {
  try {
    const { visualizations } = req.body;
    
    if (!Array.isArray(visualizations) || visualizations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Visualizations array is required'
      });
    }

    console.log(`📊 Starting batch visualization generation for ${visualizations.length} items...`);
    
    const results = [];
    for (let i = 0; i < visualizations.length; i++) {
      const viz = visualizations[i];
      try {
        let result;
        switch (viz.type) {
          case 'chart':
            result = await vizAgent.generateChart(viz.data, viz.options);
            break;
          case 'diagram':
            result = await vizAgent.generateDiagram(viz.data, viz.options);
            break;
          case 'architecture':
            result = await vizAgent.generateArchitecture(viz.data, viz.options);
            break;
          case 'model':
            result = await vizAgent.generateModel(viz.data, viz.options);
            break;
          default:
            throw new Error(`Unknown visualization type: ${viz.type}`);
        }
        
        results.push({
          index: i,
          type: viz.type,
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          index: i,
          type: viz.type,
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
      message: 'Batch visualization generation completed'
    });
  } catch (error) {
    console.error('❌ Batch visualization error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate sample data for testing
router.post('/sample-data', async (req, res) => {
  try {
    const { type = 'chart', chartType = 'bar', count = 10 } = req.body;
    
    let sampleData;
    
    switch (type) {
      case 'chart':
        switch (chartType) {
          case 'bar':
          case 'line':
            sampleData = Array.from({ length: count }, (_, i) => ({
              x: `Item ${i + 1}`,
              y: Math.floor(Math.random() * 100) + 10
            }));
            break;
          case 'pie':
            sampleData = Array.from({ length: count }, (_, i) => ({
              x: `Category ${i + 1}`,
              y: Math.floor(Math.random() * 100) + 10
            }));
            break;
          case 'scatter':
            sampleData = Array.from({ length: count }, () => ({
              x: Math.random() * 100,
              y: Math.random() * 100,
              radius: Math.random() * 10 + 5
            }));
            break;
          default:
            sampleData = Array.from({ length: count }, (_, i) => ({
              x: `Item ${i + 1}`,
              y: Math.floor(Math.random() * 100) + 10
            }));
        }
        break;
        
      case 'diagram':
        sampleData = {
          nodes: Array.from({ length: count }, (_, i) => ({
            id: `node${i}`,
            label: `Node ${i + 1}`
          })),
          edges: Array.from({ length: count - 1 }, (_, i) => ({
            from: `node${i}`,
            to: `node${i + 1}`,
            label: `Flow ${i + 1}`
          }))
        };
        break;
        
      case 'architecture':
        sampleData = {
          components: Array.from({ length: count }, (_, i) => ({
            id: `comp${i}`,
            name: `Component ${i + 1}`,
            type: i % 2 === 0 ? 'service' : 'database'
          })),
          connections: Array.from({ length: count - 1 }, (_, i) => ({
            from: `comp${i}`,
            to: `comp${i + 1}`,
            type: 'api'
          }))
        };
        break;
        
      case 'model':
        sampleData = {
          vertices: Array.from({ length: count * 3 }, () => Math.random() * 10 - 5),
          faces: Array.from({ length: count }, (_, i) => [i * 3, i * 3 + 1, i * 3 + 2])
        };
        break;
        
      default:
        sampleData = Array.from({ length: count }, (_, i) => ({
          x: `Item ${i + 1}`,
          y: Math.floor(Math.random() * 100) + 10
        }));
    }
    
    res.json({
      success: true,
      data: sampleData,
      message: 'Sample data generated successfully'
    });
  } catch (error) {
    console.error('❌ Sample data generation error:', error);
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
      service: 'Visualization Service',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      capabilities: [
        'chart_generation',
        'diagram_generation',
        'architecture_diagrams',
        '3d_modeling',
        'batch_processing',
        'export_options'
      ],
      supportedFormats: {
        charts: ['html', 'png', 'svg'],
        diagrams: ['html', 'svg', 'png'],
        architectures: ['html', 'svg', 'png'],
        models: ['html', 'obj', 'png']
      },
      libraries: {
        'Chart.js': '3.x',
        'D3.js': '7.x',
        'Three.js': 'r128',
        'Mermaid': '8.14.0'
      }
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

// Export visualization data
router.get('/export/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;
    const { format = 'json' } = req.query;
    
    if (!type || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Type and filename are required'
      });
    }

    // This would implement actual file serving
    // For now, return the file path
    const filepath = `./data/visualizations/${type}s/${filename}`;
    
    res.json({
      success: true,
      data: {
        filepath: filepath,
        filename: filename,
        type: type,
        format: format
      },
      message: 'Export information retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Validate visualization data
router.post('/validate', validateRequest, async (req, res) => {
  try {
    const { data, type } = req.body;
    
    if (!data || !type) {
      return res.status(400).json({
        success: false,
        error: 'Data and type are required for validation'
      });
    }

    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Basic validation based on type
    switch (type) {
      case 'chart':
        if (!Array.isArray(data)) {
          validation.isValid = false;
          validation.errors.push('Chart data must be an array');
        } else if (data.length === 0) {
          validation.warnings.push('Chart data array is empty');
        } else {
          const hasRequiredFields = data.every(item => 
            item.hasOwnProperty('x') && item.hasOwnProperty('y')
          );
          if (!hasRequiredFields) {
            validation.errors.push('Chart data items must have x and y fields');
          }
        }
        break;
        
      case 'diagram':
        if (!data.nodes || !Array.isArray(data.nodes)) {
          validation.isValid = false;
          validation.errors.push('Diagram must have nodes array');
        }
        if (data.edges && !Array.isArray(data.edges)) {
          validation.isValid = false;
          validation.errors.push('Diagram edges must be an array');
        }
        break;
        
      case 'architecture':
        if (!data.components || !Array.isArray(data.components)) {
          validation.isValid = false;
          validation.errors.push('Architecture must have components array');
        }
        if (data.connections && !Array.isArray(data.connections)) {
          validation.isValid = false;
          validation.errors.push('Architecture connections must be an array');
        }
        break;
        
      case 'model':
        if (!data.vertices || !Array.isArray(data.vertices)) {
          validation.isValid = false;
          validation.errors.push('Model must have vertices array');
        }
        if (data.faces && !Array.isArray(data.faces)) {
          validation.isValid = false;
          validation.errors.push('Model faces must be an array');
        }
        break;
    }

    // Add suggestions
    if (validation.isValid && validation.errors.length === 0) {
      validation.suggestions.push('Data looks good for visualization');
      if (type === 'chart' && data.length > 20) {
        validation.suggestions.push('Consider using aggregation for large datasets');
      }
    }

    res.json({
      success: true,
      data: validation,
      message: 'Data validation completed'
    });
  } catch (error) {
    console.error('❌ Validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
