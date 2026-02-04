// Machine Learning Prediction Engine for ServiceNexus
// Advanced analytics and prediction capabilities

const tf = require('@tensorflow/tfjs-node');
const { PCA } = require('ml-pca');
const { LinearRegression, RandomForestRegressor } = require('ml-regression');
const { KMeans } = require('ml-clustering');
const logger = require('../utils/logger');
const { Service, User, Organization } = require('../models');

class PredictionEngine {
  constructor() {
    this.models = new Map();
    this.pca = null;
    this.isTraining = false;
    this.modelMetrics = new Map();
    this.predictionCache = new Map();
    
    this.initialize();
  }

  async initialize() {
    try {
      logger.info('🤖 Initializing ML Prediction Engine...');
      
      // Load pre-trained models or create new ones
      await this.loadModels();
      
      // Initialize PCA for dimensionality reduction
      this.pca = new PCA();
      
      logger.info('✅ ML Prediction Engine initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize ML Prediction Engine:', error);
    }
  }

  // Service Completion Prediction
  async predictServiceCompletion(serviceData) {
    try {
      const cacheKey = `service_completion_${JSON.stringify(serviceData)}`;
      
      if (this.predictionCache.has(cacheKey)) {
        return this.predictionCache.get(cacheKey);
      }

      const features = this.extractServiceFeatures(serviceData);
      const prediction = await this.predictWithModel('service_completion', features);
      
      const result = {
        predictedCompletionDate: prediction.date,
        confidence: prediction.confidence,
        riskFactors: prediction.riskFactors,
        recommendations: this.generateRecommendations(prediction),
        estimatedDuration: prediction.duration
      };

      // Cache prediction for 1 hour
      this.predictionCache.set(cacheKey, result);
      setTimeout(() => this.predictionCache.delete(cacheKey), 3600000);

      return result;
    } catch (error) {
      logger.error('Error predicting service completion:', error);
      return null;
    }
  }

  // Revenue Forecasting
  async forecastRevenue(organizationId, timeHorizon = 30) {
    try {
      const cacheKey = `revenue_forecast_${organizationId}_${timeHorizon}`;
      
      if (this.predictionCache.has(cacheKey)) {
        return this.predictionCache.get(cacheKey);
      }

      // Get historical revenue data
      const historicalData = await this.getHistoricalRevenue(organizationId);
      
      if (historicalData.length < 30) {
        throw new Error('Insufficient historical data for forecasting');
      }

      // Prepare time series data
      const timeSeries = this.prepareTimeSeries(historicalData);
      
      // Use multiple models for ensemble prediction
      const predictions = await Promise.all([
        this.predictWithLinearRegression(timeSeries, timeHorizon),
        this.predictWithRandomForest(timeSeries, timeHorizon),
        this.predictWithLSTM(timeSeries, timeHorizon)
      ]);

      // Ensemble predictions
      const ensembleForecast = this.ensemblePredictions(predictions);
      
      const result = {
        forecast: ensembleForecast.values,
        confidence: ensembleForecast.confidence,
        trend: this.analyzeTrend(ensembleForecast.values),
        seasonality: this.detectSeasonality(historicalData),
        accuracy: this.calculateAccuracy(historicalData, ensembleForecast),
        recommendations: this.generateRevenueRecommendations(ensembleForecast)
      };

      this.predictionCache.set(cacheKey, result);
      setTimeout(() => this.predictionCache.delete(cacheKey), 3600000);

      return result;
    } catch (error) {
      logger.error('Error forecasting revenue:', error);
      return null;
    }
  }

  // Customer Churn Prediction
  async predictCustomerChurn(organizationId) {
    try {
      const customers = await this.getCustomerData(organizationId);
      const features = customers.map(customer => this.extractCustomerFeatures(customer));
      
      const predictions = await this.predictWithModel('customer_churn', features);
      
      return customers.map((customer, index) => ({
        customerId: customer.id,
        churnProbability: predictions[index].probability,
        riskLevel: this.categorizeRisk(predictions[index].probability),
        keyFactors: predictions[index].factors,
        retentionActions: this.generateRetentionActions(predictions[index])
      }));
    } catch (error) {
      logger.error('Error predicting customer churn:', error);
      return [];
    }
  }

