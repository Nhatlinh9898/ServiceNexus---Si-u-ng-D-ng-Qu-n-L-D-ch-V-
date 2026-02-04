// Anomaly Detection System for ServiceNexus
// Detects unusual patterns and potential issues using various ML algorithms

const { IsolationForest, OneClassSVM } = require('ml-matrix');
const { zScore, movingAverage } = require('simple-statistics');
const logger = require('../utils/logger');
const { Service, User, Organization } = require('../models');

class AnomalyDetection {
  constructor() {
    this.models = new Map();
    this.thresholds = new Map();
    this.baselineStats = new Map();
    this.anomalyHistory = new Map();
    this.alertThresholds = {
      CRITICAL: 0.9,
      HIGH: 0.7,
      MEDIUM: 0.5,
      LOW: 0.3
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      logger.info('🔍 Initializing Anomaly Detection System...');
      
      // Initialize detection models
      await this.initializeModels();
      
      // Calculate baseline statistics
      await this.calculateBaselines();
      
      logger.info('✅ Anomaly Detection System initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Anomaly Detection System:', error);
    }
  }

  // Detect anomalies in service data
  async detectServiceAnomalies(organizationId, timeWindow = 24) {
    try {
      const services = await this.getRecentServices(organizationId, timeWindow);
      const anomalies = [];
      
      // Detect various types of anomalies
      const volumeAnomalies = await this.detectVolumeAnomalies(services);
      const valueAnomalies = await this.detectValueAnomalies(services);
      const durationAnomalies = await this.detectDurationAnomalies(services);
      const patternAnomalies = await this.detectPatternAnomalies(services);
      
      // Combine and categorize anomalies
      const allAnomalies = [
        ...volumeAnomalies.map(a => ({ ...a, type: 'volume' })),
        ...valueAnomalies.map(a => ({ ...a, type: 'value' })),
        ...durationAnomalies.map(a => ({ ...a, type: 'duration' })),
        ...patternAnomalies.map(a => ({ ...a, type: 'pattern' }))
      ];
      
      // Filter and rank anomalies
      const significantAnomalies = allAnomalies
        .filter(a => a.severity >= this.alertThresholds.MEDIUM)
        .sort((a, b) => b.severity - a.severity);
      
      return {
        anomalies: significantAnomalies,
        summary: this.generateAnomalySummary(significantAnomalies),
        recommendations: this.generateAnomalyRecommendations(significantAnomalies),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error detecting service anomalies:', error);
      return { anomalies: [], summary: {}, recommendations: [] };
    }
  }

  // Detect anomalies in user behavior
  async detectUserAnomalies(userId, timeWindow = 7) {
    try {
      const userActivities = await this.getUserActivities(userId, timeWindow);
      const anomalies = [];
      
      // Login pattern anomalies
      const loginAnomalies = await this.detectLoginAnomalies(userActivities);
      
      // Activity level anomalies
      const activityAnomalies = await this.detectActivityAnomalies(userActivities);
      
      // Performance anomalies
      const performanceAnomalies = await this.detectPerformanceAnomalies(userActivities);
      
      // Security anomalies
      const securityAnomalies = await this.detectSecurityAnomalies(userActivities);
      
      const allAnomalies = [
        ...loginAnomalies.map(a => ({ ...a, type: 'login' })),
        ...activityAnomalies.map(a => ({ ...a, type: 'activity' })),
        ...performanceAnomalies.map(a => ({ ...a, type: 'performance' })),
        ...securityAnomalies.map(a => ({ ...a, type: 'security' }))
      ];
      
      return {
        anomalies: allAnomalies.sort((a, b) => b.severity - a.severity),
        riskScore: this.calculateUserRiskScore(allAnomalies),
        recommendations: this.generateUserRecommendations(allAnomalies)
      };
    } catch (error) {
      logger.error('Error detecting user anomalies:', error);
      return { anomalies: [], riskScore: 0, recommendations: [] };
    }
  }

  // Detect financial anomalies
  async detectFinancialAnomalies(organizationId, timeWindow = 30) {
    try {
      const financialData = await this.getFinancialData(organizationId, timeWindow);
      const anomalies = [];
      
      // Revenue anomalies
      const revenueAnomalies = await this.detectRevenueAnomalies(financialData);
      
      // Transaction anomalies
      const transactionAnomalies = await this.detectTransactionAnomalies(financialData);
      
      // Pricing anomalies
      const pricingAnomalies = await this.detectPricingAnomalies(financialData);
      
      // Cash flow anomalies
      const cashFlowAnomalies = await this.detectCashFlowAnomalies(financialData);
      
      const allAnomalies = [
        ...revenueAnomalies.map(a => ({ ...a, type: 'revenue' })),
        ...transactionAnomalies.map(a => ({ ...a, type: 'transaction' })),
        ...pricingAnomalies.map(a => ({ ...a, type: 'pricing' })),
        ...cashFlowAnomalies.map(a => ({ ...a, type: 'cash_flow' }))
      ];
      
      return {
        anomalies: allAnomalies.sort((a, b) => b.severity - a.severity),
        financialHealth: this.assessFinancialHealth(financialData, allAnomalies),
        alerts: this.generateFinancialAlerts(allAnomalies)
      };
    } catch (error) {
      logger.error('Error detecting financial anomalies:', error);
      return { anomalies: [], financialHealth: 'unknown', alerts: [] };
    }
  }

  // Detect system performance anomalies
  async detectSystemAnomalies() {
    try {
      const systemMetrics = await this.getSystemMetrics();
      const anomalies = [];
      
      // CPU usage anomalies
      const cpuAnomalies = await this.detectCPUAnomalies(systemMetrics);
      
      // Memory usage anomalies
      const memoryAnomalies = await this.detectMemoryAnomalies(systemMetrics);
      
      // Response time anomalies
      const responseAnomalies = await this.detectResponseAnomalies(systemMetrics);
      
      // Error rate anomalies
      const errorAnomalies = await this.detectErrorAnomalies(systemMetrics);
      
      const allAnomalies = [
        ...cpuAnomalies.map(a => ({ ...a, type: 'cpu' })),
        ...memoryAnomalies.map(a => ({ ...a, type: 'memory' })),
        ...responseAnomalies.map(a => ({ ...a, type: 'response_time' })),
        ...errorAnomalies.map(a => ({ ...a, type: 'error_rate' }))
      ];
      
      return {
        anomalies: allAnomalies.sort((a, b) => b.severity - a.severity),
        systemHealth: this.assessSystemHealth(systemMetrics, allAnomalies),
        recommendations: this.generateSystemRecommendations(allAnomalies)
      };
    } catch (error) {
      logger.error('Error detecting system anomalies:', error);
      return { anomalies: [], systemHealth: 'unknown', recommendations: [] };
    }
  }

  // Specific anomaly detection methods
  async detectVolumeAnomalies(services) {
    try {
      const volumeData = this.calculateVolumeData(services);
      const baseline = this.baselineStats.get('service_volume');
      
      if (!baseline) {
        return [];
      }

      const anomalies = [];
      const zScores = volumeData.map(v => zScore(v, baseline.mean, baseline.std));
      
      for (let i = 0; i < volumeData.length; i++) {
        const score = Math.abs(zScores[i]);
        
        if (score > 2) { // Threshold for anomaly
          anomalies.push({
            timestamp: volumeData[i].timestamp,
            value: volumeData[i].volume,
            expected: baseline.mean,
            deviation: score,
            severity: this.calculateSeverity(score),
            description: `Unusual service volume: ${volumeData[i].volume} services (expected: ${baseline.mean.toFixed(1)})`
          });
        }
      }
      
      return anomalies;
    } catch (error) {
      logger.error('Error detecting volume anomalies:', error);
      return [];
    }
  }

  async detectValueAnomalies(services) {
    try {
      const values = services.map(s => s.amount || 0);
      const baseline = this.baselineStats.get('service_values');
      
      if (!baseline || values.length === 0) {
        return [];
      }

      const anomalies = [];
      
      for (const service of services) {
        if (!service.amount) continue;
        
        const zScoreValue = Math.abs(zScore(service.amount, baseline.mean, baseline.std));
        
        if (zScoreValue > 2.5) {
          anomalies.push({
            serviceId: service.id,
            value: service.amount,
            expected: baseline.mean,
            deviation: zScoreValue,
            severity: this.calculateSeverity(zScoreValue),
            description: `Unusual service value: $${service.amount} (expected: $${baseline.mean.toFixed(2)})`
          });
        }
      }
      
      return anomalies;
    } catch (error) {
      logger.error('Error detecting value anomalies:', error);
      return [];
    }
  }

  async detectDurationAnomalies(services) {
    try {
      const durations = services
        .filter(s => s.completedAt && s.createdAt)
        .map(s => this.calculateDuration(s));
      
      const baseline = this.baselineStats.get('service_durations');
      
      if (!baseline || durations.length === 0) {
        return [];
      }

      const anomalies = [];
      
      for (const service of services) {
        if (!service.completedAt || !service.createdAt) continue;
        
        const duration = this.calculateDuration(service);
        const zScoreValue = Math.abs(zScore(duration, baseline.mean, baseline.std));
        
        if (zScoreValue > 2) {
          anomalies.push({
            serviceId: service.id,
            duration: duration,
            expected: baseline.mean,
            deviation: zScoreValue,
            severity: this.calculateSeverity(zScoreValue),
            description: `Unusual service duration: ${duration} days (expected: ${baseline.mean.toFixed(1)} days)`
          });
        }
      }
      
      return anomalies;
    } catch (error) {
      logger.error('Error detecting duration anomalies:', error);
      return [];
    }
  }

  async detectPatternAnomalies(services) {
    try {
      // Use Isolation Forest for pattern detection
      const features = this.extractServiceFeatures(services);
      const model = this.models.get('service_pattern');
      
      if (!model || features.length === 0) {
        return [];
      }

      const anomalies = [];
      const predictions = model.predict(features);
      
      for (let i = 0; i < predictions.length; i++) {
        if (predictions[i] === -1) { // Anomaly detected
          anomalies.push({
            serviceId: services[i].id,
            anomalyScore: model.decisionFunction([features[i]])[0],
            severity: this.calculateSeverity(Math.abs(model.decisionFunction([features[i]])[0])),
            description: 'Unusual service pattern detected',
            features: features[i]
          });
        }
      }
      
      return anomalies;
    } catch (error) {
      logger.error('Error detecting pattern anomalies:', error);
      return [];
    }
  }

  // User anomaly detection methods
  async detectLoginAnomalies(userActivities) {
    try {
      const logins = userActivities.filter(a => a.type === 'login');
      const baseline = this.baselineStats.get('user_login_patterns');
      
      if (!baseline || logins.length === 0) {
        return [];
      }

      const anomalies = [];
      
      for (const login of logins) {
        const hour = new Date(login.timestamp).getHours();
        const dayOfWeek = new Date(login.timestamp).getDay();
        
        // Check for unusual login times
        if (!baseline.typicalHours.includes(hour) || !baseline.typicalDays.includes(dayOfWeek)) {
          anomalies.push({
            timestamp: login.timestamp,
            type: 'unusual_time',
            severity: this.alertThresholds.MEDIUM,
            description: `Unusual login time: ${hour}:00 on day ${dayOfWeek}`
          });
        }
        
        // Check for unusual locations
        if (login.location && !baseline.typicalLocations.includes(login.location)) {
          anomalies.push({
            timestamp: login.timestamp,
            type: 'unusual_location',
            severity: this.alertThresholds.HIGH,
            description: `Login from unusual location: ${login.location}`
          });
        }
      }
      
      return anomalies;
    } catch (error) {
      logger.error('Error detecting login anomalies:', error);
      return [];
    }
  }

  async detectActivityAnomalies(userActivities) {
    try {
      const activityLevels = this.calculateActivityLevels(userActivities);
      const baseline = this.baselineStats.get('user_activity_levels');
      
      if (!baseline) {
        return [];
      }

      const anomalies = [];
      
      for (const [date, level] of Object.entries(activityLevels)) {
        const zScoreValue = Math.abs(zScore(level, baseline.mean, baseline.std));
        
        if (zScoreValue > 2) {
          anomalies.push({
            date: new Date(date),
            activityLevel: level,
            expected: baseline.mean,
            deviation: zScoreValue,
            severity: this.calculateSeverity(zScoreValue),
            description: `Unusual activity level: ${level} activities (expected: ${baseline.mean.toFixed(1)})`
          });
        }
      }
      
      return anomalies;
    } catch (error) {
      logger.error('Error detecting activity anomalies:', error);
      return [];
    }
  }

  // Utility methods
  calculateSeverity(deviation) {
    if (deviation > 3) return this.alertThresholds.CRITICAL;
    if (deviation > 2.5) return this.alertThresholds.HIGH;
    if (deviation > 2) return this.alertThresholds.MEDIUM;
    return this.alertThresholds.LOW;
  }

  calculateDuration(service) {
    const start = new Date(service.createdAt);
    const end = new Date(service.completedAt);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24)); // days
  }

  calculateVolumeData(services) {
    const volumeByHour = new Map();
    
    for (const service of services) {
      const hour = new Date(service.createdAt).setMinutes(0, 0, 0);
      const current = volumeByHour.get(hour) || 0;
      volumeByHour.set(hour, current + 1);
    }
    
    return Array.from(volumeByHour.entries()).map(([timestamp, volume]) => ({
      timestamp: new Date(timestamp),
      volume
    }));
  }

  extractServiceFeatures(services) {
    return services.map(service => [
      service.amount || 0,
      service.description?.length || 0,
      service.tags?.length || 0,
      new Date(service.createdAt).getDay(),
      new Date(service.createdAt).getMonth(),
      this.encodePriority(service.priority),
      this.encodeIndustry(service.industry)
    ]);
  }

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

  calculateActivityLevels(userActivities) {
    const levels = {};
    
    for (const activity of userActivities) {
      const date = new Date(activity.timestamp).toDateString();
      levels[date] = (levels[date] || 0) + 1;
    }
    
    return levels;
  }

  // Model management
  async initializeModels() {
    try {
      // Initialize Isolation Forest for pattern detection
      const isolationForest = new IsolationForest({
        nEstimators: 100,
        maxSamples: 'auto',
        contamination: 0.1,
        maxFeatures: 1.0
      });
      
      this.models.set('service_pattern', isolationForest);
      
      // Initialize One-Class SVM for anomaly detection
      const oneClassSVM = new OneClassSVM({
        kernel: 'rbf',
        gamma: 'scale',
        nu: 0.1
      });
      
      this.models.set('user_behavior', oneClassSVM);
      
    } catch (error) {
      logger.error('Error initializing anomaly detection models:', error);
    }
  }

  async calculateBaselines() {
    try {
      // Calculate baseline statistics for various metrics
      const services = await Service.find({});
      
      // Service volume baseline
      const volumeData = this.calculateVolumeData(services);
      const volumes = volumeData.map(v => v.volume);
      this.baselineStats.set('service_volume', {
        mean: volumes.reduce((a, b) => a + b, 0) / volumes.length,
        std: Math.sqrt(volumes.reduce((sq, n) => sq + Math.pow(n - (volumes.reduce((a, b) => a + b, 0) / volumes.length), 2), 0) / volumes.length)
      });
      
      // Service values baseline
      const values = services.map(s => s.amount || 0).filter(v => v > 0);
      if (values.length > 0) {
        this.baselineStats.set('service_values', {
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          std: Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - (values.reduce((a, b) => a + b, 0) / values.length), 2), 0) / values.length)
        });
      }
      
      // Service durations baseline
      const durations = services
        .filter(s => s.completedAt && s.createdAt)
        .map(s => this.calculateDuration(s));
      
      if (durations.length > 0) {
        this.baselineStats.set('service_durations', {
          mean: durations.reduce((a, b) => a + b, 0) / durations.length,
          std: Math.sqrt(durations.reduce((sq, n) => sq + Math.pow(n - (durations.reduce((a, b) => a + b, 0) / durations.length), 2), 0) / durations.length)
        });
      }
      
    } catch (error) {
      logger.error('Error calculating baselines:', error);
    }
  }

  // Data retrieval methods
  async getRecentServices(organizationId, timeWindow) {
    const cutoff = new Date(Date.now() - timeWindow * 60 * 60 * 1000);
    return await Service.find({
      organization: organizationId,
      createdAt: { $gte: cutoff }
    }).populate('assignedTo createdBy');
  }

  async getUserActivities(userId, timeWindow) {
    // This would query user activity logs
    // For now, return empty array
    return [];
  }

  async getFinancialData(organizationId, timeWindow) {
    // This would query financial records
    // For now, return empty array
    return [];
  }

  async getSystemMetrics() {
    // This would query system monitoring data
    // For now, return empty array
    return [];
  }

  // Report generation methods
  generateAnomalySummary(anomalies) {
    const summary = {
      total: anomalies.length,
      byType: {},
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      mostCommon: null
    };
    
    for (const anomaly of anomalies) {
      // Count by type
      summary.byType[anomaly.type] = (summary.byType[anomaly.type] || 0) + 1;
      
      // Count by severity
      if (anomaly.severity >= this.alertThresholds.CRITICAL) summary.bySeverity.critical++;
      else if (anomaly.severity >= this.alertThresholds.HIGH) summary.bySeverity.high++;
      else if (anomaly.severity >= this.alertThresholds.MEDIUM) summary.bySeverity.medium++;
      else summary.bySeverity.low++;
    }
    
    // Find most common type
    let maxCount = 0;
    for (const [type, count] of Object.entries(summary.byType)) {
      if (count > maxCount) {
        maxCount = count;
        summary.mostCommon = type;
      }
    }
    
    return summary;
  }

  generateAnomalyRecommendations(anomalies) {
    const recommendations = [];
    
    if (anomalies.some(a => a.type === 'volume')) {
      recommendations.push('Review resource allocation for unusual service volumes');
    }
    
    if (anomalies.some(a => a.type === 'value')) {
      recommendations.push('Investigate unusual service pricing or values');
    }
    
    if (anomalies.some(a => a.type === 'duration')) {
      recommendations.push('Analyze service completion time patterns');
    }
    
    if (anomalies.some(a => a.severity >= this.alertThresholds.HIGH)) {
      recommendations.push('Immediate investigation required for high-severity anomalies');
    }
    
    return recommendations;
  }

  calculateUserRiskScore(anomalies) {
    if (anomalies.length === 0) return 0;
    
    const totalRisk = anomalies.reduce((sum, a) => sum + a.severity, 0);
    return Math.min(1.0, totalRisk / anomalies.length);
  }

  generateUserRecommendations(anomalies) {
    const recommendations = [];
    
    if (anomalies.some(a => a.type === 'security')) {
      recommendations.push('Review security settings and enable 2FA');
    }
    
    if (anomalies.some(a => a.type === 'login')) {
      recommendations.push('Verify recent login activities');
    }
    
    if (anomalies.some(a => a.type === 'performance')) {
      recommendations.push('Provide performance coaching or training');
    }
    
    return recommendations;
  }

  assessFinancialHealth(financialData, anomalies) {
    if (anomalies.length === 0) return 'healthy';
    if (anomalies.some(a => a.severity >= this.alertThresholds.CRITICAL)) return 'critical';
    if (anomalies.some(a => a.severity >= this.alertThresholds.HIGH)) return 'warning';
    return 'healthy';
  }

  generateFinancialAlerts(anomalies) {
    return anomalies
      .filter(a => a.severity >= this.alertThresholds.HIGH)
      .map(a => ({
        type: a.type,
        message: a.description,
        severity: a.severity
      }));
  }

  assessSystemHealth(systemMetrics, anomalies) {
    if (anomalies.length === 0) return 'healthy';
    if (anomalies.some(a => a.severity >= this.alertThresholds.CRITICAL)) return 'critical';
    if (anomalies.some(a => a.severity >= this.alertThresholds.HIGH)) return 'degraded';
    return 'healthy';
  }

  generateSystemRecommendations(anomalies) {
    const recommendations = [];
    
    if (anomalies.some(a => a.type === 'cpu')) {
      recommendations.push('Scale up CPU resources or optimize CPU-intensive processes');
    }
    
    if (anomalies.some(a => a.type === 'memory')) {
      recommendations.push('Increase memory allocation or optimize memory usage');
    }
    
    if (anomalies.some(a => a.type === 'response_time')) {
      recommendations.push('Optimize database queries and API response times');
    }
    
    if (anomalies.some(a => a.type === 'error_rate')) {
      recommendations.push('Investigate and fix application errors');
    }
    
    return recommendations;
  }

  // Update and maintenance methods
  async updateModels() {
    try {
      logger.info('🔄 Updating anomaly detection models...');
      
      // Retrain models with new data
      await this.calculateBaselines();
      
      logger.info('✅ Anomaly detection models updated');
    } catch (error) {
      logger.error('❌ Error updating anomaly detection models:', error);
    }
  }

  async cleanup() {
    try {
      this.models.clear();
      this.thresholds.clear();
      this.baselineStats.clear();
      this.anomalyHistory.clear();
      
      logger.info('🧹 Anomaly Detection System cleaned up');
    } catch (error) {
      logger.error('Error cleaning up Anomaly Detection System:', error);
    }
  }
}

module.exports = AnomalyDetection;
