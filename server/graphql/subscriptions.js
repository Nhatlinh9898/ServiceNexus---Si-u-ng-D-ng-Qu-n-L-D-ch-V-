// GraphQL Subscriptions for ServiceNexus
// Real-time WebSocket subscriptions implementation

const { withFilter } = require('apollo-server-express');
const { PubSub } = require('graphql-subscriptions');
const logger = require('../utils/logger');

// Create PubSub instance
const pubsub = new PubSub();

// Subscription event constants
const EVENTS = {
  SERVICE_UPDATED: 'SERVICE_UPDATED',
  USER_UPDATED: 'USER_UPDATED',
  NOTIFICATION_CREATED: 'NOTIFICATION_CREATED',
  NOTIFICATION_UPDATED: 'NOTIFICATION_UPDATED',
  ANALYTICS_UPDATED: 'ANALYTICS_UPDATED',
  SYSTEM_EVENT: 'SYSTEM_EVENT',
  ORGANIZATION_UPDATED: 'ORGANIZATION_UPDATED',
  DEPARTMENT_UPDATED: 'DEPARTMENT_UPDATED',
  FILE_UPLOADED: 'FILE_UPLOADED',
  BULK_OPERATION_COMPLETED: 'BULK_OPERATION_COMPLETED'
};

// Subscription resolvers
const subscriptionResolvers = {
  serviceUpdated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.SERVICE_UPDATED]),
      (payload, variables, context) => {
        // Filter by organization access
        if (!context.user) return false;
        
        if (context.user.role === 'ADMIN') {
          return true; // Admins can see all updates
        }
        
        // Users can only see updates from their organization
        return payload.serviceUpdated.organization.id === context.user.organization.id;
      }
    )
  },
  
  userUpdated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.USER_UPDATED]),
      (payload, variables, context) => {
        if (!context.user) return false;
        
        if (context.user.role === 'ADMIN') {
          return true;
        }
        
        // Users can see updates from their organization
        return payload.userUpdated.organization.id === context.user.organization.id;
      }
    )
  },
  
  notificationCreated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.NOTIFICATION_CREATED]),
      (payload, variables, context) => {
        if (!context.user) return false;
        
        // Only deliver to the specific user
        return payload.notificationCreated.user.id === context.user.id;
      }
    )
  },
  
  notificationUpdated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.NOTIFICATION_UPDATED]),
      (payload, variables, context) => {
        if (!context.user) return false;
        
        // Only deliver to the specific user
        return payload.notificationUpdated.user.id === context.user.id;
      }
    )
  },
  
  analyticsUpdated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.ANALYTICS_UPDATED]),
      (payload, variables, context) => {
        if (!context.user) return false;
        
        if (context.user.role === 'ADMIN') {
          return true;
        }
        
        // Users can only see analytics from their organization
        return payload.analyticsUpdated.organizationId === context.user.organization.id;
      }
    )
  },
  
  systemEvent: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.SYSTEM_EVENT]),
      (payload, variables, context) => {
        if (!context.user) return false;
        
        // Filter by event type if specified
        if (variables.type && payload.systemEvent.type !== variables.type) {
          return false;
        }
        
        // Only admins can see system events
        return context.user.role === 'ADMIN';
      }
    )
  },
  
  organizationUpdated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.ORGANIZATION_UPDATED]),
      (payload, variables, context) => {
        if (!context.user) return false;
        
        if (context.user.role === 'ADMIN') {
          return true;
        }
        
        // Users can see updates from their organization
        return payload.organizationUpdated.id === context.user.organization.id;
      }
    )
  },
  
  departmentUpdated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.DEPARTMENT_UPDATED]),
      (payload, variables, context) => {
        if (!context.user) return false;
        
        if (context.user.role === 'ADMIN') {
          return true;
        }
        
        // Users can see updates from their organization
        return payload.departmentUpdated.organization.id === context.user.organization.id;
      }
    )
  },
  
  fileUploaded: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.FILE_UPLOADED]),
      (payload, variables, context) => {
        if (!context.user) return false;
        
        if (context.user.role === 'ADMIN') {
          return true;
        }
        
        // Users can see file uploads from their organization
        return payload.fileUploaded.organization.id === context.user.organization.id;
      }
    )
  },
  
  bulkOperationCompleted: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.BULK_OPERATION_COMPLETED]),
      (payload, variables, context) => {
        if (!context.user) return false;
        
        // Only deliver to the user who initiated the operation
        return payload.bulkOperationCompleted.userId === context.user.id;
      }
    )
  }
};