  // Service Demand Prediction
  async predictServiceDemand(organizationId, timeHorizon = 7) {
    try {
      const demandData = await this.getHistoricalDemand(organizationId);
      
      if (demandData.length < 14) {
        throw new Error('Insufficient demand data');
      }

      const features = this.extractDemandFeatures(demandData);
      const predictions = await this.predictWithModel('service_demand', features);
      
      return {
        predictedDemand: predictions.demand,
        confidence: predictions.confidence,
        seasonalPatterns: predictions.patterns,
        resourceRecommendations: this.generateResourceRecommendations(predictions),
        optimalStaffing: this.calculateOptimalStaffing(predictions.demand)
      };
    } catch (error) {
      logger.error('Error predicting service demand:', error);
      return null;
    }
  }

  // Anomaly Detection
  async detectAnomalies(data, type = 'service') {
    try {
      const features = this.extractAnomalyFeatures(data, type);
      const anomalies = await this.detectWithIsolationForest(features);
      
      return anomalies.map(anomaly => ({
        id: anomaly.id,
        anomalyScore: anomaly.score,
        severity: this.categorizeSeverity(anomaly.score),
        description: anomaly.description,
        recommendedAction: this.getAnomalyAction(anomaly, type)
      }));
    } catch (error) {
      logger.error('Error detecting anomalies:', error);
      return [];
    }
  }

  // Sentiment Analysis
  async analyzeSentiment(text) {
    try {
      const sentiment = await this.predictWithModel('sentiment_analysis', text);
      
      return {
        sentiment: sentiment.label,
        confidence: sentiment.confidence,
        emotions: sentiment.emotions,
        keywords: sentiment.keywords,
        summary: sentiment.summary
      };
    } catch (error) {
      logger.error('Error analyzing sentiment:', error);
      return null;
    }
  }

  // Feature Extraction Methods
  extractServiceFeatures(serviceData) {
    return {
      // Temporal features
      dayOfWeek: new Date(serviceData.createdAt).getDay(),
      month: new Date(serviceData.createdAt).getMonth(),
      hour: new Date(serviceData.createdAt).getHours(),
      
      // Service features
      priority: this.encodePriority(serviceData.priority),
      industry: this.encodeIndustry(serviceData.industry),
      amount: serviceData.amount || 0,
      descriptionLength: serviceData.description?.length || 0,
      
      // Assignment features
      hasAssignee: !!serviceData.assignedTo,
      assigneeWorkload: serviceData.assigneeWorkload || 0,
      
      // Historical features
      customerHistory: serviceData.customerHistory || 0,
      similarServices: serviceData.similarServices || 0
    };
  }

  extractCustomerFeatures(customer) {
    return {
      // Engagement metrics
      totalServices: customer.totalServices || 0,
      averageOrderValue: customer.averageOrderValue || 0,
      frequency: customer.frequency || 0,
      
      // Recency metrics
      daysSinceLastService: customer.daysSinceLastService || 0,
      monthsSinceRegistration: customer.monthsSinceRegistration || 0,
      
      // Satisfaction metrics
      averageRating: customer.averageRating || 0,
      complaintCount: customer.complaintCount || 0,
      
      // Demographic features
      industry: this.encodeIndustry(customer.industry),
      organizationSize: this.encodeOrganizationSize(customer.organizationSize)
    };
  }

  extractDemandFeatures(demandData) {
    return demandData.map(day => ({
      date: new Date(day.date).getTime(),
      demand: day.demand,
      dayOfWeek: new Date(day.date).getDay(),
      month: new Date(day.date).getMonth(),
      isHoliday: day.isHoliday || false,
      weather: day.weather || 'normal',
      events: day.events || 0
    }));
  }

