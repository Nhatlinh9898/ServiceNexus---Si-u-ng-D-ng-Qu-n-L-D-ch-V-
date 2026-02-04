const TableDataAgent = require('./tableDataAgent');

class RowAgent {
  constructor() {
    this.tableAgent = new TableDataAgent();
    this.cache = new Map();
  }

  // Analyze specific row in table data
  async analyzeRow(data, rowIndex, analysisType = 'comprehensive') {
    try {
      if (!Array.isArray(data) || rowIndex >= data.length || rowIndex < 0) {
        throw new Error('Invalid row index or data');
      }

      const rowData = data[rowIndex];
      const analysis = {
        rowIndex: rowIndex,
        analysisType: analysisType,
        timestamp: new Date().toISOString(),
        row: rowData,
        metadata: this.getRowMetadata(rowData, data),
        results: {}
      };

      switch (analysisType) {
        case 'comprehensive':
          analysis.results.profile = this.getRowProfile(rowData);
          analysis.results.comparison = this.compareRowToDataset(rowData, data);
          analysis.results.anomalies = this.detectRowAnomalies(rowData, data);
          analysis.results.similarity = this.findSimilarRows(rowData, data);
          break;
        case 'profile':
          analysis.results.profile = this.getRowProfile(rowData);
          break;
        case 'comparison':
          analysis.results.comparison = this.compareRowToDataset(rowData, data);
          break;
        case 'anomalies':
          analysis.results.anomalies = this.detectRowAnomalies(rowData, data);
          break;
        case 'similarity':
          analysis.results.similarity = this.findSimilarRows(rowData, data);
          break;
        default:
          throw new Error(`Unknown analysis type: ${analysisType}`);
      }

      return analysis;
    } catch (error) {
      console.error(`❌ Failed to analyze row ${rowIndex}:`, error);
      throw error;
    }
  }

  // Get row metadata
  getRowMetadata(rowData, fullDataset) {
    if (!rowData || !fullDataset) {
      return {
        valid: false,
        message: 'Invalid data provided'
      };
    }

    const columns = Object.keys(rowData);
    const totalColumns = columns.length;
    const nonNullColumns = columns.filter(col => 
      rowData[col] !== null && rowData[col] !== undefined && rowData[col] !== ''
    ).length;

    return {
      valid: true,
      totalColumns: totalColumns,
      nonNullColumns: nonNullColumns,
      nullColumns: totalColumns - nonNullColumns,
      completeness: ((nonNullColumns / totalColumns) * 100).toFixed(2) + '%',
      columnTypes: this.getRowColumnTypes(rowData),
      hasNulls: nonNullColumns < totalColumns,
      datasetSize: fullDataset.length,
      rowPosition: fullDataset.indexOf(rowData) + 1
    };
  }

  // Get data types for each column in the row
  getRowColumnTypes(rowData) {
    const types = {};
    
    Object.keys(rowData).forEach(column => {
      const value = rowData[column];
      if (value === null || value === undefined || value === '') {
        types[column] = 'null';
      } else if (typeof value === 'number') {
        types[column] = 'number';
      } else if (typeof value === 'boolean') {
        types[column] = 'boolean';
      } else if (value instanceof Date) {
        types[column] = 'date';
      } else if (!isNaN(Date.parse(value))) {
        types[column] = 'date_string';
      } else {
        types[column] = 'string';
      }
    });

    return types;
  }

