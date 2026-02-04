// GraphQL Route Handler
// Integrates GraphQL server with Express

const express = require('express');
const { createGraphQLServer, graphqlHealthCheck } = require('../graphql');
const logger = require('../utils/logger');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Initialize GraphQL server
let graphqlServer;
let httpServer;
let subscriptionServer;

// GraphQL health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = await graphqlHealthCheck();
    res.json(health);
  } catch (error) {
    logger.error('GraphQL health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GraphQL playground info endpoint
router.get('/playground', (req, res) => {
  res.json({
    endpoint: '/graphql',
    subscriptionsEndpoint: 'ws://localhost:4000/graphql',
    playground: process.env.NODE_ENV !== 'production'
  });
});

// Rate limiting for GraphQL
router.use(rateLimiter.createGraphQLRateLimiter());

// Initialize GraphQL server middleware
const initializeGraphQL = async (app) => {
  try {
    const result = await createGraphQLServer(app);
    graphqlServer = result.server;
    httpServer = result.httpServer;
    subscriptionServer = result.subscriptionServer;
    
    logger.info('✅ GraphQL routes initialized');
    return result;
  } catch (error) {
    logger.error('❌ Failed to initialize GraphQL routes:', error);
    throw error;
  }
};

// Graceful shutdown
const shutdownGraphQL = async () => {
  try {
    if (subscriptionServer) {
      subscriptionServer.close();
      logger.info('🔌 GraphQL subscription server closed');
    }
    
    if (graphqlServer) {
      await graphqlServer.stop();
      logger.info('🛑 GraphQL server stopped');
    }
    
    if (httpServer) {
      httpServer.close();
      logger.info('🔌 GraphQL HTTP server closed');
    }
  } catch (error) {
    logger.error('Error during GraphQL shutdown:', error);
  }
};

// Export for use in main server
module.exports = {
  router,
  initializeGraphQL,
  shutdownGraphQL
};
