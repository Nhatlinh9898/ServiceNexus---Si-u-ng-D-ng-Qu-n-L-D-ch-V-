// Developer Portal for ServiceNexus Marketplace
// Provides tools for API developers to publish and manage their APIs

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { Organization, User } = require('../models');

class DeveloperPortal {
  constructor() {
    this.developers = new Map();
    this.apiSubmissions = new Map();
    this.reviews = new Map();
    this.analytics = new Map();
    this.documentation = new Map();
    
    this.initialize();
  }

  async initialize() {
    try {
      logger.info('👨‍💻 Initializing Developer Portal...');
      
      // Load developer profiles
      await this.loadDeveloperProfiles();
      
      // Initialize review system
      await this.initializeReviewSystem();
      
      logger.info('✅ Developer Portal initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Developer Portal:', error);
    }
  }

  // Register as a developer
  async registerDeveloper(userId, organizationId, developerData) {
    try {
      const user = await User.findById(userId);
      const organization = await Organization.findById(organizationId);
      
      if (!user || !organization) {
        throw new Error('User or organization not found');
      }

      const developer = {
        id: uuidv4(),
        userId,
        organizationId,
        status: 'pending',
        profile: {
          displayName: developerData.displayName || user.firstName + ' ' + user.lastName,
          email: user.email,
          company: organization.name,
          website: developerData.website || organization.website,
          description: developerData.description || '',
          logo: developerData.logo || organization.logo,
          contact: {
            email: developerData.contactEmail || user.email,
            phone: developerData.contactPhone || user.phone,
            address: developerData.address
          }
        },
        verification: {
          status: 'pending',
          documents: developerData.verificationDocuments || [],
          submittedAt: new Date(),
          reviewedAt: null,
          reviewedBy: null,
          notes: ''
        },
        apis: [],
        earnings: {
          total: 0,
          monthly: 0,
          lastPayout: null,
          payoutMethod: developerData.payoutMethod || null
        },
        settings: {
          notifications: developerData.notifications || true,
          publicProfile: developerData.publicProfile || false,
          apiAutoApproval: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.developers.set(developer.id, developer);

      logger.info(`👨‍💻 Developer registered: ${developer.id} (${user.email})`);

      return developer;
    } catch (error) {
      logger.error('Error registering developer:', error);
      throw error;
    }
  }

  // Submit API for review
  async submitAPI(developerId, apiData) {
    try {
      const developer = this.developers.get(developerId);
      if (!developer) {
        throw new Error('Developer not found');
      }

      if (developer.status !== 'approved') {
        throw new Error('Developer account not approved');
      }

      const submission = {
        id: uuidv4(),
        developerId,
        status: 'pending',
        api: {
          name: apiData.name,
          description: apiData.description,
          version: apiData.version || '1.0.0',
          category: apiData.category,
          tags: apiData.tags || [],
          documentation: apiData.documentation,
          endpoints: apiData.endpoints || [],
          authentication: apiData.authentication || 'api_key',
          webhookSupport: apiData.webhookSupport || false,
          pricing: apiData.pricing,
          support: {
            email: apiData.supportEmail || developer.profile.email,
            website: apiData.supportWebsite || developer.profile.website,
            documentation: apiData.documentationUrl,
            responseTime: apiData.supportResponseTime || '24h'
          },
          compliance: {
            gdpr: apiData.gdprCompliant || false,
            soc2: apiData.soc2Compliant || false,
            hipaa: apiData.hipaaCompliant || false,
            custom: apiData.customCompliance || []
          }
        },
        testing: {
          status: 'pending',
          testResults: null,
          testCoverage: 0,
          performance: {
            responseTime: null,
            throughput: null,
            errorRate: null
          },
          security: {
            vulnerabilities: [],
            score: 0
          }
        },
        review: {
          status: 'pending',
          reviewerId: null,
          reviewedAt: null,
          approvedAt: null,
          notes: '',
          checklist: {
            documentation: false,
            security: false,
            performance: false,
            compliance: false,
            support: false
          }
        },
        metadata: {
          submittedAt: new Date(),
          updatedAt: new Date(),
          lastReviewed: null
        }
      };

      this.apiSubmissions.set(submission.id, submission);

      // Start automated testing
      await this.runAutomatedTests(submission.id);

      logger.info(`📝 API submitted for review: ${submission.id} by developer ${developerId}`);

      return submission;
    } catch (error) {
      logger.error('Error submitting API:', error);
      throw error;
    }
  }

  // Review API submission
  async reviewAPI(submissionId, reviewerId, reviewData) {
    try {
      const submission = this.apiSubmissions.get(submissionId);
      if (!submission) {
        throw new Error('API submission not found');
      }

      if (submission.status !== 'pending' && submission.status !== 'testing') {
        throw new Error('API submission not ready for review');
      }

      const review = {
        reviewerId,
        status: reviewData.approved ? 'approved' : 'rejected',
        notes: reviewData.notes || '',
        checklist: reviewData.checklist || {},
        approvedAt: reviewData.approved ? new Date() : null,
        reviewedAt: new Date()
      };

      submission.review = { ...submission.review, ...review };
      submission.status = reviewData.approved ? 'approved' : 'rejected';
      submission.metadata.lastReviewed = new Date();

      if (reviewData.approved) {
        // Add to API registry
        await this.publishAPI(submission);
        
        // Notify developer
        await this.notifyDeveloper(submission.developerId, 'api_approved', {
          apiName: submission.api.name,
          submissionId: submission.id
        });
      } else {
        // Notify developer of rejection
        await this.notifyDeveloper(submission.developerId, 'api_rejected', {
          apiName: submission.api.name,
          submissionId: submission.id,
          reasons: reviewData.reasons || []
        });
      }

      logger.info(`👀 API reviewed: ${submissionId} - ${review.status}`);

      return submission;
    } catch (error) {
      logger.error('Error reviewing API:', error);
      throw error;
    }
  }

  // Get developer dashboard data
  async getDeveloperDashboard(developerId) {
    try {
      const developer = this.developers.get(developerId);
      if (!developer) {
        throw new Error('Developer not found');
      }

      const submissions = Array.from(this.apiSubmissions.values())
        .filter(sub => sub.developerId === developerId);

      const publishedAPIs = submissions.filter(sub => sub.status === 'approved');
      const pendingAPIs = submissions.filter(sub => sub.status === 'pending' || sub.status === 'testing');

      const analytics = this.getDeveloperAnalytics(developerId);
      const earnings = this.getDeveloperEarnings(developerId);

      return {
        developer: {
          ...developer,
          apis: {
            total: submissions.length,
            published: publishedAPIs.length,
            pending: pendingAPIs.length
          }
        },
        analytics,
        earnings,
        recentActivity: this.getDeveloperActivity(developerId),
        notifications: this.getDeveloperNotifications(developerId)
      };
    } catch (error) {
      logger.error('Error getting developer dashboard:', error);
      throw error;
    }
  }

  // Update API
  async updateAPI(submissionId, updateData) {
    try {
      const submission = this.apiSubmissions.get(submissionId);
      if (!submission) {
        throw new Error('API submission not found');
      }

      // Update API data
      if (updateData.api) {
        submission.api = { ...submission.api, ...updateData.api };
      }

      // Update documentation
      if (updateData.documentation) {
        submission.api.documentation = updateData.documentation;
      }

      // Update pricing
      if (updateData.pricing) {
        submission.api.pricing = updateData.pricing;
      }

      submission.metadata.updatedAt = new Date();
      submission.status = 'pending'; // Require re-review

      // Run automated tests again
      await this.runAutomatedTests(submissionId);

      logger.info(`🔄 API updated: ${submissionId}`);

      return submission;
    } catch (error) {
      logger.error('Error updating API:', error);
      throw error;
    }
  }

  // Get API reviews
  async getAPIReviews(apiId) {
    try {
      const reviews = Array.from(this.reviews.values())
        .filter(review => review.apiId === apiId)
        .sort((a, b) => b.createdAt - a.createdAt);

      return reviews.map(review => ({
        ...review,
        developer: this.getDeveloperInfo(review.developerId)
      }));
    } catch (error) {
      logger.error('Error getting API reviews:', error);
      throw error;
    }
  }

  // Add API review
  async addAPIReview(apiId, userId, reviewData) {
    try {
      const review = {
        id: uuidv4(),
        apiId,
        userId,
        rating: reviewData.rating,
        title: reviewData.title,
        content: reviewData.content,
        pros: reviewData.pros || [],
        cons: reviewData.cons || [],
        verified: false,
        helpful: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.reviews.set(review.id, review);

      // Update API rating
      await this.updateAPIRating(apiId);

      logger.info(`⭐ Review added: ${review.id} for API ${apiId}`);

      return review;
    } catch (error) {
      logger.error('Error adding API review:', error);
      throw error;
    }
  }

  // Get developer analytics
  getDeveloperAnalytics(developerId) {
    try {
      const submissions = Array.from(this.apiSubmissions.values())
        .filter(sub => sub.developerId === developerId);

      const publishedAPIs = submissions.filter(sub => sub.status === 'approved');
      
      const analytics = {
        apis: {
          total: submissions.length,
          published: publishedAPIs.length,
          pending: submissions.filter(sub => sub.status === 'pending').length,
          testing: submissions.filter(sub => sub.status === 'testing').length
        },
        usage: {
          totalRequests: this.getTotalAPIRequests(developerId),
          averageResponseTime: this.getAverageResponseTime(developerId),
          errorRate: this.getErrorRate(developerId),
          uptime: this.getAverageUptime(developerId)
        },
        reviews: {
          average: this.getAverageRating(developerId),
          total: this.getTotalReviews(developerId),
          distribution: this.getRatingDistribution(developerId)
        },
        trends: {
          requests: this.getRequestTrends(developerId),
          revenue: this.getRevenueTrends(developerId),
          users: this.getUserTrends(developerId)
        }
      };

      return analytics;
    } catch (error) {
      logger.error('Error getting developer analytics:', error);
      return {};
    }
  }

  // Automated testing
  async runAutomatedTests(submissionId) {
    try {
      const submission = this.apiSubmissions.get(submissionId);
      if (!submission) {
        throw new Error('API submission not found');
      }

      submission.testing.status = 'running';
      submission.metadata.updatedAt = new Date();

      // Run security tests
      const securityResults = await this.runSecurityTests(submission);
      
      // Run performance tests
      const performanceResults = await this.runPerformanceTests(submission);
      
      // Run documentation tests
      const documentationResults = await this.runDocumentationTests(submission);

      submission.testing = {
        status: 'completed',
        testResults: {
          security: securityResults,
          performance: performanceResults,
          documentation: documentationResults
        },
        testCoverage: this.calculateTestCoverage(submission),
        performance: {
          responseTime: performanceResults.averageResponseTime,
          throughput: performanceResults.throughput,
          errorRate: performanceResults.errorRate
        },
        security: {
          vulnerabilities: securityResults.vulnerabilities,
          score: securityResults.score
        },
        completedAt: new Date()
      };

      // Update submission status based on test results
      if (securityResults.score > 0.7 && performanceResults.errorRate < 0.05) {
        submission.status = 'pending'; // Ready for manual review
      } else {
        submission.status = 'failed'; // Failed automated tests
      }

      logger.info(`🧪 Automated tests completed: ${submissionId}`);

      return submission.testing;
    } catch (error) {
      logger.error('Error running automated tests:', error);
      throw error;
    }
  }

  // Security testing
  async runSecurityTests(submission) {
    try {
      const results = {
        vulnerabilities: [],
        score: 0,
        tests: {
          authentication: true,
          authorization: true,
          encryption: true,
          inputValidation: true,
          outputEncoding: true
        }
      };

      // Mock security testing - in production, this would run actual security scans
      const mockVulnerabilities = [
        {
          type: 'weak_authentication',
          severity: 'medium',
          description: 'API uses weak authentication method'
        },
        {
          type: 'missing_encryption',
          severity: 'high',
          description: 'Data transmission not properly encrypted'
        }
      ];

      results.vulnerabilities = mockVulnerabilities;
      results.score = Math.max(0, 1 - (mockVulnerabilities.length * 0.2));

      return results;
    } catch (error) {
      logger.error('Error running security tests:', error);
      return { vulnerabilities: [], score: 0 };
    }
  }

  // Performance testing
  async runPerformanceTests(submission) {
    try {
      const results = {
        averageResponseTime: Math.random() * 1000, // Mock: 0-1000ms
        throughput: Math.floor(Math.random() * 10000), // Mock: 0-10000 req/s
        errorRate: Math.random() * 0.1, // Mock: 0-10%
        tests: {
          load: true,
          stress: true,
          spike: true,
          endurance: true
        }
      };

      return results;
    } catch (error) {
      logger.error('Error running performance tests:', error);
      return { averageResponseTime: 0, throughput: 0, errorRate: 1 };
    }
  }

  // Documentation testing
  async runDocumentationTests(submission) {
    try {
      const results = {
        completeness: 0.8,
        accuracy: 0.9,
        examples: 0.7,
        tests: {
          apiReference: true,
          tutorials: false,
          examples: true,
          troubleshooting: false
        }
      };

      return results;
    } catch (error) {
      logger.error('Error running documentation tests:', error);
      return { completeness: 0, accuracy: 0, examples: 0 };
    }
  }

  // Helper methods
  calculateTestCoverage(submission) {
    // Calculate test coverage based on endpoints and documentation
    const endpoints = submission.api.endpoints || [];
    const documentedEndpoints = endpoints.filter(ep => ep.documentation).length;
    
    return endpoints.length > 0 ? documentedEndpoints / endpoints.length : 0;
  }

  async publishAPI(submission) {
    // This would integrate with the API registry
    logger.info(`🚀 API published: ${submission.api.name}`);
  }

  async notifyDeveloper(developerId, type, data) {
    // Send notification to developer
    logger.info(`📧 Notification sent to developer ${developerId}: ${type}`);
  }

  getDeveloperInfo(developerId) {
    const developer = this.developers.get(developerId);
    return developer ? {
      id: developer.id,
      displayName: developer.profile.displayName,
      company: developer.profile.company,
      logo: developer.profile.logo
    } : null;
  }

  getDeveloperActivity(developerId) {
    // Get recent activity for developer
    return [];
  }

  getDeveloperNotifications(developerId) {
    // Get notifications for developer
    return [];
  }

  getDeveloperEarnings(developerId) {
    const developer = this.developers.get(developerId);
    return developer ? developer.earnings : { total: 0, monthly: 0 };
  }

  getTotalAPIRequests(developerId) {
    // Calculate total requests for developer's APIs
    return 0;
  }

  getAverageResponseTime(developerId) {
    // Calculate average response time for developer's APIs
    return 0;
  }

  getErrorRate(developerId) {
    // Calculate error rate for developer's APIs
    return 0;
  }

  getAverageUptime(developerId) {
    // Calculate average uptime for developer's APIs
    return 99.9;
  }

  getAverageRating(developerId) {
    const reviews = Array.from(this.reviews.values())
      .filter(review => {
        const submission = Array.from(this.apiSubmissions.values())
          .find(sub => sub.developerId === developerId && sub.status === 'approved');
        return submission && review.apiId === submission.id;
      });
    
    if (reviews.length === 0) return 0;
    
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  }

  getTotalReviews(developerId) {
    const submissions = Array.from(this.apiSubmissions.values())
      .filter(sub => sub.developerId === developerId && sub.status === 'approved');
    
    return Array.from(this.reviews.values())
      .filter(review => submissions.some(sub => sub.id === review.apiId))
      .length;
  }

  getRatingDistribution(developerId) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    const reviews = Array.from(this.reviews.values())
      .filter(review => {
        const submission = Array.from(this.apiSubmissions.values())
          .find(sub => sub.developerId === developerId && sub.status === 'approved');
        return submission && review.apiId === submission.id;
      });
    
    reviews.forEach(review => {
      distribution[review.rating] = (distribution[review.rating] || 0) + 1;
    });
    
    return distribution;
  }

  getRequestTrends(developerId) {
    // Get request trends over time
    return [];
  }

  getRevenueTrends(developerId) {
    // Get revenue trends over time
    return [];
  }

  getUserTrends(developerId) {
    // Get user trends over time
    return [];
  }

  updateAPIRating(apiId) {
    // Update API rating based on reviews
    logger.info(`📊 API rating updated: ${apiId}`);
  }

  // Load developer profiles
  async loadDeveloperProfiles() {
    // Load developer profiles from database
    logger.info('👥 Developer profiles loaded');
  }

  // Initialize review system
  async initializeReviewSystem() {
    // Initialize review system configuration
    logger.info('⭐ Review system initialized');
  }

  // Cleanup
  async cleanup() {
    try {
      this.developers.clear();
      this.apiSubmissions.clear();
      this.reviews.clear();
      this.analytics.clear();
      this.documentation.clear();
      
      logger.info('🧹 Developer Portal cleaned up');
    } catch (error) {
      logger.error('Error cleaning up Developer Portal:', error);
    }
  }
}

module.exports = DeveloperPortal;
