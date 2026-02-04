const express = require('express');
const TableDataAgent = require('../services/tableDataAgent');
const ColumnAgent = require('../services/columnAgent');
const RowAgent = require('../services/rowAgent');
const router = express.Router();

// Initialize agents
const tableAgent = new TableDataAgent();
const columnAgent = new ColumnAgent();
const rowAgent = new RowAgent();

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

// Parse table data
router.post('/parse', validateRequest, async (req, res) => {
  try {
    const { data, format = 'auto' } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for parsing'
      });
    }

    console.log('📊 Parsing table data...');
    const result = await tableAgent.parseTableData(data, format);
    
    res.json({
      success: true,
      data: result,
      message: 'Table data parsed successfully'
    });
  } catch (error) {
    console.error('❌ Table parsing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Convert table to matrix
router.post('/to-matrix', validateRequest, async (req, res) => {
  try {
    const { data, includeHeaders = true } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for matrix conversion'
      });
    }

    const matrix = tableAgent.tableToMatrix(data, includeHeaders);
    
    res.json({
      success: true,
      data: {
        matrix: matrix,
        rows: matrix.length,
        columns: matrix[0] ? matrix[0].length : 0
      },
      message: 'Table converted to matrix successfully'
    });
  } catch (error) {
    console.error('❌ Matrix conversion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Convert matrix to table
router.post('/from-matrix', validateRequest, async (req, res) => {
  try {
    const { matrix, headers = null } = req.body;
    
    if (!matrix || !Array.isArray(matrix)) {
      return res.status(400).json({
        success: false,
        error: 'Matrix is required for conversion'
      });
    }

    const table = tableAgent.matrixToTable(matrix, headers);
    
    res.json({
      success: true,
      data: {
        table: table,
        rows: table.length,
        columns: table.length > 0 ? Object.keys(table[0]).length : 0
      },
      message: 'Matrix converted to table successfully'
    });
  } catch (error) {
    console.error('❌ Matrix to table conversion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Matrix operations
router.post('/matrix/multiply', validateRequest, async (req, res) => {
  try {
    const { matrixA, matrixB } = req.body;
    
    if (!matrixA || !matrixB) {
      return res.status(400).json({
        success: false,
        error: 'Both matrices are required for multiplication'
      });
    }

    const result = tableAgent.matrixMultiply(matrixA, matrixB);
    
    res.json({
      success: true,
      data: {
        result: result,
        dimensions: `${result.length}x${result[0].length}`
      },
      message: 'Matrix multiplication completed successfully'
    });
  } catch (error) {
    console.error('❌ Matrix multiplication error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/matrix/transpose', validateRequest, async (req, res) => {
  try {
    const { matrix } = req.body;
    
    if (!matrix) {
      return res.status(400).json({
        success: false,
        error: 'Matrix is required for transpose'
      });
    }

    const result = tableAgent.matrixTranspose(matrix);
    
    res.json({
      success: true,
      data: {
        result: result,
        originalDimensions: `${matrix.length}x${matrix[0].length}`,
        transposedDimensions: `${result.length}x${result[0].length}`
      },
      message: 'Matrix transpose completed successfully'
    });
  } catch (error) {
    console.error('❌ Matrix transpose error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/matrix/determinant', validateRequest, async (req, res) => {
  try {
    const { matrix } = req.body;
    
    if (!matrix) {
      return res.status(400).json({
        success: false,
        error: 'Matrix is required for determinant calculation'
      });
    }

    const determinant = tableAgent.matrixDeterminant(matrix);
    
    res.json({
      success: true,
      data: {
        determinant: determinant,
        isSingular: determinant === 0,
        dimensions: `${matrix.length}x${matrix[0].length}`
      },
      message: 'Determinant calculated successfully'
    });
  } catch (error) {
    console.error('❌ Determinant calculation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/matrix/inverse', validateRequest, async (req, res) => {
  try {
    const { matrix } = req.body;
    
    if (!matrix) {
      return res.status(400).json({
        success: false,
        error: 'Matrix is required for inverse calculation'
      });
    }

    const inverse = tableAgent.matrixInverse(matrix);
    
    res.json({
      success: true,
      data: {
        inverse: inverse,
        dimensions: `${inverse.length}x${inverse[0].length}`
      },
      message: 'Matrix inverse calculated successfully'
    });
  } catch (error) {
    console.error('❌ Matrix inverse error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Correlation matrix
router.post('/correlation', validateRequest, async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for correlation analysis'
      });
    }

    const correlationMatrix = tableAgent.correlationMatrix(data);
    
    res.json({
      success: true,
      data: {
        correlationMatrix: correlationMatrix,
        dimensions: `${correlationMatrix.length}x${correlationMatrix[0].length}`
      },
      message: 'Correlation matrix calculated successfully'
    });
  } catch (error) {
    console.error('❌ Correlation matrix error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Column analysis
router.post('/column/analyze', validateRequest, async (req, res) => {
  try {
    const { data, columnName, analysisType = 'comprehensive' } = req.body;
    
    if (!data || !columnName) {
      return res.status(400).json({
        success: false,
        error: 'Data and column name are required for analysis'
      });
    }

    console.log(`📊 Analyzing column: ${columnName}`);
    const result = await columnAgent.analyzeColumn(data, columnName, analysisType);
    
    res.json({
      success: true,
      data: result,
      message: 'Column analysis completed successfully'
    });
  } catch (error) {
    console.error('❌ Column analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Row analysis
router.post('/row/analyze', validateRequest, async (req, res) => {
  try {
    const { data, rowIndex, analysisType = 'comprehensive' } = req.body;
    
    if (!data || rowIndex === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Data and row index are required for analysis'
      });
    }

    console.log(`📊 Analyzing row: ${rowIndex}`);
    const result = await rowAgent.analyzeRow(data, rowIndex, analysisType);
    
    res.json({
      success: true,
      data: result,
      message: 'Row analysis completed successfully'
    });
  } catch (error) {
    console.error('❌ Row analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Table analysis
router.post('/analyze', validateRequest, async (req, res) => {
  try {
    const { data, analysisType = 'comprehensive' } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for analysis'
      });
    }

    console.log('📊 Analyzing table data...');
    const result = await tableAgent.analyzeTable(data, analysisType);
    
    res.json({
      success: true,
      data: result,
      message: 'Table analysis completed successfully'
    });
  } catch (error) {
    console.error('❌ Table analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save table data
router.post('/save', validateRequest, async (req, res) => {
  try {
    const { data, filename, format = 'json' } = req.body;
    
    if (!data || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Data and filename are required for saving'
      });
    }

    const result = await tableAgent.saveTable(data, filename, format);
    
    res.json({
      success: true,
      data: result,
      message: 'Table data saved successfully'
    });
  } catch (error) {
    console.error('❌ Table save error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Load table data
router.get('/load/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { format = 'json' } = req.query;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
    }

    const result = await tableAgent.loadTable(filename, format);
    
    res.json({
      success: true,
      data: result,
      message: 'Table data loaded successfully'
    });
  } catch (error) {
    console.error('❌ Table load error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List saved tables
router.get('/list', async (req, res) => {
  try {
    const result = await tableAgent.listTables();
    
    res.json({
      success: true,
      data: result,
      message: 'Table list retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Table list error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete table
router.delete('/delete/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
    }

    const result = await tableAgent.deleteTable(filename);
    
    res.json({
      success: true,
      data: result,
      message: 'Table deleted successfully'
    });
  } catch (error) {
    console.error('❌ Table delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch analysis
router.post('/batch-analyze', validateRequest, async (req, res) => {
  try {
    const { datasets, analysisType = 'comprehensive' } = req.body;
    
    if (!Array.isArray(datasets) || datasets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Datasets array is required'
      });
    }

    console.log(`📊 Starting batch analysis for ${datasets.length} datasets...`);
    
    const results = [];
    for (let i = 0; i < datasets.length; i++) {
      const dataset = datasets[i];
      try {
        const result = await tableAgent.analyzeTable(dataset.data, analysisType);
        results.push({
          index: i,
          name: dataset.name || `Dataset ${i + 1}`,
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          index: i,
          name: dataset.name || `Dataset ${i + 1}`,
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
      message: 'Batch analysis completed'
    });
  } catch (error) {
    console.error('❌ Batch analysis error:', error);
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
      service: 'Table Analysis Service',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      capabilities: [
        'table_parsing',
        'matrix_operations',
        'column_analysis',
        'row_analysis',
        'correlation_analysis',
        'data_storage',
        'batch_processing'
      ],
      agents: {
        tableAgent: 'TableDataAgent',
        columnAgent: 'ColumnAgent',
        rowAgent: 'RowAgent'
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

// Advanced matrix operations
router.post('/matrix/statistics', validateRequest, async (req, res) => {
  try {
    const { matrix } = req.body;
    
    if (!matrix) {
      return res.status(400).json({
        success: false,
        error: 'Matrix is required for statistics'
      });
    }

    const statistics = {
      mean: tableAgent.matrixMean(matrix),
      stdDev: tableAgent.matrixStd(matrix),
      dimensions: `${matrix.length}x${matrix[0].length}`,
      totalElements: matrix.length * matrix[0].length
    };
    
    res.json({
      success: true,
      data: statistics,
      message: 'Matrix statistics calculated successfully'
    });
  } catch (error) {
    console.error('❌ Matrix statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Data validation
router.post('/validate', validateRequest, async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for validation'
      });
    }

    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      summary: {}
    };

    // Basic structure validation
    if (!Array.isArray(data)) {
      validation.isValid = false;
      validation.errors.push('Data must be an array');
    } else if (data.length === 0) {
      validation.warnings.push('Data array is empty');
    } else {
      validation.summary.totalRows = data.length;
      
      if (data.length > 0 && typeof data[0] === 'object') {
        validation.summary.totalColumns = Object.keys(data[0]).length;
        validation.summary.columns = Object.keys(data[0]);
        
        // Check for consistent column structure
        const firstRowColumns = Object.keys(data[0]);
        for (let i = 1; i < data.length; i++) {
          const currentRowColumns = Object.keys(data[i]);
          if (currentRowColumns.length !== firstRowColumns.length) {
            validation.warnings.push(`Row ${i} has ${currentRowColumns.length} columns, expected ${firstRowColumns.length}`);
          }
        }
      }
    }

    res.json({
      success: true,
      data: validation,
      message: 'Data validation completed'
    });
  } catch (error) {
    console.error('❌ Data validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
