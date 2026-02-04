// Subscription Manager for ServiceNexus Marketplace
// Handles API subscriptions, billing, and lifecycle management

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { Organization, User } = require('../models');

class SubscriptionManager {
  constructor() {
    this.subscriptions = new Map();
    this.plans = new Map();
    this.billing = new Map();
    this.usage = new Map();
    this.invoices = new Map();
    
    this.initialize();
  }

  async initialize() {
    try {
      logger.info('💳 Initializing Subscription Manager...');
      
      // Load subscription plans
      await this.loadSubscriptionPlans();
      
      // Initialize billing system
      await this.initializeBilling();
      
      logger.info('✅ Subscription Manager initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Subscription Manager:', error);
    }
  }

  // Create a new subscription
  async createSubscription(organizationId, apiId, planId, paymentMethod = null) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const plan = this.plans.get(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Check if organization already has a subscription for this API
      const existingSubscription = this.getActiveSubscription(organizationId, apiId);
      if (existingSubscription) {
        throw new Error('Organization already has an active subscription for this API');
      }

      // Create subscription
      const subscription = {
        id: uuidv4(),
        organizationId,
        apiId,
        planId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + plan.billingCycle * 24 * 60 * 60 * 1000),
        trialEnd: plan.trialDays ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000) : null,
        cancelAtPeriodEnd: false,
        paymentMethod,
        usage: {
          requests: 0,
          bandwidth: 0,
          storage: 0,
          lastReset: new Date()
        },
        limits: plan.limits,
        pricing: plan.pricing,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      this.subscriptions.set(subscription.id, subscription);

      // Create initial invoice if not on trial
      if (!plan.trialDays) {
        await this.createInvoice(subscription);
      }

      // Setup usage tracking
      this.setupUsageTracking(subscription);

      logger.info(`💳 Subscription created: ${subscription.id} for org ${organizationId}`);