// Event publishers
const publishEvent = (eventType, payload) => {
  try {
    pubsub.publish(eventType, { [eventType]: payload });
    logger.info(`Published event: ${eventType}`, { payloadId: payload.id });
  } catch (error) {
    logger.error(`Failed to publish event: ${eventType}`, error);
  }
};

// Specific event publishers
const publishServiceUpdate = (service) => {
  publishEvent(EVENTS.SERVICE_UPDATED, service);
};

const publishUserUpdate = (user) => {
  publishEvent(EVENTS.USER_UPDATED, user);
};

const publishNotificationCreated = (notification) => {
  publishEvent(EVENTS.NOTIFICATION_CREATED, notification);
};

const publishNotificationUpdated = (notification) => {
  publishEvent(EVENTS.NOTIFICATION_UPDATED, notification);
};

const publishAnalyticsUpdate = (analytics) => {
  publishEvent(EVENTS.ANALYTICS_UPDATED, analytics);
};

const publishSystemEvent = (event) => {
  publishEvent(EVENTS.SYSTEM_EVENT, event);
};

const publishOrganizationUpdate = (organization) => {
  publishEvent(EVENTS.ORGANIZATION_UPDATED, organization);
};

const publishDepartmentUpdate = (department) => {
  publishEvent(EVENTS.DEPARTMENT_UPDATED, department);
};

const publishFileUploaded = (file) => {
  publishEvent(EVENTS.FILE_UPLOADED, file);
};

const publishBulkOperationCompleted = (operation) => {
  publishEvent(EVENTS.BULK_OPERATION_COMPLETED, operation);
};

// Subscription utilities
const getUserSubscriptions = (userId) => {
  // This would track active subscriptions per user
  // Implementation depends on the subscription management system
  return [];
};

const unsubscribeUser = (userId) => {
  // Unsubscribe user from all active subscriptions
  // Implementation depends on the subscription management system
  logger.info(`Unsubscribed user: ${userId}`);
};

// Subscription health monitoring
const monitorSubscriptions = () => {
  // Monitor subscription health and performance
  setInterval(() => {
    const activeSubscriptions = pubsub.getSubscriptions();
    logger.info(`Active subscriptions: ${activeSubscriptions.length}`);
  }, 60000); // Check every minute
};

// Graceful shutdown
const shutdownSubscriptions = async () => {
  try {
    // Close all subscriptions
    pubsub.close();
    logger.info('🔌 GraphQL subscriptions shut down');
  } catch (error) {
    logger.error('Error shutting down subscriptions:', error);
  }
};

// Export subscription utilities
module.exports = {
  // Event constants
  EVENTS,
  
  // Resolvers
  subscriptionResolvers,
  
  // Publishers
  publishEvent,
  publishServiceUpdate,
  publishUserUpdate,
  publishNotificationCreated,
  publishNotificationUpdated,
  publishAnalyticsUpdate,
  publishSystemEvent,
  publishOrganizationUpdate,
  publishDepartmentUpdate,
  publishFileUploaded,
  publishBulkOperationCompleted,
  
  // Utilities
  getUserSubscriptions,
  unsubscribeUser,
  monitorSubscriptions,
  shutdownSubscriptions,
  
  // PubSub instance (for external use)
  pubsub
};