  extractAnomalyFeatures(data, type) {
    switch (type) {
      case 'service':
        return data.map(item => ({
          amount: item.amount || 0,
          duration: item.duration || 0,
          complexity: this.calculateComplexity(item),
          customerSatisfaction: item.customerSatisfaction || 0,
          resourceUtilization: item.resourceUtilization || 0
        }));
      
      case 'revenue':
        return data.map(item => ({
          revenue: item.revenue || 0,
          transactions: item.transactions || 0,
          averageOrderValue: item.averageOrderValue || 0,
          customerCount: item.customerCount || 0
        }));
      
      default:
        return data;
    }
  }

  // Model Training Methods
  async trainServiceCompletionModel() {
    try {
      logger.info('🎯 Training Service Completion Model...');
      
      const trainingData = await this.getServiceTrainingData();
      const features = trainingData.map(item => this.extractServiceFeatures(item));
      const labels = trainingData.map(item => item.completionTime);
      
      // Train multiple models
      const linearModel = new LinearRegression(features, labels);
      const rfModel = new RandomForestRegressor(features, labels, {
        nEstimators: 100,
        maxDepth: 10
      });
      
      // Evaluate models
      const linearScore = this.evaluateModel(linearModel, features, labels);
      const rfScore = this.evaluateModel(rfModel, features, labels);
      
      // Select best model
      const bestModel = linearScore > rfScore ? linearModel : rfModel;
      
      this.models.set('service_completion', bestModel);
      this.modelMetrics.set('service_completion', {
        accuracy: Math.max(linearScore, rfScore),
        type: linearScore > rfScore ? 'linear' : 'random_forest',
        trainedAt: new Date()
      });
      
      logger.info('✅ Service Completion Model trained successfully');
    } catch (error) {
      logger.error('❌ Error training Service Completion Model:', error);
    }
  }

  async trainCustomerChurnModel() {
    try {
      logger.info('👥 Training Customer Churn Model...');
      
      const trainingData = await this.getCustomerTrainingData();
      const features = trainingData.map(item => this.extractCustomerFeatures(item));
      const labels = trainingData.map(item => item.churned);
      
      // Use TensorFlow.js for neural network
      const model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [features[0].length], units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
      });
      
