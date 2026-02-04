const fs = require('fs').promises;
const path = require('path');

class TableDataAgent {
  constructor() {
    this.dataPath = path.join(__dirname, '..', 'data', 'tables');
    this.cache = new Map();
    this.matrixCache = new Map();
    this.initializeDirectories();
  }

  async initializeDirectories() {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      console.log('✅ Table data directories initialized');
    } catch (error) {
      console.error('❌ Failed to initialize table directories:', error);
    }
  }

  // Parse table data from various formats
  async parseTableData(data, format = 'auto') {
    try {
      let parsedData;
      
      switch (format.toLowerCase()) {
        case 'csv':
          parsedData = this.parseCSV(data);
          break;
        case 'json':
          parsedData = this.parseJSON(data);
          break;
        case 'excel':
          parsedData = this.parseExcel(data);
          break;
        case 'auto':
          parsedData = this.autoDetectFormat(data);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Validate table structure
      const validatedData = this.validateTableStructure(parsedData);
      
      // Extract metadata
      const metadata = this.extractTableMetadata(validatedData);
      
      return {
        data: validatedData,
        metadata: metadata,
        format: format
      };
    } catch (error) {
      console.error('❌ Failed to parse table data:', error);
      throw error;
    }
  }

  // Auto-detect data format
  autoDetectFormat(data) {
    if (typeof data === 'string') {
      if (data.trim().startsWith('[')) {
        return this.parseJSON(data);
      } else if (data.includes(',') && data.includes('\n')) {
        return this.parseCSV(data);
      }
    }
    
    if (Array.isArray(data) && data.length > 0) {
      return this.parseJSON(JSON.stringify(data));
    }
    
    throw new Error('Unable to auto-detect data format');
  }

  // Parse CSV data
  parseCSV(csvData) {
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('Empty CSV data');
    }

    const headers = this.parseCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i]);
      if (row.length === headers.length) {
        const rowObject = {};
        headers.forEach((header, index) => {
          rowObject[header] = this.parseValue(row[index]);
        });
        rows.push(rowObject);
      }
    }

    return rows;
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // Parse JSON data
  parseJSON(jsonData) {
    if (typeof jsonData === 'string') {
      return JSON.parse(jsonData);
    }
    return jsonData;
  }

  // Parse Excel data (simplified version)
  parseExcel(excelData) {
    // This would require a library like xlsx
    // For now, we'll assume it's already parsed
    return this.parseJSON(JSON.stringify(excelData));
  }

  // Parse individual cell value
  parseValue(value) {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    
    // Try to parse as number
    if (!isNaN(value) && value !== '') {
      return Number(value);
    }
    
    // Try to parse as date
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    if (dateRegex.test(value)) {
      return new Date(value);
    }
    
    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Return as string
    return value.toString();
  }

  // Validate table structure
  validateTableStructure(data) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array');
    }

    const firstRow = data[0];
    if (typeof firstRow !== 'object' || firstRow === null) {
      throw new Error('Data rows must be objects');
    }

    // Check for consistent column structure
    const columns = Object.keys(firstRow);
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowColumns = Object.keys(row);
      
      // Allow missing columns but flag inconsistencies
      if (rowColumns.length !== columns.length) {
        console.warn(`⚠️ Row ${i} has ${rowColumns.length} columns, expected ${columns.length}`);
      }
    }

    return data;
  }

  // Extract table metadata
  extractTableMetadata(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return {};
    }

    const columns = Object.keys(data[0]);
    const metadata = {
      rowCount: data.length,
      columnCount: columns.length,
      columns: {},
      dataTypes: {},
      statistics: {}
    };

    // Analyze each column
    columns.forEach(column => {
      const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined);
      
      metadata.columns[column] = {
        name: column,
        type: this.detectDataType(values),
        nullCount: data.length - values.length,
        uniqueCount: new Set(values).size,
        sampleValues: values.slice(0, 5)
      };

      // Calculate basic statistics for numeric columns
      if (metadata.columns[column].type === 'number') {
        const numValues = values.map(v => Number(v));
        metadata.statistics[column] = {
          min: Math.min(...numValues),
          max: Math.max(...numValues),
          mean: numValues.reduce((a, b) => a + b, 0) / numValues.length,
          median: this.calculateMedian(numValues),
          stdDev: this.calculateStandardDeviation(numValues)
        };
      }
    });

    return metadata;
  }

  // Detect data type of a column
  detectDataType(values) {
    if (values.length === 0) return 'string';
    
    const types = values.map(v => typeof v);
    const uniqueTypes = [...new Set(types)];
    
    if (uniqueTypes.length === 1) {
      return uniqueTypes[0];
    }
    
    // Check if all values are numbers
    if (types.every(t => t === 'number')) {
      return 'number';
    }
    
    // Check if all values are dates
    if (types.every(t => t === 'object' && values[0] instanceof Date)) {
      return 'date';
    }
    
    // Check if all values are booleans
    if (types.every(t => t === 'boolean')) {
      return 'boolean';
    }
    
    return 'string';
  }

  // Convert table to matrix
  tableToMatrix(data, includeHeaders = true) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Cannot convert empty data to matrix');
    }

    const columns = Object.keys(data[0]);
    let matrix = [];

    if (includeHeaders) {
      matrix.push(columns);
    }

    data.forEach(row => {
      const matrixRow = columns.map(col => {
        const value = row[col];
        return value === null || value === undefined ? 0 : value;
      });
      matrix.push(matrixRow);
    });

    return matrix;
  }

  // Convert matrix back to table
  matrixToTable(matrix, headers = null) {
    if (!Array.isArray(matrix) || matrix.length === 0) {
      throw new Error('Cannot convert empty matrix to table');
    }

    let data = [];
    let columnHeaders = headers;

    // If first row contains strings, treat as headers
    if (!headers && matrix.length > 0 && typeof matrix[0][0] === 'string') {
      columnHeaders = matrix[0];
      matrix = matrix.slice(1);
    }

    const numColumns = columnHeaders ? columnHeaders.length : matrix[0].length;

    matrix.forEach(row => {
      const tableRow = {};
      for (let i = 0; i < numColumns; i++) {
        const header = columnHeaders ? columnHeaders[i] : `column_${i}`;
        tableRow[header] = row[i] || null;
      }
      data.push(tableRow);
    });

    return data;
  }

  // Matrix operations
  matrixMultiply(matrixA, matrixB) {
    const rowsA = matrixA.length;
    const colsA = matrixA[0].length;
    const rowsB = matrixB.length;
    const colsB = matrixB[0].length;

    if (colsA !== rowsB) {
      throw new Error('Cannot multiply matrices: incompatible dimensions');
    }

    const result = [];
    for (let i = 0; i < rowsA; i++) {
      const row = [];
      for (let j = 0; j < colsB; j++) {
        let sum = 0;
        for (let k = 0; k < colsA; k++) {
          sum += matrixA[i][k] * matrixB[k][j];
        }
        row.push(sum);
      }
      result.push(row);
    }

    return result;
  }

  matrixTranspose(matrix) {
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
  }

  matrixDeterminant(matrix) {
    const n = matrix.length;
    if (n === 1) return matrix[0][0];
    if (n === 2) return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    
    // For larger matrices, use Laplace expansion
    let det = 0;
    for (let j = 0; j < n; j++) {
      det += Math.pow(-1, j) * matrix[0][j] * this.matrixDeterminant(this.matrixMinor(matrix, 0, j));
    }
    return det;
  }

  matrixMinor(matrix, row, col) {
    return matrix
      .filter((_, index) => index !== row)
      .map(row => row.filter((_, index) => index !== col));
  }

  // Matrix inverse
  matrixInverse(matrix) {
    const n = matrix.length;
    const det = this.matrixDeterminant(matrix);
    
    if (det === 0) {
      throw new Error('Matrix is singular and cannot be inverted');
    }

    const adjugate = this.matrixAdjugate(matrix);
    return adjugate.map(row => row.map(val => val / det));
  }

  matrixAdjugate(matrix) {
    const n = matrix.length;
    const cofactorMatrix = [];
    
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        row.push(Math.pow(-1, i + j) * this.matrixDeterminant(this.matrixMinor(matrix, i, j)));
      }
      cofactorMatrix.push(row);
    }
    
    return this.matrixTranspose(cofactorMatrix);
  }

  // Statistical operations on matrices
  matrixMean(matrix) {
    const flat = matrix.flat();
    return flat.reduce((sum, val) => sum + val, 0) / flat.length;
  }

  matrixStd(matrix) {
    const flat = matrix.flat();
    const mean = this.matrixMean(matrix);
    const variance = flat.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / flat.length;
    return Math.sqrt(variance);
  }

  // Correlation matrix
  correlationMatrix(data) {
    const matrix = this.tableToMatrix(data, false);
    const columns = matrix[0].length;
    const rows = matrix.length;
    const corrMatrix = [];

    for (let i = 0; i < columns; i++) {
      const row = [];
      for (let j = 0; j < columns; j++) {
        const col1 = matrix.map(row => row[i]);
        const col2 = matrix.map(row => row[j]);
        row.push(this.correlation(col1, col2));
      }
      corrMatrix.push(row);
    }

    return corrMatrix;
  }

  correlation(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Helper functions
  calculateMedian(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  calculateStandardDeviation(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }

  // Save table data
  async saveTable(data, filename, format = 'json') {
    try {
      const filePath = path.join(this.dataPath, `${filename}.${format}`);
      let content;

      switch (format.toLowerCase()) {
        case 'json':
          content = JSON.stringify({
            metadata: this.extractTableMetadata(data),
            data: data,
            timestamp: new Date().toISOString()
          }, null, 2);
          break;
        case 'csv':
          content = this.tableToCSV(data);
          break;
        default:
          throw new Error(`Unsupported save format: ${format}`);
      }

      await fs.writeFile(filePath, content);
      console.log(`💾 Table saved to: ${filePath}`);
      
      return {
        success: true,
        filePath: filePath,
        format: format,
        size: content.length
      };
    } catch (error) {
      console.error('❌ Failed to save table:', error);
      throw error;
    }
  }

  // Convert table to CSV
  tableToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Cannot convert empty data to CSV');
    }

    const headers = Object.keys(data[0]);
    const csvLines = [headers.join(',')];

    data.forEach(row => {
      const csvRow = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        
        // Escape quotes and commas
        const stringValue = value.toString();
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvLines.push(csvRow.join(','));
    });

    return csvLines.join('\n');
  }

  // Load table data
  async loadTable(filename, format = 'json') {
    try {
      const filePath = path.join(this.dataPath, `${filename}.${format}`);
      const content = await fs.readFile(filePath, 'utf8');
      
      let data;
      switch (format.toLowerCase()) {
        case 'json':
          data = JSON.parse(content);
          break;
        case 'csv':
          data = this.parseCSV(content);
          break;
        default:
          throw new Error(`Unsupported load format: ${format}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to load table:', error);
      throw error;
    }
  }

  // List saved tables
  async listTables() {
    try {
      const files = await fs.readdir(this.dataPath);
      const tables = [];

      for (const file of files) {
        const filePath = path.join(this.dataPath, file);
        const stats = await fs.stat(filePath);
        const ext = path.extname(file);
        
        tables.push({
          filename: file.replace(ext, ''),
          format: ext.replace('.', ''),
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          filePath: filePath
        });
      }

      return tables.sort((a, b) => new Date(b.created) - new Date(a.created));
    } catch (error) {
      console.error('❌ Failed to list tables:', error);
      throw error;
    }
  }

  // Delete table
  async deleteTable(filename) {
    try {
      const filePath = path.join(this.dataPath, `${filename}.json`);
      await fs.unlink(filePath);
      console.log(`🗑️ Table deleted: ${filePath}`);
      
      return { success: true, deletedFile: filePath };
    } catch (error) {
      console.error('❌ Failed to delete table:', error);
      throw error;
    }
  }

  // Advanced analysis
  async analyzeTable(data, analysisType = 'comprehensive') {
    try {
      const analysis = {
        metadata: this.extractTableMetadata(data),
        timestamp: new Date().toISOString(),
        type: analysisType
      };

      switch (analysisType) {
        case 'comprehensive':
          analysis.statistics = this.comprehensiveAnalysis(data);
          analysis.patterns = this.detectPatterns(data);
          analysis.anomalies = this.detectAnomalies(data);
          break;
        case 'statistical':
          analysis.statistics = this.comprehensiveAnalysis(data);
          break;
        case 'patterns':
          analysis.patterns = this.detectPatterns(data);
          break;
        case 'anomalies':
          analysis.anomalies = this.detectAnomalies(data);
          break;
        default:
          throw new Error(`Unknown analysis type: ${analysisType}`);
      }

      return analysis;
    } catch (error) {
      console.error('❌ Failed to analyze table:', error);
      throw error;
    }
  }

  comprehensiveAnalysis(data) {
    const metadata = this.extractTableMetadata(data);
    const statistics = {};

    Object.keys(metadata.columns).forEach(column => {
      const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined);
      
      if (metadata.columns[column].type === 'number') {
        statistics[column] = {
          ...metadata.statistics[column],
          skewness: this.calculateSkewness(values),
          kurtosis: this.calculateKurtosis(values),
          outliers: this.detectOutliers(values)
        };
      }
    });

    return statistics;
  }

  detectPatterns(data) {
    const patterns = [];
    
    // Detect time series patterns
    const dateColumns = Object.keys(data[0]).filter(col => 
      data[0][col] instanceof Date || 
      (typeof data[0][col] === 'string' && !isNaN(Date.parse(data[0][col])))
    );

    dateColumns.forEach(column => {
      const values = data.map(row => new Date(row[column]));
      const trend = this.detectTrend(values);
      if (trend.detected) {
        patterns.push({
          type: 'trend',
          column: column,
          direction: trend.direction,
          strength: trend.strength,
          description: `${column} shows ${trend.direction} trend`
        });
      }
    });

    // Detect cyclical patterns
    const cyclicalPatterns = this.detectCyclicalPatterns(data);
    patterns.push(...cyclicalPatterns);

    return patterns;
  }

  detectAnomalies(data) {
    const anomalies = [];
    const metadata = this.extractTableMetadata(data);

    Object.keys(metadata.columns).forEach(column => {
      if (metadata.columns[column].type === 'number') {
        const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined);
        const columnAnomalies = this.detectOutliers(values);
        
        columnAnomalies.forEach(outlier => {
          anomalies.push({
            type: 'outlier',
            column: column,
            value: outlier.value,
            rowIndex: outlier.rowIndex,
            description: `Outlier detected in ${column}: ${outlier.value} (${outlier.zScore} sigma)`
          });
        });
      }
    });

    return anomalies;
  }

  detectTrend(values) {
    if (values.length < 3) return { detected: false };
    
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i].getTime();
      sumXY += i * values[i].getTime();
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate correlation coefficient
    let sumYMean = 0, sumXMean = sumX / n;
    let sumXYMean = 0, sumX2Mean = 0, sumY2Mean = 0;
    
    for (let i = 0; i < n; i++) {
      const x = i;
      const y = values[i].getTime();
      sumYMean += y;
      sumXYMean += x * y;
      sumX2Mean += x * x;
      sumY2Mean += y * y;
    }
    
    const r = (n * sumXYMean - sumX * sumYMean) / 
              Math.sqrt((n * sumX2Mean - sumX * sumX) * (n * sumY2Mean - sumYMean * sumYMean));
    
    return {
      detected: Math.abs(r) > 0.5,
      direction: slope > 0 ? 'increasing' : 'decreasing',
      strength: Math.abs(r),
      slope: slope,
      intercept: intercept,
      correlation: r
    };
  }

  detectCyclicalPatterns(data) {
    const patterns = [];
    // Implementation would involve FFT or autocorrelation analysis
    return patterns;
  }

  detectOutliers(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = this.calculateStandardDeviation(values);
    const outliers = [];
    
    values.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev);
      if (zScore > 2) { // Threshold for outliers
        outliers.push({
          value: value,
          rowIndex: index,
          zScore: zScore
        });
      }
    });
    
    return outliers;
  }

  calculateSkewness(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = this.calculateStandardDeviation(values);
    const n = values.length;
    
    const sum = values.reduce((acc, val) => {
      return acc + Math.pow((val - mean) / stdDev, 3);
    }, 0);
    
    return sum / n;
  }

  calculateKurtosis(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = this.calculateStandardDeviation(values);
    const n = values.length;
    
    const sum = values.reduce((acc, val) => {
      return acc + Math.pow((val - mean) / stdDev, 4);
    }, 0);
    
    return sum / n - 3;
  }
}

module.exports = TableDataAgent;
