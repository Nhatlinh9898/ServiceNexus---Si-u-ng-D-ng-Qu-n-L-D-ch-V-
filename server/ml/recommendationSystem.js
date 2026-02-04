// Recommendation System for ServiceNexus
// Personalized recommendations using collaborative filtering and content-based filtering

const { Matrix } = require('ml-matrix');
const { CosineSimilarity } = require('ml-similarity');
const logger = require('../utils/logger');
const { Service, User, Organization } = require('../models');

class RecommendationSystem {
  constructor() {
    this.userItemMatrix = null;
    this.itemFeatures = new Map();
    this.userProfiles = new Map();
    this.similarityCache = new Map();
    this.recommendationCache = new Map();
    
    this.initialize();
  }

  async initialize() {
    try {
      logger.info('🎯 Initializing Recommendation System...');
      
      // Load user-item interaction matrix
      await this.buildUserItemMatrix();
      
      // Extract item features
      await this.extractItemFeatures();
      
      // Build user profiles
      await this.buildUserProfiles();
      
      logger.info('✅ Recommendation System initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Recommendation System:', error);
    }
  }

  // Get personalized service recommendations for a user
  async getServiceRecommendations(userId, limit = 10) {
    try {
      const cacheKey = `service_recommendations_${userId}_${limit}`;
      
      if (this.recommendationCache.has(cacheKey)) {
        return this.recommendationCache.get(cacheKey);
      }

      const user = await User.findById(userId).populate('organization');
      if (!user) {
        throw new Error('User not found');
      }

      // Get recommendations using multiple approaches
      const collaborativeRecommendations = await this.getCollaborativeRecommendations(userId, limit);
      const contentBasedRecommendations = await this.getContentBasedRecommendations(userId, limit);
      const popularityRecommendations = await this.getPopularityRecommendations(user.organization.id, limit);

      // Combine and rank recommendations
      const combinedRecommendations = this.combineRecommendations([
        { recommendations: collaborativeRecommendations, weight: 0.4 },
        { recommendations: contentBasedRecommendations, weight: 0.4 },
        { recommendations: popularityRecommendations, weight: 0.2 }
      ]);

      // Add explanation and confidence scores
      const finalRecommendations = combinedRecommendations.slice(0, limit).map(rec => ({
        ...rec,
        explanation: this.generateExplanation(rec, user),
        confidence: this.calculateConfidence(rec),
        category: this.categorizeRecommendation(rec)
      }));

      // Cache recommendations for 30 minutes
      this.recommendationCache.set(cacheKey, finalRecommendations);
      setTimeout(() => this.recommendationCache.delete(cacheKey), 1800000);

      return finalRecommendations;
    } catch (error) {
      logger.error('Error getting service recommendations:', error);
      return [];
    }
  }

  // Get user recommendations (for team collaboration)
  async getUserRecommendations(userId, limit = 5) {
    try {
      const user = await User.findById(userId).populate('organization department');
      if (!user) {
        throw new Error('User not found');
      }

      // Find similar users based on skills and work patterns
      const similarUsers = await this.findSimilarUsers(userId, limit * 2);
      
      // Filter by organization and department
      const recommendations = similarUsers
        .filter(similarUser => 
          similarUser.organization.id === user.organization.id &&
          (!user.department || similarUser.department?.id === user.department.id) &&
          similarUser.id !== userId
        )
        .slice(0, limit)
        .map(similarUser => ({
          user: similarUser,
          similarity: similarUser.similarity,
          reasons: this.getUserRecommendationReasons(similarUser, user),
          collaborationPotential: this.calculateCollaborationPotential(similarUser, user)
        }));

      return recommendations;
    } catch (error) {
      logger.error('Error getting user recommendations:', error);
      return [];
    }
  }