  // Get comprehensive row profile
  getRowProfile(rowData) {
    const profile = {
      summary: {},
      characteristics: {},
      quality: {}
    };

    // Summary statistics
    const columns = Object.keys(rowData);
    const numericColumns = columns.filter(col => typeof rowData[col] === 'number');
    const stringColumns = columns.filter(col => typeof rowData[col] === 'string');
    const dateColumns = columns.filter(col => rowData[col] instanceof Date || !isNaN(Date.parse(rowData[col])));

    profile.summary = {
      totalColumns: columns.length,
      numericColumns: numericColumns.length,
      stringColumns: stringColumns.length,
      dateColumns: dateColumns.length,
      nullColumns: columns.filter(col => 
        rowData[col] === null || rowData[col] === undefined || rowData[col] === ''
      ).length
    };

    // Row characteristics
    profile.characteristics = {
      density: ((columns.length - profile.summary.nullColumns) / columns.length * 100).toFixed(2) + '%',
      diversity: this.calculateRowDiversity(rowData),
      complexity: this.calculateRowComplexity(rowData),
      uniqueness: this.calculateRowUniqueness(rowData)
    };

    // Data quality metrics
    profile.quality = {
      completeness: ((columns.length - profile.summary.nullColumns) / columns.length * 100).toFixed(2) + '%',
      consistency: this.checkRowConsistency(rowData),
      validity: this.validateRowData(rowData)
    };

    return profile;
  }

  // Calculate row diversity (variety of data types and values)
  calculateRowDiversity(rowData) {
    const values = Object.values(rowData).filter(val => val !== null && val !== undefined);
    const types = new Set(values.map(val => typeof val));
    const uniqueValues = new Set(values.map(val => String(val)));

    return {
      typeDiversity: types.size,
      valueDiversity: uniqueValues.size,
      diversityScore: (types.size * uniqueValues.size) / values.length
    };
  }

  // Calculate row complexity
  calculateRowComplexity(rowData) {
    let complexity = 0;
    const values = Object.values(rowData);

    values.forEach(value => {
      if (value === null || value === undefined) {
        complexity += 0;
      } else if (typeof value === 'number') {
        complexity += 1;
      } else if (typeof value === 'boolean') {
        complexity += 0.5;
      } else if (typeof value === 'string') {
        complexity += Math.min(value.length / 50, 2); // Max 2 points for string length
      } else if (value instanceof Date) {
        complexity += 1.5;
      } else {
        complexity += 1;
      }
    });

    return {
      score: complexity,
      level: complexity < 5 ? 'low' : complexity < 10 ? 'medium' : 'high',
      description: `Complexity score: ${complexity.toFixed(2)}`
    };
  }

  // Calculate row uniqueness
  calculateRowUniqueness(rowData) {
    const values = Object.values(rowData);
    const stringValues = values.map(val => String(val)).join('|');
    
    // Simple hash for uniqueness calculation
    let hash = 0;
    for (let i = 0; i < stringValues.length; i++) {
      const char = stringValues.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return {
      hash: Math.abs(hash),
      fingerprint: stringValues.substring(0, 100), // First 100 chars as fingerprint
      description: 'Row fingerprint for similarity matching'
    };
  }

  // Check row consistency
  checkRowConsistency(rowData) {
    const consistency = {
      score: 100,
      issues: []
    };

    Object.keys(rowData).forEach(column => {
      const value = rowData[column];
      
      // Check for inconsistent data types
      if (typeof value === 'string' && value.trim() === '') {
        consistency.score -= 5;
        consistency.issues.push(`Empty string in ${column}`);
      }
      
      // Check for potential data entry errors
      if (typeof value === 'string' && value.length > 1000) {
        consistency.score -= 2;
        consistency.issues.push(`Unusually long string in ${column}`);
      }
      
      // Check for negative values where they might not make sense
      if (typeof value === 'number' && value < 0 && 
          (column.toLowerCase().includes('count') || column.toLowerCase().includes('amount'))) {
        consistency.score -= 3;
        consistency.issues.push(`Negative value in ${column}`);
      }
    });

    consistency.level = consistency.score >= 90 ? 'high' : consistency.score >= 70 ? 'medium' : 'low';
    
    return consistency;
  }

  // Validate row data
  validateRowData(rowData) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    Object.keys(rowData).forEach(column => {
      const value = rowData[column];
      
      // Basic validation
      if (value === null || value === undefined) {
        validation.warnings.push(`${column} is null or undefined`);
      } else if (typeof value === 'string' && value.trim() === '') {
        validation.warnings.push(`${column} is empty string`);
      } else if (typeof value === 'number' && isNaN(value)) {
        validation.isValid = false;
        validation.errors.push(`${column} is NaN`);
      } else if (typeof value === 'string' && !isNaN(Date.parse(value)) && 
                 !column.toLowerCase().includes('date') && !column.toLowerCase().includes('time')) {
        validation.warnings.push(`${column} looks like a date but column name doesn't suggest it`);
      }
    });

    return validation;
  }

