// Service Management Agent
// Specialized agent for handling service-related tasks and operations

const BaseAgent = require('./baseAgent');
const { Service, User, Organization } = require('../models');
const logger = require('../utils/logger');

class ServiceAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: 'ServiceAgent',
      type: 'service',
      version: '1.0.0',
      capabilities: [
        'service_creation',
        'service_assignment',
        'service_tracking',
        'service_completion',
        'service_analysis',
        'service_optimization',
        'customer_communication',
        'quality_assurance'
      ],
      specializations: [
        'service_lifecycle',
        'customer_management',
        'resource_allocation',
        'performance_monitoring',
        'issue_resolution'
      ],
      maxConcurrentTasks: 10,
      taskTimeout: 600000, // 10 minutes
      ...config
    });
  }

  // Load service-specific knowledge base
  async loadDomainKnowledge() {
    return {
      service_types: {
        consulting: {
          typical_duration: { min: 1, max: 30, unit: 'days' },
          complexity_factors: ['scope', 'expertise_required', 'team_size'],
          quality_metrics: ['client_satisfaction', 'deliverable_quality', 'timeline_adherence']
        },
        development: {
          typical_duration: { min: 7, max: 90, unit: 'days' },
          complexity_factors: ['features', 'technology_stack', 'integration_complexity'],
          quality_metrics: ['code_quality', 'performance', 'security', 'scalability']
        },
        support: {
          typical_duration: { min: 0.1, max: 7, unit: 'days' },
          complexity_factors: ['issue_severity', 'technical_complexity', 'availability'],
          quality_metrics: ['resolution_time', 'customer_satisfaction', 'first_contact_resolution']
        }
      },
      assignment_rules: {
        workload_balance: true,
        skill_matching: true,
        availability_check: true,
        priority_weighting: true,
        historical_performance: true
      },
      quality_thresholds: {
        customer_satisfaction_min: 4.0,
        on_time_delivery_min: 0.9,
        budget_adherence_min: 0.95,
        quality_score_min: 8.0
      },
      escalation_triggers: {
        delay_threshold: 0.2, // 20% delay
        budget_overrun: 0.1, // 10% overrun
        quality_drop: 0.15, // 15% quality drop
        customer_complaint: 1
      }
    };
  }

  // Perform service-specific tasks
  async performTask(task) {
    switch (task.type) {
      case 'service_creation':
        return await this.handleServiceCreation(task.data);
      case 'service_assignment':
        return await this.handleServiceAssignment(task.data);
      case 'service_tracking':
        return await this.handleServiceTracking(task.data);
      case 'service_completion':
        return await this.handleServiceCompletion(task.data);
      case 'service_analysis':
        return await this.handleServiceAnalysis(task.data);
      case 'service_optimization':
        return await this.handleServiceOptimization(task.data);
      case 'customer_communication':
        return await this.handleCustomerCommunication(task.data);
      case 'quality_assurance':
        return await this.handleQualityAssurance(task.data);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  // Handle service creation
  async handleServiceCreation(data) {
    try {
      const {
        title,
        description,
        customerName,
        industry,
        priority,
        amount,
        organizationId,
        tags = []
      } = data;

      // Validate service data
      const validation = await this.validateServiceData(data);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Estimate service duration and complexity
      const estimation = await this.estimateServiceCharacteristics(data);

      // Create service record
      const service = new Service({
        title,
        description,
        customerName,
        industry,
        priority: priority || this.calculatePriority(data),
        amount: amount || this.estimateServiceValue(data),
        organization: organizationId,
        tags: [...tags, ...this.generateServiceTags(data)],
        estimatedDuration: estimation.duration,
        complexity: estimation.complexity,
        requiredSkills: estimation.skills,
        status: 'pending',
        createdAt: new Date()
      });

      await service.save();

      // Log service creation
      logger.info(`📋 Service created: ${service.id} - ${title}`);

      // Trigger assignment process
      if (service.priority === 'urgent' || service.priority === 'high') {
        await this.triggerImmediateAssignment(service);
      }

      return {
        success: true,
        service: service.toObject(),
        estimation,
        recommendations: this.generateServiceRecommendations(service, estimation)
      };

    } catch (error) {
      logger.error('Error in service creation:', error);
      throw error;
    }
  }

  // Handle service assignment
  async handleServiceAssignment(data) {
    try {
      const { serviceId, manualAssignment = false, assignedTo = null } = data;

      const service = await Service.findById(serviceId).populate('organization');
      if (!service) {
        throw new Error('Service not found');
      }

      if (service.status !== 'pending' && service.status !== 'reassigned') {
        throw new Error('Service cannot be assigned in current status');
      }

      let assignment;

      if (manualAssignment && assignedTo) {
        // Manual assignment
        assignment = await this.performManualAssignment(service, assignedTo);
      } else {
        // Automatic assignment
        assignment = await this.performAutomaticAssignment(service);
      }

      // Update service with assignment
      service.assignedTo = assignment.userId;
      service.assignedAt = new Date();
      service.assignmentReason = assignment.reason;
      service.estimatedCompletion = assignment.estimatedCompletion;
      service.status = 'assigned';

      await service.save();

      // Notify assigned user
      await this.notifyAssignment(service, assignment);

      // Update user workload
      await this.updateUserWorkload(assignment.userId, service);

      logger.info(`👤 Service assigned: ${serviceId} to ${assignment.userId}`);

      return {
        success: true,
        assignment,
        service: service.toObject()
      };

    } catch (error) {
      logger.error('Error in service assignment:', error);
      throw error;
    }
  }

  // Handle service tracking
  async handleServiceTracking(data) {
    try {
      const { serviceId, trackingLevel = 'standard' } = data;

      const service = await Service.findById(serviceId)
        .populate('assignedTo')
        .populate('organization');

      if (!service) {
        throw new Error('Service not found');
      }

      // Analyze current status
      const statusAnalysis = await this.analyzeServiceStatus(service);

      // Check for potential issues
      const issues = await this.identifyPotentialIssues(service);

      // Generate progress report
      const progressReport = await this.generateProgressReport(service, statusAnalysis);

      // Predict completion
      const prediction = await this.predictServiceCompletion(service, statusAnalysis);

      // Recommendations
      const recommendations = await this.generateTrackingRecommendations(
        service, 
        statusAnalysis, 
        issues
      );

      // Update service metrics
      await this.updateServiceMetrics(service, statusAnalysis);

      logger.info(`📊 Service tracked: ${serviceId} - ${statusAnalysis.status}`);

      return {
        success: true,
        service: service.toObject(),
        statusAnalysis,
        issues,
        progressReport,
        prediction,
        recommendations
      };

    } catch (error) {
      logger.error('Error in service tracking:', error);
      throw error;
    }
  }

  // Handle service completion
  async handleServiceCompletion(data) {
    try {
      const { 
        serviceId, 
        completionData, 
        customerFeedback = null,
        qualityMetrics = null 
      } = data;

      const service = await Service.findById(serviceId)
        .populate('assignedTo')
        .populate('organization');

      if (!service) {
        throw new Error('Service not found');
      }

      if (service.status !== 'assigned' && service.status !== 'in_progress') {
        throw new Error('Service cannot be completed in current status');
      }

      // Validate completion requirements
      const validation = await this.validateCompletionRequirements(service, completionData);
      if (!validation.valid) {
        throw new Error(`Completion validation failed: ${validation.errors.join(', ')}`);
      }

      // Process completion
      const completion = await this.processServiceCompletion(service, completionData);

      // Update service record
      service.status = 'completed';
      service.completedAt = new Date();
      service.completionData = completionData;
      service.actualDuration = completion.duration;
      service.qualityScore = qualityMetrics?.score || await this.calculateQualityScore(service, completionData);
      service.customerSatisfaction = customerFeedback?.satisfaction || null;

      await service.save();

      // Update user performance
      await this.updateUserPerformance(service.assignedTo, service);

      // Generate completion report
      const completionReport = await this.generateCompletionReport(service, completion);

      // Send notifications
      await this.sendCompletionNotifications(service, completionReport);

      // Archive service data for analytics
      await this.archiveServiceData(service, completionReport);

      logger.info(`✅ Service completed: ${serviceId}`);

      return {
        success: true,
        completion,
        service: service.toObject(),
        completionReport,
        recommendations: this.generatePostCompletionRecommendations(service, completionReport)
      };

    } catch (error) {
      logger.error('Error in service completion:', error);
      throw error;
    }
  }

  // Handle service analysis
  async handleServiceAnalysis(data) {
    try {
      const { 
        serviceIds, 
        analysisType = 'comprehensive',
        timeRange = '30d',
        organizationId = null 
      } = data;

      // Get services for analysis
      const services = await this.getServicesForAnalysis(serviceIds, organizationId, timeRange);

      // Perform different types of analysis
      const analyses = {};

      if (analysisType === 'comprehensive' || analysisType === 'performance') {
        analyses.performance = await this.analyzeServicePerformance(services);
      }

      if (analysisType === 'comprehensive' || analysisType === 'quality') {
        analyses.quality = await this.analyzeServiceQuality(services);
      }

      if (analysisType === 'comprehensive' || analysisType === 'efficiency') {
        analyses.efficiency = await this.analyzeServiceEfficiency(services);
      }

      if (analysisType === 'comprehensive' || analysisType === 'customer') {
        analyses.customer = await this.analyzeCustomerSatisfaction(services);
      }

      if (analysisType === 'comprehensive' || analysisType === 'financial') {
        analyses.financial = await this.analyzeFinancialPerformance(services);
      }

      // Generate insights and recommendations
      const insights = await this.generateAnalysisInsights(analyses);
      const recommendations = await this.generateAnalysisRecommendations(analyses, insights);

      logger.info(`📈 Service analysis completed: ${analysisType} for ${services.length} services`);

      return {
        success: true,
        analysisType,
        timeRange,
        serviceCount: services.length,
        analyses,
        insights,
        recommendations,
        summary: this.generateAnalysisSummary(analyses, insights)
      };

    } catch (error) {
      logger.error('Error in service analysis:', error);
      throw error;
    }
  }

  // Handle service optimization
  async handleServiceOptimization(data) {
    try {
      const { 
        optimizationType = 'all',
        targetServices = null,
        organizationId = null 
      } = data;

      // Get services for optimization
      const services = await this.getServicesForOptimization(targetServices, organizationId);

      const optimizations = {};

      if (optimizationType === 'all' || optimizationType === 'assignment') {
        optimizations.assignment = await this.optimizeServiceAssignments(services);
      }

      if (optimizationType === 'all' || optimizationType === 'workflow') {
        optimizations.workflow = await this.optimizeServiceWorkflows(services);
      }

      if (optimizationType === 'all' || optimizationType === 'resources') {
        optimizations.resources = await this.optimizeResourceAllocation(services);
      }

      if (optimizationType === 'all' || optimizationType === 'quality') {
        optimizations.quality = await this.optimizeQualityProcesses(services);
      }

      // Calculate optimization impact
      const impact = await this.calculateOptimizationImpact(optimizations);

      // Generate implementation plan
      const implementationPlan = await this.generateOptimizationImplementationPlan(optimizations);

      logger.info(`⚡ Service optimization completed: ${optimizationType}`);

      return {
        success: true,
        optimizationType,
        serviceCount: services.length,
        optimizations,
        impact,
        implementationPlan,
        estimatedSavings: impact.estimatedSavings,
        expectedImprovements: impact.expectedImprovements
      };

    } catch (error) {
      logger.error('Error in service optimization:', error);
      throw error;
    }
  }

  // Handle customer communication
  async handleCustomerCommunication(data) {
    try {
      const { 
        serviceId, 
        communicationType, 
        message, 
        priority = 'normal',
        automated = false 
      } = data;

      const service = await Service.findById(serviceId).populate('organization');
      if (!service) {
        throw new Error('Service not found');
      }

      // Generate communication content if automated
      let communicationContent = message;
      if (automated) {
        communicationContent = await this.generateAutomatedMessage(
          service, 
          communicationType, 
          priority
        );
      }

      // Send communication
      const communication = await this.sendCommunication(
        service,
        communicationType,
        communicationContent,
        priority
      );

      // Track communication
      await this.trackCommunication(service, communication);

      // Update service communication history
      await this.updateCommunicationHistory(service, communication);

      logger.info(`💬 Customer communication sent: ${serviceId} - ${communicationType}`);

      return {
        success: true,
        communication,
        service: service.toObject()
      };

    } catch (error) {
      logger.error('Error in customer communication:', error);
      throw error;
    }
  }

  // Handle quality assurance
  async handleQualityAssurance(data) {
    try {
      const { 
        serviceId, 
        qaType = 'comprehensive',
        checklist = null,
        automated = true 
      } = data;

      const service = await Service.findById(serviceId)
        .populate('assignedTo')
        .populate('organization');

      if (!service) {
        throw new Error('Service not found');
      }

      // Perform quality checks
      const qualityChecks = await this.performQualityChecks(service, qaType, checklist);

      // Calculate quality score
      const qualityScore = await this.calculateQualityScore(service, qualityChecks);

      // Identify quality issues
      const issues = await this.identifyQualityIssues(qualityChecks);

      // Generate quality report
      const qualityReport = await this.generateQualityReport(
        service, 
        qualityChecks, 
        qualityScore, 
        issues
      );

      // Recommendations for improvement
      const recommendations = await this.generateQualityRecommendations(
        service, 
        qualityChecks, 
        issues
      );

      // Update service quality metrics
      await this.updateQualityMetrics(service, qualityScore, qualityReport);

      logger.info(`🔍 Quality assurance completed: ${serviceId} - Score: ${qualityScore}`);

      return {
        success: true,
        qaType,
        qualityScore,
        qualityChecks,
        issues,
        qualityReport,
        recommendations,
        passed: qualityScore >= this.getKnowledge('quality_thresholds').quality_score_min
      };

    } catch (error) {
      logger.error('Error in quality assurance:', error);
      throw error;
    }
  }

  // Helper methods

  async validateServiceData(data) {
    const errors = [];
    
    if (!data.title || data.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters long');
    }
    
    if (!data.description || data.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long');
    }
    
    if (!data.customerName || data.customerName.trim().length < 2) {
      errors.push('Customer name is required');
    }
    
    if (!data.organizationId) {
      errors.push('Organization ID is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  async estimateServiceCharacteristics(data) {
    const serviceType = this.determineServiceType(data);
    const typeConfig = this.getKnowledge('service_types')[serviceType] || {};
    
    // Base estimation
    const estimation = {
      duration: this.estimateDuration(data, typeConfig),
      complexity: this.estimateComplexity(data, typeConfig),
      skills: this.estimateRequiredSkills(data, typeConfig),
      confidence: 0.8
    };
    
    return estimation;
  }

  determineServiceType(data) {
    const title = data.title.toLowerCase();
    const description = data.description.toLowerCase();
    
    if (title.includes('consult') || description.includes('consult')) {
      return 'consulting';
    } else if (title.includes('develop') || description.includes('develop')) {
      return 'development';
    } else if (title.includes('support') || description.includes('support')) {
      return 'support';
    }
    
    return 'consulting'; // default
  }

  estimateDuration(data, typeConfig) {
    // Complex duration estimation based on multiple factors
    let baseDuration = typeConfig.typical_duration?.min || 1;
    
    // Adjust based on description length
    const descriptionFactor = Math.min(data.description.length / 500, 2);
    
    // Adjust based on priority
    const priorityFactor = data.priority === 'urgent' ? 0.7 : 
                          data.priority === 'high' ? 0.85 : 1.0;
    
    // Adjust based on amount
    const amountFactor = data.amount ? Math.min(data.amount / 10000, 1.5) : 1.0;
    
    const estimatedDuration = baseDuration * descriptionFactor * priorityFactor * amountFactor;
    
    return Math.max(1, Math.round(estimatedDuration));
  }

  estimateComplexity(data, typeConfig) {
    let complexity = 3; // Base complexity (1-10)
    
    // Increase complexity based on factors
    if (data.description.length > 1000) complexity += 1;
    if (data.tags && data.tags.length > 5) complexity += 1;
    if (data.priority === 'urgent') complexity += 1;
    if (data.amount && data.amount > 50000) complexity += 1;
    
    return Math.min(10, complexity);
  }

  estimateRequiredSkills(data, typeConfig) {
    const skills = [];
    
    // Base skills based on service type
    const serviceType = this.determineServiceType(data);
    switch (serviceType) {
      case 'consulting':
        skills.push('business_analysis', 'communication', 'project_management');
        break;
      case 'development':
        skills.push('programming', 'system_design', 'testing');
        break;
      case 'support':
        skills.push('troubleshooting', 'customer_service', 'technical_knowledge');
        break;
    }
    
    // Add skills based on industry
    if (data.industry) {
      skills.push(`${data.industry}_expertise`);
    }
    
    // Add skills based on tags
    if (data.tags) {
      data.tags.forEach(tag => {
        if (!skills.includes(tag)) {
          skills.push(tag);
        }
      });
    }
    
    return skills;
  }

  calculatePriority(data) {
    let priority = 'medium';
    
    if (data.amount && data.amount > 50000) priority = 'high';
    if (data.amount && data.amount > 100000) priority = 'urgent';
    
    return priority;
  }

  estimateServiceValue(data) {
    // Base value estimation
    let baseValue = 1000;
    
    // Adjust based on complexity
    const complexity = this.estimateComplexity(data, {});
    baseValue *= (1 + complexity * 0.2);
    
    // Adjust based on industry
    const industryMultipliers = {
      'technology': 1.5,
      'healthcare': 1.3,
      'finance': 1.4,
      'consulting': 1.2
    };
    
    if (data.industry && industryMultipliers[data.industry]) {
      baseValue *= industryMultipliers[data.industry];
    }
    
    return Math.round(baseValue);
  }

  generateServiceTags(data) {
    const tags = [];
    
    // Generate tags based on content
    const content = `${data.title} ${data.description}`.toLowerCase();
    
    if (content.includes('urgent') || content.includes('emergency')) {
      tags.push('urgent');
    }
    
    if (content.includes('complex') || content.includes('advanced')) {
      tags.push('complex');
    }
    
    if (content.includes('new') || content.includes('first')) {
      tags.push('new_client');
    }
    
    return tags;
  }

  async performAutomaticAssignment(service) {
    // Get available users with required skills
    const availableUsers = await this.getAvailableUsers(service);
    
    // Score each user based on multiple factors
    const scoredUsers = await this.scoreUsersForAssignment(availableUsers, service);
    
    // Select best user
    const bestUser = scoredUsers[0];
    
    if (!bestUser) {
      throw new Error('No suitable users available for assignment');
    }
    
    return {
      userId: bestUser.userId,
      reason: bestUser.reason,
      score: bestUser.score,
      estimatedCompletion: bestUser.estimatedCompletion
    };
  }

  async getAvailableUsers(service) {
    // Get users from the same organization with required skills
    const { User } = require('../models');
    
    return await User.find({
      organization: service.organization,
      isActive: true,
      role: { $in: ['provider', 'manager', 'admin'] },
      $or: [
        { currentWorkload: { $lt: 10 } },
        { currentWorkload: { $exists: false } }
      ]
    }).populate('skills');
  }

  async scoreUsersForAssignment(users, service) {
    const scoredUsers = [];
    
    for (const user of users) {
      let score = 0;
      let reason = [];
      
      // Skill matching (40% weight)
      const skillScore = this.calculateSkillMatch(user, service.requiredSkills);
      score += skillScore * 0.4;
      if (skillScore > 0.8) reason.push('Excellent skill match');
      
      // Workload balance (30% weight)
      const workloadScore = this.calculateWorkloadScore(user);
      score += workloadScore * 0.3;
      if (workloadScore > 0.8) reason.push('Low current workload');
      
      // Historical performance (20% weight)
      const performanceScore = await this.calculatePerformanceScore(user, service);
      score += performanceScore * 0.2;
      if (performanceScore > 0.8) reason.push('Strong historical performance');
      
      // Availability (10% weight)
      const availabilityScore = this.calculateAvailabilityScore(user);
      score += availabilityScore * 0.1;
      if (availabilityScore > 0.8) reason.push('Highly available');
      
      scoredUsers.push({
        userId: user.id,
        score,
        reason: reason.join(', '),
        estimatedCompletion: this.estimateCompletionTime(user, service)
      });
    }
    
    return scoredUsers.sort((a, b) => b.score - a.score);
  }

  calculateSkillMatch(user, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) return 0.5;
    
    const userSkills = user.skills || [];
    const matchingSkills = requiredSkills.filter(skill => 
      userSkills.some(userSkill => 
        userSkill.name === skill || userSkill.name.includes(skill)
      )
    );
    
    return matchingSkills.length / requiredSkills.length;
  }

  calculateWorkloadScore(user) {
    const currentWorkload = user.currentWorkload || 0;
    const maxWorkload = 10;
    return Math.max(0, (maxWorkload - currentWorkload) / maxWorkload);
  }

  async calculatePerformanceScore(user, service) {
    // Calculate based on historical performance
    // This would query user's past service performance
    return 0.8; // Placeholder
  }

  calculateAvailabilityScore(user) {
    // Calculate based on user's availability status
    return user.isAvailable ? 1.0 : 0.5;
  }

  estimateCompletionTime(user, service) {
    const baseTime = service.estimatedDuration || 7;
    const userEfficiency = user.efficiency || 1.0;
    const workloadFactor = 1 + (user.currentWorkload || 0) * 0.1;
    
    const estimatedDays = Math.round(baseTime * workloadFactor / userEfficiency);
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + estimatedDays);
    
    return completionDate;
  }

  // Additional helper methods would be implemented here...
  // For brevity, I'm showing the structure with some key methods

  async triggerImmediateAssignment(service) {
    // Trigger immediate assignment for high-priority services
    logger.info(`🚀 Immediate assignment triggered for service: ${service.id}`);
  }

  async notifyAssignment(service, assignment) {
    // Send notification to assigned user
    logger.info(`📧 Assignment notification sent to: ${assignment.userId}`);
  }

  async updateUserWorkload(userId, service) {
    // Update user's current workload
    logger.info(`⚖️ Workload updated for user: ${userId}`);
  }

  async analyzeServiceStatus(service) {
    // Analyze current service status
    return {
      status: service.status,
      progress: 0.5, // Placeholder
      health: 'good',
      risks: []
    };
  }

  async identifyPotentialIssues(service) {
    // Identify potential issues with the service
    return [];
  }

  async generateProgressReport(service, statusAnalysis) {
    // Generate detailed progress report
    return {
      summary: 'Service progressing normally',
      milestones: [],
      nextSteps: []
    };
  }

  async predictServiceCompletion(service, statusAnalysis) {
    // Predict service completion date and quality
    return {
      estimatedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      confidence: 0.8,
      qualityScore: 8.5
    };
  }

  async generateTrackingRecommendations(service, statusAnalysis, issues) {
    // Generate recommendations based on tracking analysis
    return [];
  }

  async updateServiceMetrics(service, statusAnalysis) {
    // Update service metrics in database
    logger.info(`📊 Metrics updated for service: ${service.id}`);
  }

  // Continue with other methods...
}

module.exports = ServiceAgent;