  // Get department recommendations
  async getDepartmentRecommendations(departmentId, limit = 10) {
    try {
      const department = await this.getDepartmentWithUsers(departmentId);
      if (!department) {
        throw new Error('Department not found');
      }

      // Analyze department performance and needs
      const departmentAnalysis = await this.analyzeDepartment(department);
      
      // Generate recommendations based on analysis
      const recommendations = {
        staffing: this.generateStaffingRecommendations(departmentAnalysis),
        training: this.generateTrainingRecommendations(departmentAnalysis),
        process: this.generateProcessRecommendations(departmentAnalysis),
        tools: this.generateToolRecommendations(departmentAnalysis)
      };

      return recommendations;
    } catch (error) {
      logger.error('Error getting department recommendations:', error);
      return null;
    }
  }

  // Collaborative Filtering Recommendations
  async getCollaborativeRecommendations(userId, limit) {
    try {
      if (!this.userItemMatrix) {
        return [];
      }

      // Find similar users
      const similarUsers = this.findSimilarUsersCollaborative(userId, limit * 2);
      
      // Get items liked by similar users
      const recommendations = [];
      const userItems = this.getUserItems(userId);
      
      for (const similarUser of similarUsers) {
        const similarUserItems = this.getUserItems(similarUser.userId);
        
        // Find items liked by similar user but not by current user
        const newItems = similarUserItems.filter(item => !userItems.includes(item));
        
        for (const item of newItems) {
          const existingRec = recommendations.find(rec => rec.itemId === item);
          if (existingRec) {
            existingRec.score += similarUser.similarity;
          } else {
            recommendations.push({
              itemId: item,
              score: similarUser.similarity,
              type: 'collaborative'
            });
          }
        }
      }

      // Sort by score and return top recommendations
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error getting collaborative recommendations:', error);
      return [];
    }
  }

  // Content-Based Filtering Recommendations
  async getContentBasedRecommendations(userId, limit) {
    try {
      const userProfile = this.userProfiles.get(userId);
      if (!userProfile) {
        return [];
      }

      // Get all items
      const allItems = await this.getAllItems();
      const userItems = this.getUserItems(userId);
      
      // Calculate similarity between user profile and items
      const recommendations = [];
      
      for (const item of allItems) {
        if (userItems.includes(item.id)) {
          continue; // Skip items user already interacted with
        }

        const itemFeatures = this.itemFeatures.get(item.id);
        if (!itemFeatures) {
          continue;
        }

        const similarity = this.calculateContentSimilarity(userProfile, itemFeatures);
        
        if (similarity > 0.1) { // Threshold for relevance
          recommendations.push({
            itemId: item.id,
            score: similarity,
            type: 'content-based'
          });
        }
      }

      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error getting content-based recommendations:', error);
      return [];
    }
  }