  // Compare row to dataset
  compareRowToDataset(rowData, fullDataset) {
    const comparison = {
      position: {},
      statistics: {},
      distribution: {}
    };

    // Position analysis
    const rowIndex = fullDataset.indexOf(rowData);
    comparison.position = {
      index: rowIndex,
      percentile: ((rowIndex + 1) / fullDataset.length * 100).toFixed(2) + '%',
      position: rowIndex < fullDataset.length / 2 ? 'first_half' : 'second_half',
      rank: rowIndex + 1
    };

    // Statistical comparison
    Object.keys(rowData).forEach(column => {
      if (typeof rowData[column] === 'number') {
        const columnValues = fullDataset.map(row => row[column]).filter(val => typeof val === 'number');
        if (columnValues.length > 0) {
          const stats = this.calculateColumnStatistics(columnValues);
          comparison.statistics[column] = {
            value: rowData[column],
            mean: stats.mean,
            median: stats.median,
            stdDev: stats.stdDev,
            zScore: Math.abs((rowData[column] - stats.mean) / stats.stdDev),
            percentile: this.calculatePercentileRank(rowData[column], columnValues),
            position: rowData[column] > stats.mean ? 'above_average' : 'below_average'
          };
        }
      }
    });

    // Distribution analysis
    comparison.distribution = this.analyzeRowDistribution(rowData, fullDataset);

    return comparison;
  }