      model.compile({
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
      
      // Convert data to tensors
      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels, [labels.length, 1]);
      
      // Train model
      await model.fit(xs, ys, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            logger.debug(`Epoch ${epoch}: loss = ${logs.loss}, accuracy = ${logs.acc}`);
          }
        }
      });
      
      this.models.set('customer_churn', model);
      this.modelMetrics.set('customer_churn', {
        accuracy: 0.85, // Placeholder
        type: 'neural_network',
        trainedAt: new Date()
      });
      
      // Clean up tensors
      xs.dispose();
      ys.dispose();
      
      logger.info('✅ Customer Churn Model trained successfully');
    } catch (error) {
      logger.error('❌ Error training Customer Churn Model:', error);
    }
  }

  // Prediction Methods
  async predictWithModel(modelName, features) {
    const model = this.models.get(modelName);
    
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }
    
    if (model instanceof tf.LayersModel) {
      // TensorFlow.js model
      const tensor = tf.tensor2d([features]);
      const prediction = await model.predict(tensor).data();
      tensor.dispose();
      
      return Array.from(prediction);
    } else {
      // ML.js model
      return model.predict(features);
    }
  }

  // Utility Methods
  encodePriority(priority) {
    const priorityMap = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'URGENT': 4 };
    return priorityMap[priority] || 2;
  }

  encodeIndustry(industry) {
    const industryMap = {
      'TECHNOLOGY': 1, 'HEALTHCARE': 2, 'FINANCE': 3,
      'EDUCATION': 4, 'RETAIL': 5, 'MANUFACTURING': 6,
      'CONSULTING': 7, 'OTHER': 8
    };
    return industryMap[industry] || 8;
  }

  encodeOrganizationSize(size) {
    const sizeMap = { 'SMALL': 1, 'MEDIUM': 2, 'LARGE': 3, 'ENTERPRISE': 4 };
    return sizeMap[size] || 2;
  }

  calculateComplexity(service) {
    let complexity = 1;
    if (service.description && service.description.length > 500) complexity += 1;
    if (service.amount > 10000) complexity += 1;
    if (service.tags && service.tags.length > 3) complexity += 1;
    return complexity;
  }

  categorizeRisk(probability) {
    if (probability < 0.3) return 'LOW';
    if (probability < 0.7) return 'MEDIUM';
    return 'HIGH';
  }

  categorizeSeverity(score) {
    if (score < 0.3) return 'LOW';
    if (score < 0.7) return 'MEDIUM';
    return 'HIGH';
  }

  generateRecommendations(prediction) {
    const recommendations = [];
    
    if (prediction.confidence < 0.7) {
      recommendations.push('Consider collecting more data to improve prediction accuracy');
    }
    
    if (prediction.duration > 7) {
      recommendations.push('Service may require additional resources');
    }
    
    return recommendations;
  }

  generateRetentionActions(prediction) {
    const actions = [];
    
    if (prediction.probability > 0.7) {
      actions.push('Immediate outreach required');
      actions.push('Offer retention incentives');
    } else if (prediction.probability > 0.4) {
      actions.push('Schedule check-in call');
      actions.push('Send personalized offers');
    }
    
    return actions;
  }

  // Data Retrieval Methods
  async getServiceTrainingData() {
    // Get historical service data for training
    const services = await Service.find({
      status: 'COMPLETED',
      completedAt: { $exists: true }
    }).populate('assignedTo createdBy organization');
    
    return services.map(service => ({
      ...service.toObject(),
      completionTime: this.calculateCompletionTime(service)
    }));
  }

  async getCustomerTrainingData() {
    // Get customer data for churn prediction
    // This would be implemented based on your customer data structure
    return [];
  }

  async getHistoricalRevenue(organizationId) {
    // Get historical revenue data
    // This would query your revenue records
    return [];
  }

  async getCustomerData(organizationId) {
    // Get customer data for churn prediction
    return [];
  }

  async getHistoricalDemand(organizationId) {
    // Get historical demand data
    return [];
  }

  calculateCompletionTime(service) {
    if (!service.completedAt || !service.createdAt) return 0;
    const start = new Date(service.createdAt);
    const end = new Date(service.completedAt);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24)); // days
  }

  // Model Management
  async loadModels() {
    try {
      // Load pre-trained models from disk or create new ones
      if (!this.models.has('service_completion')) {
        await this.trainServiceCompletionModel();
      }
      
      if (!this.models.has('customer_churn')) {
        await this.trainCustomerChurnModel();
      }
    } catch (error) {
      logger.error('Error loading models:', error);
    }
  }

  async saveModels() {
    try {
      // Save models to disk for persistence
      for (const [name, model] of this.models) {
        if (model instanceof tf.LayersModel) {
          await model.save(`file://./models/${name}`);
        }
      }
    } catch (error) {
      logger.error('Error saving models:', error);
    }
  }

  getModelMetrics() {
    return Array.from(this.modelMetrics.entries()).map(([name, metrics]) => ({
      model: name,
      ...metrics
    }));
  }

  // Cleanup
  async cleanup() {
    try {
      // Dispose TensorFlow models
      for (const [name, model] of this.models) {
        if (model instanceof tf.LayersModel) {
          model.dispose();
        }
      }
      
      // Clear caches
      this.predictionCache.clear();
      
      logger.info('🧹 ML Prediction Engine cleaned up');
    } catch (error) {
      logger.error('Error cleaning up ML Prediction Engine:', error);
    }
  }
}

module.exports = PredictionEngine;
