const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class DataProcessingAI {
  constructor() {
    this.dataPath = path.join(__dirname, '..', 'data');
    this.backupPath = path.join(__dirname, '..', 'backups');
    this.cache = new Map();
    this.processingQueue = [];
    this.isProcessing = false;
    
    // Initialize directories
    this.initializeDirectories();
  }

  async initializeDirectories() {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      await fs.mkdir(this.backupPath, { recursive: true });
      console.log('✅ Data directories initialized');
    } catch (error) {
      console.error('❌ Failed to initialize directories:', error);
    }
  }

  // AI-powered data analysis and processing
  async processData(data, options = {}) {
    const {
      type = 'analysis',
      algorithm = 'auto',
      saveResult = true,
      createBackup = true
    } = options;

    try {
      console.log(`🤖 Starting AI data processing: ${type}`);
      
      // Create backup if requested
      if (createBackup && data) {
        await this.createBackup(data, `pre-processing-${Date.now()}`);
      }

      let result;

      switch (type) {
        case 'analysis':
          result = await this.analyzeData(data, algorithm);
          break;
        case 'optimization':
          result = await this.optimizeData(data, algorithm);
          break;
        case 'prediction':
          result = await this.predictData(data, algorithm);
          break;
        case 'clustering':
          result = await this.clusterData(data, algorithm);
          break;
        case 'anomaly_detection':
          result = await this.detectAnomalies(data, algorithm);
          break;
        default:
          result = await this.analyzeData(data, algorithm);
      }

      // Save result if requested
      if (saveResult) {
        await this.saveData(result, `processed-${type}-${Date.now()}`);
      }

      console.log('✅ AI data processing completed');
      return result;

    } catch (error) {
      console.error('❌ AI data processing failed:', error);
      throw error;
    }
  }

  // AI Data Analysis
  async analyzeData(data, algorithm = 'auto') {
    const analysis = {
      timestamp: new Date().toISOString(),
      algorithm: algorithm,
      summary: {},
      insights: [],
      recommendations: [],
      statistics: {}
    };

    try {
      // Basic statistics
      analysis.statistics = this.calculateStatistics(data);
      
      // AI-powered insights generation
      analysis.insights = await this.generateInsights(data, analysis.statistics);
      
      // Recommendations based on analysis
      analysis.recommendations = await this.generateRecommendations(data, analysis.insights);
      
      // Summary
      analysis.summary = {
        totalRecords: Array.isArray(data) ? data.length : Object.keys(data).length,
        dataQuality: this.assessDataQuality(data),
        processingTime: Date.now()
      };

      return analysis;
    } catch (error) {
      console.error('❌ Data analysis failed:', error);
      throw error;
    }
  }

  // AI Data Optimization
  async optimizeData(data, algorithm = 'auto') {
    const optimization = {
      timestamp: new Date().toISOString(),
      originalSize: this.getDataSize(data),
      optimizations: [],
      optimizedData: null,
      compressionRatio: 0
    };

    try {
      let optimizedData = { ...data };

      // Remove duplicates
      if (Array.isArray(optimizedData)) {
        const uniqueData = [...new Set(optimizedData.map(item => JSON.stringify(item)))];
        optimizedData = uniqueData.map(item => JSON.parse(item));
        optimization.optimizations.push({
          type: 'deduplication',
          removed: data.length - optimizedData.length,
          description: 'Removed duplicate entries'
        });
      }

      // Clean invalid data
      if (Array.isArray(optimizedData)) {
        const validData = optimizedData.filter(item => this.isValidData(item));
        optimization.optimizations.push({
          type: 'data_cleaning',
          removed: optimizedData.length - validData.length,
          description: 'Removed invalid or incomplete entries'
        });
        optimizedData = validData;
      }

      // Optimize data structure
      optimizedData = this.optimizeDataStructure(optimizedData);
      optimization.optimizations.push({
        type: 'structure_optimization',
        description: 'Optimized data structure for better performance'
      });

      optimization.optimizedData = optimizedData;
      optimization.optimizedSize = this.getDataSize(optimizedData);
      optimization.compressionRatio = ((optimization.originalSize - optimization.optimizedSize) / optimization.originalSize * 100).toFixed(2);

      return optimization;
    } catch (error) {
      console.error('❌ Data optimization failed:', error);
      throw error;
    }
  }

  // AI Prediction
  async predictData(data, algorithm = 'auto') {
    const prediction = {
      timestamp: new Date().toISOString(),
      algorithm: algorithm,
      predictions: [],
      confidence: 0,
      model: 'local_ai'
    };

    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data for prediction');
      }

      // Analyze historical patterns
      const patterns = this.analyzePatterns(data);
      
      // Generate predictions based on patterns
      prediction.predictions = this.generatePredictions(patterns);
      
      // Calculate confidence score
      prediction.confidence = this.calculateConfidence(patterns, prediction.predictions);

      return prediction;
    } catch (error) {
      console.error('❌ Data prediction failed:', error);
      throw error;
    }
  }

  // AI Clustering
  async clusterData(data, algorithm = 'auto') {
    const clustering = {
      timestamp: new Date().toISOString(),
      algorithm: algorithm,
      clusters: [],
      totalClusters: 0,
      clusterAnalysis: {}
    };

    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data for clustering');
      }

      // Simple clustering based on data attributes
      const clusters = this.performClustering(data);
      clustering.clusters = clusters;
      clustering.totalClusters = clusters.length;
      
      // Analyze each cluster
      clustering.clusterAnalysis = clusters.map((cluster, index) => ({
        clusterId: index,
        size: cluster.members.length,
        characteristics: this.analyzeClusterCharacteristics(cluster),
        centroid: cluster.centroid
      }));

      return clustering;
    } catch (error) {
      console.error('❌ Data clustering failed:', error);
      throw error;
    }
  }

  // Anomaly Detection
  async detectAnomalies(data, algorithm = 'auto') {
    const detection = {
      timestamp: new Date().toISOString(),
      algorithm: algorithm,
      anomalies: [],
      totalAnomalies: 0,
      anomalyScore: 0,
      recommendations: []
    };

    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data for anomaly detection');
      }

      // Detect statistical anomalies
      const statisticalAnomalies = this.detectStatisticalAnomalies(data);
      
      // Detect pattern anomalies
      const patternAnomalies = this.detectPatternAnomalies(data);
      
      // Combine anomalies
      detection.anomalies = [...statisticalAnomalies, ...patternAnomalies];
      detection.totalAnomalies = detection.anomalies.length;
      detection.anomalyScore = (detection.totalAnomalies / data.length * 100).toFixed(2);
      
      // Generate recommendations
      detection.recommendations = this.generateAnomalyRecommendations(detection.anomalies);

      return detection;
    } catch (error) {
      console.error('❌ Anomaly detection failed:', error);
      throw error;
    }
  }

  // Save data to server storage
  async saveData(data, filename) {
    try {
      const filePath = path.join(this.dataPath, `${filename}.json`);
      const dataToSave = {
        metadata: {
          timestamp: new Date().toISOString(),
          size: this.getDataSize(data),
          checksum: this.calculateChecksum(data),
          version: '1.0'
        },
        data: data
      };

      await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));
      console.log(`💾 Data saved to: ${filePath}`);
      
      return {
        success: true,
        filePath: filePath,
        size: dataToSave.metadata.size,
        checksum: dataToSave.metadata.checksum
      };
    } catch (error) {
      console.error('❌ Failed to save data:', error);
      throw error;
    }
  }

  // Load data from server storage
  async loadData(filename) {
    try {
      const filePath = path.join(this.dataPath, `${filename}.json`);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const parsedData = JSON.parse(fileContent);

      // Verify checksum
      const currentChecksum = this.calculateChecksum(parsedData.data);
      if (currentChecksum !== parsedData.metadata.checksum) {
        console.warn('⚠️ Data checksum mismatch - file may be corrupted');
      }

      console.log(`📂 Data loaded from: ${filePath}`);
      return parsedData;
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      throw error;
    }
  }

  // Create backup
  async createBackup(data, backupName) {
    try {
      const backupPath = path.join(this.backupPath, `${backupName}.json`);
      const backupData = {
        metadata: {
          timestamp: new Date().toISOString(),
          backupName: backupName,
          size: this.getDataSize(data),
          checksum: this.calculateChecksum(data)
        },
        data: data
      };

      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`💾 Backup created: ${backupPath}`);
      
      return {
        success: true,
        backupPath: backupPath,
        size: backupData.metadata.size
      };
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  // List all saved data
  async listSavedData() {
    try {
      const files = await fs.readdir(this.dataPath);
      const dataList = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.dataPath, file);
          const stats = await fs.stat(filePath);
          const fileContent = await fs.readFile(filePath, 'utf8');
          const parsedData = JSON.parse(fileContent);

          dataList.push({
            filename: file,
            filePath: filePath,
            size: stats.size,
            created: stats.birthtime.toISOString(),
            modified: stats.mtime.toISOString(),
            metadata: parsedData.metadata
          });
        }
      }

      return dataList.sort((a, b) => new Date(b.created) - new Date(a.created));
    } catch (error) {
      console.error('❌ Failed to list saved data:', error);
      throw error;
    }
  }

  // Delete saved data
  async deleteData(filename) {
    try {
      const filePath = path.join(this.dataPath, `${filename}.json`);
      await fs.unlink(filePath);
      console.log(`🗑️ Data deleted: ${filePath}`);
      
      return { success: true, deletedFile: filePath };
    } catch (error) {
      console.error('❌ Failed to delete data:', error);
      throw error;
    }
  }

  // Helper methods
  calculateStatistics(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return {};
    }

    const stats = {
      count: data.length,
      numericFields: {},
      categoricalFields: {},
      dateFields: {}
    };

    // Analyze first item to determine field types
    const firstItem = data[0];
    
    Object.keys(firstItem).forEach(key => {
      const values = data.map(item => item[key]).filter(val => val != null);
      
      if (values.length === 0) return;

      // Check if numeric
      if (values.every(val => !isNaN(val))) {
        const numValues = values.map(val => Number(val));
        stats.numericFields[key] = {
          min: Math.min(...numValues),
          max: Math.max(...numValues),
          mean: numValues.reduce((a, b) => a + b, 0) / numValues.length,
          median: this.calculateMedian(numValues),
          stdDev: this.calculateStandardDeviation(numValues)
        };
      }
      // Check if date
      else if (values.every(val => !isNaN(Date.parse(val)))) {
        const dates = values.map(val => new Date(val));
        stats.dateFields[key] = {
          earliest: new Date(Math.min(...dates)).toISOString(),
          latest: new Date(Math.max(...dates)).toISOString(),
          range: Math.max(...dates) - Math.min(...dates)
        };
      }
      // Categorical
      else {
        const frequency = {};
        values.forEach(val => {
          frequency[val] = (frequency[val] || 0) + 1;
        });
        stats.categoricalFields[key] = {
          unique: Object.keys(frequency).length,
          mostCommon: Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b),
          frequency: frequency
        };
      }
    });

    return stats;
  }

  async generateInsights(data, statistics) {
    const insights = [];

    // Data quality insights
    if (statistics.count > 0) {
      insights.push({
        type: 'data_volume',
        level: 'info',
        message: `Dataset contains ${statistics.count} records`,
        recommendation: 'Consider data sampling for large datasets'
      });
    }

    // Numeric field insights
    Object.entries(statistics.numericFields || {}).forEach(([field, stats]) => {
      const cv = stats.stdDev / stats.mean; // Coefficient of variation
      if (cv > 1) {
        insights.push({
          type: 'variability',
          level: 'warning',
          field: field,
          message: `High variability detected in ${field} (CV: ${cv.toFixed(2)})`,
          recommendation: 'Consider data normalization or transformation'
        });
      }
    });

    // Categorical field insights
    Object.entries(statistics.categoricalFields || {}).forEach(([field, stats]) => {
      if (stats.unique / statistics.count > 0.5) {
        insights.push({
          type: 'cardinality',
          level: 'info',
          field: field,
          message: `High cardinality in ${field} (${stats.unique} unique values)`,
          recommendation: 'Consider encoding strategies for machine learning'
        });
      }
    });

    return insights;
  }

  async generateRecommendations(data, insights) {
    const recommendations = [];

    // Analyze insights to generate recommendations
    const warningInsights = insights.filter(i => i.level === 'warning');
    const infoInsights = insights.filter(i => i.level === 'info');

    if (warningInsights.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'data_quality',
        title: 'Address Data Quality Issues',
        description: `${warningInsights.length} data quality issues detected`,
        actions: warningInsights.map(i => i.recommendation)
      });
    }

    if (data.length > 10000) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        title: 'Optimize Large Dataset',
        description: 'Dataset is large and may impact performance',
        actions: ['Consider data pagination', 'Implement data indexing', 'Use data compression']
      });
    }

    return recommendations;
  }

  assessDataQuality(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return { score: 0, issues: ['Empty or invalid dataset'] };
    }

    const issues = [];
    let qualityScore = 100;

    // Check for null values
    const nullCount = data.filter(item => 
      Object.values(item).some(val => val === null || val === undefined)
    ).length;
    
    if (nullCount > 0) {
      qualityScore -= (nullCount / data.length) * 20;
      issues.push(`${nullCount} records with null values`);
    }

    // Check for duplicates
    const uniqueRecords = new Set(data.map(item => JSON.stringify(item)));
    if (uniqueRecords.size < data.length) {
      qualityScore -= ((data.length - uniqueRecords.size) / data.length) * 15;
      issues.push(`${data.length - uniqueRecords.size} duplicate records`);
    }

    return {
      score: Math.max(0, qualityScore),
      issues: issues,
      grade: qualityScore >= 90 ? 'A' : qualityScore >= 80 ? 'B' : qualityScore >= 70 ? 'C' : 'D'
    };
  }

  // Utility methods
  getDataSize(data) {
    return JSON.stringify(data).length;
  }

  calculateChecksum(data) {
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  }

  calculateMedian(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  calculateStandardDeviation(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }

  isValidData(item) {
    if (item === null || item === undefined) return false;
    if (typeof item === 'object' && Object.keys(item).length === 0) return false;
    return true;
  }

  optimizeDataStructure(data) {
    // Remove undefined values and optimize structure
    if (Array.isArray(data)) {
      return data.map(item => {
        const optimized = {};
        Object.keys(item).forEach(key => {
          if (item[key] !== undefined && item[key] !== null) {
            optimized[key] = item[key];
          }
        });
        return optimized;
      });
    }
    return data;
  }

  analyzePatterns(data) {
    // Simple pattern analysis
    const patterns = {
      trends: [],
      seasonality: [],
      correlations: []
    };

    // This would be enhanced with more sophisticated AI algorithms
    return patterns;
  }

  generatePredictions(patterns) {
    // Simple prediction generation
    return [
      {
        type: 'trend',
        prediction: 'stable',
        confidence: 0.75,
        timeframe: 'next_30_days'
      }
    ];
  }

  calculateConfidence(patterns, predictions) {
    // Simple confidence calculation
    return 0.75;
  }

  performClustering(data) {
    // Simple clustering implementation
    const clusters = [];
    
    // This would be enhanced with k-means or other clustering algorithms
    clusters.push({
      id: 0,
      centroid: { x: 0, y: 0 },
      members: data.slice(0, Math.ceil(data.length / 2))
    });
    
    if (data.length > 1) {
      clusters.push({
        id: 1,
        centroid: { x: 1, y: 1 },
        members: data.slice(Math.ceil(data.length / 2))
      });
    }

    return clusters;
  }

  analyzeClusterCharacteristics(cluster) {
    return {
      avgValue: cluster.members.length,
      density: cluster.members.length / 100, // Normalized
      cohesion: 0.8
    };
  }

  detectStatisticalAnomalies(data) {
    const anomalies = [];
    
    // Simple statistical anomaly detection
    // This would be enhanced with more sophisticated algorithms
    
    return anomalies;
  }

  detectPatternAnomalies(data) {
    const anomalies = [];
    
    // Simple pattern anomaly detection
    // This would be enhanced with more sophisticated algorithms
    
    return anomalies;
  }

  generateAnomalyRecommendations(anomalies) {
    return [
      'Review anomalous data points',
      'Consider data validation rules',
      'Implement automated monitoring'
    ];
  }
}

module.exports = DataProcessingAI;