  // Popularity-Based Recommendations
  async getPopularityRecommendations(organizationId, limit) {
    try {
      // Get popular items in the organization
      const popularItems = await Service.aggregate([
        { $match: { organization: organizationId } },
        { $group: { _id: '$industry', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
        { $sort: { count: -1, avgRating: -1 } },
        { $limit: limit }
      ]);

      return popularItems.map((item, index) => ({
        itemId: item._id,
        score: (popularItems.length - index) / popularItems.length, // Normalize score
        type: 'popularity',
        metadata: {
          count: item.count,
          avgRating: item.avgRating
        }
      }));
    } catch (error) {
      logger.error('Error getting popularity recommendations:', error);
      return [];
    }
  }

  // Similarity Calculations
  findSimilarUsersCollaborative(userId, limit) {
    if (!this.userItemMatrix) {
      return [];
    }

    const userIndex = this.getUserIndex(userId);
    if (userIndex === -1) {
      return [];
    }

    const similarities = [];
    const userVector = this.userItemMatrix.getRow(userIndex);

    for (let i = 0; i < this.userItemMatrix.rows; i++) {
      if (i === userIndex) continue;

      const otherVector = this.userItemMatrix.getRow(i);
      const similarity = this.calculateCosineSimilarity(userVector, otherVector);
      
      if (similarity > 0.1) {
        similarities.push({
          userId: this.getUserIdByIndex(i),
          similarity: similarity
        });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  calculateCosineSimilarity(vector1, vector2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  calculateContentSimilarity(userProfile, itemFeatures) {
    let similarity = 0;
    let totalWeight = 0;

    // Compare each feature
    for (const [feature, userValue] of userProfile) {
      if (itemFeatures.has(feature)) {
        const itemValue = itemFeatures.get(feature);
        const weight = this.getFeatureWeight(feature);
        
        if (typeof userValue === 'number' && typeof itemValue === 'number') {
          similarity += Math.abs(userValue - itemValue) * weight;
        } else if (userValue === itemValue) {
          similarity += weight;
        }
        
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? similarity / totalWeight : 0;
  }

  // Data Processing Methods
  async buildUserItemMatrix() {
    try {
      // Get all user-service interactions
      const interactions = await this.getUserServiceInteractions();
      
      // Create user and item mappings
      const users = [...new Set(interactions.map(i => i.userId))];
      const items = [...new Set(interactions.map(i => i.itemId))];
      
      this.userMap = new Map(users.map((user, index) => [user, index]));
      this.itemMap = new Map(items.map((item, index) => [item, index]));
      
      // Build interaction matrix
      const matrix = new Matrix(users.length, items.length);
      
      for (const interaction of interactions) {
        const userIndex = this.userMap.get(interaction.userId);
        const itemIndex = this.itemMap.get(interaction.itemId);
        
        matrix.set(userIndex, itemIndex, interaction.rating || 1);
      }
      
      this.userItemMatrix = matrix;
    } catch (error) {
      logger.error('Error building user-item matrix:', error);
    }
  }

  async extractItemFeatures() {
    try {
      const services = await Service.find({});
      
      for (const service of services) {
        const features = new Map();
        
        // Extract categorical features
        features.set('industry', service.industry);
        features.set('priority', service.priority);
        features.set('status', service.status);
        
        // Extract numerical features
        features.set('amount', service.amount || 0);
        features.set('descriptionLength', service.description?.length || 0);
        features.set('tagCount', service.tags?.length || 0);
        
        // Extract temporal features
        features.set('dayOfWeek', new Date(service.createdAt).getDay());
        features.set('month', new Date(service.createdAt).getMonth());
        
        this.itemFeatures.set(service.id, features);
      }
    } catch (error) {
      logger.error('Error extracting item features:', error);
    }
  }

  async buildUserProfiles() {
    try {
      const users = await User.find({}).populate('organization department');
      
      for (const user of users) {
        const profile = new Map();
        
        // User demographic features
        profile.set('role', user.role);
        profile.set('organization', user.organization.industry);
        profile.set('department', user.department?.name);
        
        // User behavior features (would be calculated from interaction history)
        profile.set('avgOrderValue', user.avgOrderValue || 0);
        profile.set('preferredIndustry', user.preferredIndustry);
        profile.set('activityLevel', user.activityLevel || 'medium');
        
        this.userProfiles.set(user.id, profile);
      }
    } catch (error) {
      logger.error('Error building user profiles:', error);
    }
  }

  // Utility Methods
  combineRecommendations(recommendationSets) {
    const combined = new Map();
    
    for (const set of recommendationSets) {
      for (const rec of set.recommendations) {
        const existing = combined.get(rec.itemId);
        
        if (existing) {
          existing.score += rec.score * set.weight;
          existing.types.push(rec.type);
        } else {
          combined.set(rec.itemId, {
            itemId: rec.itemId,
            score: rec.score * set.weight,
            types: [rec.type],
            metadata: rec.metadata || {}
          });
        }
      }
    }
    
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score);
  }

  generateExplanation(recommendation, user) {
    const explanations = [];
    
    if (recommendation.types.includes('collaborative')) {
      explanations.push('Recommended based on similar users\' preferences');
    }
    
    if (recommendation.types.includes('content-based')) {
      explanations.push('Matches your interests and work patterns');
    }
    
    if (recommendation.types.includes('popularity')) {
      explanations.push('Popular in your organization');
    }
    
    return explanations.join('. ');
  }

  calculateConfidence(recommendation) {
    // Higher confidence when multiple approaches agree
    const typeCount = recommendation.types.length;
    const score = recommendation.score;
    
    return Math.min(0.95, (typeCount * 0.3) + (score * 0.7));
  }

  categorizeRecommendation(recommendation) {
    if (recommendation.score > 0.8) return 'highly_recommended';
    if (recommendation.score > 0.6) return 'recommended';
    if (recommendation.score > 0.4) return 'consider';
    return 'optional';
  }

  getUserItems(userId) {
    // Get items user has interacted with
    // This would be implemented based on your interaction tracking
    return [];
  }

  getUserIndex(userId) {
    return this.userMap?.get(userId) ?? -1;
  }

  getUserIdByIndex(index) {
    if (!this.userMap) return null;
    
    for (const [userId, userIndex] of this.userMap) {
      if (userIndex === index) return userId;
    }
    
    return null;
  }

  getFeatureWeight(feature) {
    const weights = {
      'industry': 0.3,
      'priority': 0.2,
      'amount': 0.2,
      'role': 0.15,
      'organization': 0.15
    };
    
    return weights[feature] || 0.1;
  }

  // Helper methods for data retrieval
  async getUserServiceInteractions() {
    // This would query your interaction tracking system
    return [];
  }

  async getAllItems() {
    return await Service.find({});
  }

  async findSimilarUsers(userId, limit) {
    // Find users with similar skills and work patterns
    const user = await User.findById(userId);
    if (!user) return [];
    
    return await User.find({
      _id: { $ne: userId },
      organization: user.organization
    }).limit(limit);
  }

  getUserRecommendationReasons(similarUser, currentUser) {
    const reasons = [];
    
    if (similarUser.department?.id === currentUser.department?.id) {
      reasons.push('Same department');
    }
    
    if (similarUser.role === currentUser.role) {
      reasons.push('Same role');
    }
    
    // Add more reasoning based on skills, projects, etc.
    
    return reasons;
  }

  calculateCollaborationPotential(user1, user2) {
    let potential = 0.5; // Base potential
    
    // Increase potential based on common factors
    if (user1.department?.id === user2.department?.id) potential += 0.2;
    if (user1.role === user2.role) potential += 0.1;
    
    return Math.min(1.0, potential);
  }

  async getDepartmentWithUsers(departmentId) {
    return await this.getDepartmentWithUsers(departmentId);
  }

  async analyzeDepartment(department) {
    // Analyze department performance, workload, skills, etc.
    return {
      performance: 0.8,
      workload: 0.7,
      skillGaps: ['skill1', 'skill2'],
      efficiency: 0.75
    };
  }

  generateStaffingRecommendations(analysis) {
    return [
      { type: 'hire', role: 'Senior Developer', priority: 'high' },
      { type: 'train', skill: 'Project Management', priority: 'medium' }
    ];
  }

  generateTrainingRecommendations(analysis) {
    return analysis.skillGaps.map(skill => ({
      skill,
      priority: 'medium',
      recommendedTraining: `${skill} Certification`
    }));
  }

  generateProcessRecommendations(analysis) {
    return [
      'Implement daily standup meetings',
      'Introduce code review process'
    ];
  }

  generateToolRecommendations(analysis) {
    return [
      { tool: 'JIRA', reason: 'Better project tracking' },
      { tool: 'Slack', reason: 'Improved communication' }
    ];
  }

  // Cache management
  clearCache() {
    this.similarityCache.clear();
    this.recommendationCache.clear();
  }

  // Model updates
  async updateModels() {
    try {
      logger.info('🔄 Updating recommendation models...');
      
      // Rebuild matrices and profiles with new data
      await this.buildUserItemMatrix();
      await this.extractItemFeatures();
      await this.buildUserProfiles();
      
      // Clear cache to force fresh recommendations
      this.clearCache();
      
      logger.info('✅ Recommendation models updated');
    } catch (error) {
      logger.error('❌ Error updating recommendation models:', error);
    }
  }
}

module.exports = RecommendationSystem;