      return subscription;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Update subscription plan
  async updateSubscriptionPlan(subscriptionId, newPlanId) {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const newPlan = this.plans.get(newPlanId);
      if (!newPlan) {
        throw new Error('Plan not found');
      }

      const oldPlan = this.plans.get(subscription.planId);

      // Calculate proration if upgrading
      let creditAmount = 0;
      if (newPlan.pricing.price > oldPlan.pricing.price) {
        creditAmount = this.calculateProration(subscription, oldPlan, newPlan);
      }

      // Update subscription
      subscription.planId = newPlanId;
      subscription.limits = newPlan.limits;
      subscription.pricing = newPlan.pricing;
      subscription.metadata.updatedAt = new Date();

      // Apply credit if any
      if (creditAmount > 0) {
        await this.applyCredit(subscription.organizationId, creditAmount);
      }

      // Create prorated invoice
      await this.createProratedInvoice(subscription, oldPlan, newPlan);

      logger.info(`🔄 Subscription plan updated: ${subscriptionId} to ${newPlanId}`);

      return subscription;
    } catch (error) {
      logger.error('Error updating subscription plan:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status === 'cancelled') {
        throw new Error('Subscription already cancelled');
      }

      subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
      subscription.status = cancelAtPeriodEnd ? 'active' : 'cancelled';
      subscription.metadata.updatedAt = new Date();
      subscription.metadata.cancelledAt = new Date();

      if (!cancelAtPeriodEnd) {
        // Process immediate cancellation
        await this.processImmediateCancellation(subscription);
      }

      logger.info(`❌ Subscription cancelled: ${subscriptionId}`);

      return subscription;
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Renew subscription
  async renewSubscription(subscriptionId) {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'active') {
        throw new Error('Cannot renew inactive subscription');
      }

      const plan = this.plans.get(subscription.planId);

      // Check if auto-renewal is enabled
      if (subscription.cancelAtPeriodEnd) {
        subscription.status = 'cancelled';
        return subscription;
      }

      // Create new billing period
      subscription.currentPeriodStart = new Date();
      subscription.currentPeriodEnd = new Date(Date.now() + plan.billingCycle * 24 * 60 * 60 * 1000);
      subscription.usage.lastReset = new Date();
      subscription.metadata.updatedAt = new Date();

      // Create invoice for new period
      await this.createInvoice(subscription);

      logger.info(`🔄 Subscription renewed: ${subscriptionId}`);

      return subscription;
    } catch (error) {
      logger.error('Error renewing subscription:', error);
      throw error;
    }
  }

  // Check subscription limits
  async checkSubscriptionLimits(subscriptionId, resourceType, amount = 1) {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'active') {
        throw new Error('Subscription not active');
      }

      const limits = subscription.limits;
      const usage = subscription.usage;

      switch (resourceType) {
        case 'requests':
          if (usage.requests + amount > limits.requests) {
            throw new Error('Request limit exceeded');
          }
          break;
        case 'bandwidth':
          if (usage.bandwidth + amount > limits.bandwidth) {
            throw new Error('Bandwidth limit exceeded');
          }
          break;
        case 'storage':
          if (usage.storage + amount > limits.storage) {
            throw new Error('Storage limit exceeded');
          }
          break;
        default:
          throw new Error('Unknown resource type');
      }

      return true;
    } catch (error) {
      logger.error('Error checking subscription limits:', error);
      throw error;
    }
  }

  // Record usage
  async recordUsage(subscriptionId, resourceType, amount) {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Check limits first
      await this.checkSubscriptionLimits(subscriptionId, resourceType, amount);

      // Update usage
      subscription.usage[resourceType] += amount;
      subscription.usage.lastReset = new Date();

      // Store usage record
      const usageRecord = {
        id: uuidv4(),
        subscriptionId,
        resourceType,
        amount,
        timestamp: new Date()
      };

      const usageRecords = this.usage.get(subscriptionId) || [];
      usageRecords.push(usageRecord);
      this.usage.set(subscriptionId, usageRecords);

      return usageRecord;
    } catch (error) {
      logger.error('Error recording usage:', error);
      throw error;
    }
  }

  // Get subscription usage
  getSubscriptionUsage(subscriptionId, timeRange = 'current') {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const usageRecords = this.usage.get(subscriptionId) || [];
      
      let filteredRecords = usageRecords;
      if (timeRange !== 'all') {
        const now = Date.now();
        let cutoff;
        
        switch (timeRange) {
          case 'current':
            cutoff = subscription.currentPeriodStart.getTime();
            break;
          case '30d':
            cutoff = now - 30 * 24 * 60 * 60 * 1000;
            break;
          case '7d':
            cutoff = now - 7 * 24 * 60 * 60 * 1000;
            break;
          default:
            cutoff = subscription.currentPeriodStart.getTime();
        }
        
        filteredRecords = usageRecords.filter(record => record.timestamp.getTime() >= cutoff);
      }

      // Aggregate usage by type
      const aggregatedUsage = {
        requests: 0,
        bandwidth: 0,
        storage: 0
      };

      filteredRecords.forEach(record => {
        if (aggregatedUsage[record.resourceType] !== undefined) {
          aggregatedUsage[record.resourceType] += record.amount;
        }
      });

      return {
        current: subscription.usage,
        aggregated: aggregatedUsage,
        limits: subscription.limits,
        utilization: {
          requests: (aggregatedUsage.requests / subscription.limits.requests) * 100,
          bandwidth: (aggregatedUsage.bandwidth / subscription.limits.bandwidth) * 100,
          storage: (aggregatedUsage.storage / subscription.limits.storage) * 100
        },
        period: {
          start: subscription.currentPeriodStart,
          end: subscription.currentPeriodEnd
        }
      };
    } catch (error) {
      logger.error('Error getting subscription usage:', error);
      throw error;
    }
  }

  // Get organization subscriptions
  getOrganizationSubscriptions(organizationId) {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.organizationId === organizationId)
      .map(sub => ({
        ...sub,
        plan: this.plans.get(sub.planId),
        usage: this.getSubscriptionUsage(sub.id),
        invoices: this.getSubscriptionInvoices(sub.id)
      }));
  }

  // Get available plans
  getAvailablePlans(apiId = null) {
    let plans = Array.from(this.plans.values());
    
    if (apiId) {
      plans = plans.filter(plan => plan.apiIds.includes(apiId));
    }
    
    return plans.map(plan => ({
      ...plan,
      subscribers: this.getPlanSubscriberCount(plan.id),
      revenue: this.getPlanRevenue(plan.id)
    }));
  }

  // Billing methods
  async createInvoice(subscription) {
    try {
      const plan = this.plans.get(subscription.planId);
      const invoice = {
        id: uuidv4(),
        subscriptionId: subscription.id,
        organizationId: subscription.organizationId,
        amount: plan.pricing.price,
        currency: plan.pricing.currency || 'USD',
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        items: [{
          description: `${plan.name} - ${plan.billingCycle} days`,
          quantity: 1,
          unitPrice: plan.pricing.price,
          total: plan.pricing.price
        }],
        createdAt: new Date(),
        metadata: {
          billingPeriod: {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd
          }
        }
      };

      this.invoices.set(invoice.id, invoice);

      logger.info(`🧾 Invoice created: ${invoice.id} for subscription ${subscription.id}`);

      return invoice;
    } catch (error) {
      logger.error('Error creating invoice:', error);
      throw error;
    }
  }

  async processPayment(invoiceId, paymentMethod, paymentDetails) {
    try {
      const invoice = this.invoices.get(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status !== 'pending') {
        throw new Error('Invoice already processed');
      }

      // Process payment (integration with payment processor)
      const paymentResult = await this.processPaymentWithProvider(
        invoice.amount,
        paymentMethod,
        paymentDetails
      );

      if (paymentResult.success) {
        invoice.status = 'paid';
        invoice.paidAt = new Date();
        invoice.paymentMethod = paymentMethod;
        invoice.transactionId = paymentResult.transactionId;

        logger.info(`💳 Payment processed: ${invoiceId}`);
      } else {
        invoice.status = 'failed';
        invoice.failureReason = paymentResult.error;

        logger.error(`❌ Payment failed: ${invoiceId} - ${paymentResult.error}`);
      }

      return invoice;
    } catch (error) {
      logger.error('Error processing payment:', error);
      throw error;
    }
  }

  // Utility methods
  getActiveSubscription(organizationId, apiId) {
    return Array.from(this.subscriptions.values())
      .find(sub => 
        sub.organizationId === organizationId && 
        sub.apiId === apiId && 
        sub.status === 'active'
      );
  }

  calculateProration(subscription, oldPlan, newPlan) {
    const daysRemaining = Math.ceil(
      (subscription.currentPeriodEnd - new Date()) / (24 * 60 * 60 * 1000)
    );
    
    const oldPlanDailyRate = oldPlan.pricing.price / oldPlan.billingCycle;
    const newPlanDailyRate = newPlan.pricing.price / newPlan.billingCycle;
    
    return (newPlanDailyRate - oldPlanDailyRate) * daysRemaining;
  }

  applyCredit(organizationId, amount) {
    // Apply credit to organization account
    logger.info(`💰 Credit applied: ${amount} to organization ${organizationId}`);
  }

  createProratedInvoice(subscription, oldPlan, newPlan) {
    // Create prorated invoice for plan change
    const creditAmount = this.calculateProration(subscription, oldPlan, newPlan);
    
    if (creditAmount > 0) {
      const invoice = {
        id: uuidv4(),
        subscriptionId: subscription.id,
        organizationId: subscription.organizationId,
        amount: creditAmount,
        currency: newPlan.pricing.currency || 'USD',
        status: 'pending',
        type: 'proration',
        createdAt: new Date()
      };

      this.invoices.set(invoice.id, invoice);
    }
  }

  processImmediateCancellation(subscription) {
    // Process immediate cancellation with refund
    logger.info(`❌ Immediate cancellation processed: ${subscription.id}`);
  }

  setupUsageTracking(subscription) {
    // Setup usage tracking for the subscription
    logger.info(`📊 Usage tracking setup: ${subscription.id}`);
  }

  processPaymentWithProvider(amount, method, details) {
    // Integration with payment provider (Stripe, PayPal, etc.)
    // For now, return a mock response
    return {
      success: true,
      transactionId: uuidv4(),
      amount: amount
    };
  }

  getPlanSubscriberCount(planId) {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.planId === planId && sub.status === 'active')
      .length;
  }

  getPlanRevenue(planId) {
    const planSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.planId === planId && sub.status === 'active');
    
    const plan = this.plans.get(planId);
    return planSubscriptions.length * plan.pricing.price;
  }

  getSubscriptionInvoices(subscriptionId) {
    return Array.from(this.invoices.values())
      .filter(invoice => invoice.subscriptionId === subscriptionId);
  }

  // Load subscription plans
  async loadSubscriptionPlans() {
    const plans = [
      {
        id: 'basic',
        name: 'Basic',
        description: 'Essential features for small teams',
        apiIds: ['email-service', 'analytics-api', 'storage-api'],
        billingCycle: 30,
        trialDays: 14,
        pricing: {
          price: 0,
          currency: 'USD',
          billingFrequency: 'monthly'
        },
        limits: {
          requests: 1000,
          bandwidth: 1024 * 1024 * 1024, // 1GB
          storage: 1024 * 1024 * 1024, // 1GB
          users: 5
        },
        features: [
          'Basic API access',
          'Email support',
          'Standard documentation'
        ]
      },
      {
        id: 'pro',
        name: 'Professional',
        description: 'Advanced features for growing teams',
        apiIds: ['email-service', 'analytics-api', 'storage-api', 'ml-api'],
        billingCycle: 30,
        trialDays: 14,
        pricing: {
          price: 99,
          currency: 'USD',
          billingFrequency: 'monthly'
        },
        limits: {
          requests: 10000,
          bandwidth: 10 * 1024 * 1024 * 1024, // 10GB
          storage: 10 * 1024 * 1024 * 1024, // 10GB
          users: 25
        },
        features: [
          'Advanced API access',
          'Priority support',
          'Advanced analytics',
          'Custom integrations'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Full-featured solution for large organizations',
        apiIds: ['email-service', 'analytics-api', 'storage-api', 'ml-api', 'custom-api'],
        billingCycle: 30,
        trialDays: 30,
        pricing: {
          price: 499,
          currency: 'USD',
          billingFrequency: 'monthly'
        },
        limits: {
          requests: 100000,
          bandwidth: 100 * 1024 * 1024 * 1024, // 100GB
          storage: 100 * 1024 * 1024 * 1024, // 100GB
          users: 100
        },
        features: [
          'Unlimited API access',
          '24/7 dedicated support',
          'Custom features',
          'SLA guarantee',
          'White-label options'
        ]
      }
    ];

    for (const plan of plans) {
      this.plans.set(plan.id, plan);
    }
  }

  async initializeBilling() {
    // Initialize billing system configuration
    logger.info('💳 Billing system initialized');
  }

  // Cleanup
  async cleanup() {
    try {
      this.subscriptions.clear();
      this.plans.clear();
      this.billing.clear();
      this.usage.clear();
      this.invoices.clear();
      
      logger.info('🧹 Subscription Manager cleaned up');
    } catch (error) {
      logger.error('Error cleaning up Subscription Manager:', error);
    }
  }
}

module.exports = SubscriptionManager;