  // Calculate column statistics
  calculateColumnStatistics(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : 
                  (sorted[Math.floor(sorted.length / 2) - 1] + sorted[Math.floor(sorted.length / 2)]) / 2;
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, median, stdDev };
  }

  // Calculate percentile rank
  calculatePercentileRank(value, values) {
    const sorted = [...values].sort((a, b) => a - b);
    const rank = sorted.filter(v => v <= value).length;
    return (rank / sorted.length * 100).toFixed(2) + '%';
  }

  // Analyze row distribution
  analyzeRowDistribution(rowData, fullDataset) {
    const distribution = {
      categorical: {},
      numerical: {},
      temporal: {}
    };

    Object.keys(rowData).forEach(column => {
      const value = rowData[column];
      const columnValues = fullDataset.map(row => row[column]);

      if (typeof value === 'string') {
        // Categorical distribution
        const frequency = {};
        columnValues.forEach(val => {
          const key = String(val);
          frequency[key] = (frequency[key] || 0) + 1;
        });

        const valueFreq = frequency[String(value)] || 0;
        const total = columnValues.length;

        distribution.categorical[column] = {
          value: value,
          frequency: valueFreq,
          percentage: ((valueFreq / total) * 100).toFixed(2) + '%',
          rank: Object.values(frequency).sort((a, b) => b - a).indexOf(valueFreq) + 1,
          uniqueness: valueFreq === 1 ? 'unique' : valueFreq / total < 0.01 ? 'rare' : 'common'
        };
      } else if (typeof value === 'number') {
        // Numerical distribution
        const numericValues = columnValues.filter(val => typeof val === 'number');
        if (numericValues.length > 0) {
          const stats = this.calculateColumnStatistics(numericValues);
          distribution.numerical[column] = {
            value: value,
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
            range: Math.max(...numericValues) - Math.min(...numericValues),
            position: ((value - stats.min) / (stats.max - stats.min) * 100).toFixed(2) + '%',
            outliers: this.detectOutliers(numericValues),
            isOutlier: this.isOutlier(value, numericValues)
          };
        }
      } else if (value instanceof Date || !isNaN(Date.parse(value))) {
        // Temporal distribution
        const dateValues = columnValues.map(val => new Date(val)).filter(date => !isNaN(date.getTime()));
        if (dateValues.length > 0) {
          const sortedDates = dateValues.sort((a, b) => a - b);
          const rowDate = new Date(value);
          
          distribution.temporal[column] = {
            value: rowDate,
            earliest: sortedDates[0],
            latest: sortedDates[sortedDates.length - 1],
            position: this.calculateDatePercentile(rowDate, sortedDates),
            recency: this.calculateRecency(rowDate, sortedDates),
            seasonality: this.getDateSeasonality(rowDate)
          };
        }
      }
    });

    return distribution;
  }

  // Detect outliers in numeric values
  detectOutliers(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return {
      lowerBound: lowerBound,
      upperBound: upperBound,
      outliers: values.filter(v => v < lowerBound || v > upperBound),
      outlierCount: values.filter(v => v < lowerBound || v > upperBound).length
    };
  }

  // Check if value is an outlier
  isOutlier(value, values) {
    const outliers = this.detectOutliers(values);
    return value < outliers.lowerBound || value > outliers.upperBound;
  }

  // Calculate date percentile
  calculateDatePercentile(date, sortedDates) {
    const index = sortedDates.findIndex(d => d >= date);
    return ((index / sortedDates.length) * 100).toFixed(2) + '%';
  }

  // Calculate recency
  calculateRecency(date, sortedDates) {
    const now = new Date();
    const latest = sortedDates[sortedDates.length - 1];
    const daysSinceLatest = (now - latest) / (1000 * 60 * 60 * 24);
    const daysSinceDate = (now - date) / (1000 * 60 * 60 * 24);
    
    return {
      daysSinceLatest: daysSinceLatest.toFixed(1),
      daysSinceDate: daysSinceDate.toFixed(1),
      recencyScore: Math.max(0, 100 - (daysSinceDate / daysSinceLatest * 100)),
      isRecent: daysSinceDate < daysSinceLatest * 0.1
    };
  }

  // Get date seasonality
  getDateSeasonality(date) {
    const month = date.getMonth() + 1;
    const season = month >= 3 && month <= 5 ? 'spring' :
                  month >= 6 && month <= 8 ? 'summer' :
                  month >= 9 && month <= 11 ? 'fall' : 'winter';
    
    return {
      month: month,
      season: season,
      quarter: Math.ceil(month / 3),
      dayOfWeek: date.getDay(),
      dayOfMonth: date.getDate()
    };
  }

  // Detect anomalies in row
  detectRowAnomalies(rowData, fullDataset) {
    const anomalies = [];

    // Statistical anomalies
    Object.keys(rowData).forEach(column => {
      if (typeof rowData[column] === 'number') {
        const columnValues = fullDataset.map(row => row[column]).filter(val => typeof val === 'number');
        if (columnValues.length > 0 && this.isOutlier(rowData[column], columnValues)) {
          anomalies.push({
            type: 'statistical_outlier',
            column: column,
            value: rowData[column],
            description: `Statistical outlier detected in ${column}: ${rowData[column]}`
          });
        }
      }
    });

    // Pattern anomalies
    const patternAnomalies = this.detectPatternAnomalies(rowData, fullDataset);
    anomalies.push(...patternAnomalies);

    // Data quality anomalies
    const qualityAnomalies = this.detectQualityAnomalies(rowData);
    anomalies.push(...qualityAnomalies);

    return anomalies;
  }

  // Detect pattern anomalies
  detectPatternAnomalies(rowData, fullDataset) {
    const anomalies = [];

    // Check for unusual combinations
    const combinations = this.findUnusualCombinations(rowData, fullDataset);
    anomalies.push(...combinations);

    // Check for sequence breaks
    const sequenceBreaks = this.detectSequenceBreaks(rowData, fullDataset);
    anomalies.push(...sequenceBreaks);

    return anomalies;
  }

  // Find unusual combinations
  findUnusualCombinations(rowData, fullDataset) {
    const combinations = [];

    // Check for rare categorical combinations
    const stringColumns = Object.keys(rowData).filter(col => typeof rowData[col] === 'string');
    if (stringColumns.length >= 2) {
      const combination = stringColumns.slice(0, 2).map(col => `${col}:${rowData[col]}`).join('|');
      const combinationCount = fullDataset.filter(row => 
        stringColumns.slice(0, 2).every(col => row[col] === rowData[col])
      ).length;

      if (combinationCount === 1) {
        combinations.push({
          type: 'rare_combination',
          combination: combination,
          count: combinationCount,
          description: `Unique combination found: ${combination}`
        });
      }
    }

    return combinations;
  }

  // Detect sequence breaks
  detectSequenceBreaks(rowData, fullDataset) {
    const breaks = [];

    // Check for ID sequence breaks
    const idColumns = Object.keys(rowData).filter(col => 
      col.toLowerCase().includes('id') || col.toLowerCase().includes('number')
    );

    idColumns.forEach(column => {
      if (typeof rowData[column] === 'number') {
        const rowIndex = fullDataset.indexOf(rowData);
        const expectedValue = rowIndex + 1; // Assuming 1-based indexing
        
        if (Math.abs(rowData[column] - expectedValue) > 1) {
          breaks.push({
            type: 'sequence_break',
            column: column,
            expected: expectedValue,
            actual: rowData[column],
            description: `Sequence break in ${column}: expected ${expectedValue}, found ${rowData[column]}`
          });
        }
      }
    });

    return breaks;
  }

  // Detect quality anomalies
  detectQualityAnomalies(rowData) {
    const anomalies = [];

    // Check for excessive null values
    const nullCount = Object.values(rowData).filter(val => 
      val === null || val === undefined || val === ''
    ).length;
    
    const totalCount = Object.keys(rowData).length;
    if (nullCount / totalCount > 0.5) {
      anomalies.push({
        type: 'excessive_nulls',
        nullCount: nullCount,
        totalCount: totalCount,
        percentage: ((nullCount / totalCount) * 100).toFixed(2) + '%',
        description: `Excessive null values: ${nullCount}/${totalCount} (${((nullCount / totalCount) * 100).toFixed(2)}%)`
      });
    }

    // Check for data format inconsistencies
    Object.keys(rowData).forEach(column => {
      const value = rowData[column];
      if (typeof value === 'string') {
        // Check for mixed case patterns
        if (value !== value.toLowerCase() && value !== value.toUpperCase() && value !== value[0].toUpperCase() + value.slice(1).toLowerCase()) {
          anomalies.push({
            type: 'format_inconsistency',
            column: column,
            value: value,
            description: `Inconsistent case format in ${column}: "${value}"`
          });
        }
        
        // Check for extra whitespace
        if (value !== value.trim()) {
          anomalies.push({
            type: 'whitespace_issue',
            column: column,
            value: value,
            description: `Extra whitespace in ${column}: "${value}"`
          });
        }
      }
    });

    return anomalies;
  }

  // Find similar rows
  findSimilarRows(rowData, fullDataset) {
    const similarities = [];
    const targetFingerprint = this.calculateRowUniqueness(rowData).fingerprint;

    fullDataset.forEach((row, index) => {
      if (row !== rowData) {
        const rowFingerprint = this.calculateRowUniqueness(row).fingerprint;
        const similarity = this.calculateStringSimilarity(targetFingerprint, rowFingerprint);
        
        if (similarity > 0.7) { // 70% similarity threshold
          similarities.push({
            rowIndex: index,
            similarity: similarity,
            fingerprint: rowFingerprint,
            row: row,
            matchType: similarity > 0.9 ? 'near_duplicate' : 'similar'
          });
        }
      }
    });

    // Sort by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);

    return {
      totalSimilar: similarities.length,
      nearDuplicates: similarities.filter(s => s.matchType === 'near_duplicate').length,
      similarRows: similarities.slice(0, 10), // Top 10 most similar
      summary: {
        hasDuplicates: similarities.some(s => s.matchType === 'near_duplicate'),
        maxSimilarity: similarities.length > 0 ? similarities[0].similarity : 0,
        averageSimilarity: similarities.length > 0 ? 
          similarities.reduce((sum, s) => sum + s.similarity, 0) / similarities.length : 0
      }
    };
  }

  // Calculate string similarity (simple implementation)
  calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Levenshtein distance for string similarity
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

module.exports = RowAgent;
