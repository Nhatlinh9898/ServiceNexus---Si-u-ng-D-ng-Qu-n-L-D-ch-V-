// GraphQL Server Setup for ServiceNexus
// Apollo Server configuration and initialization

const { ApolloServer } = require('apollo-server-express');
const { createServer } = require('http');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { execute, subscribe } = require('graphql');

const typeDefs = require('./schema');
const { resolvers, context } = require('./resolvers');
const logger = require('../utils/logger');

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// GraphQL Server Configuration
const createGraphQLServer = async (app) => {
  try {
    // Create Apollo Server
    const server = new ApolloServer({
      schema,
      context,
      introspection: process.env.NODE_ENV !== 'production',
      playground: process.env.NODE_ENV !== 'production',
      
      // Format errors
      formatError: (error) => {
        logger.error('GraphQL Error:', {
          message: error.message,
          locations: error.locations,
          path: error.path,
          extensions: error.extensions
        });
        
        // Don't expose internal errors in production
        if (process.env.NODE_ENV === 'production') {
          if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
            return new Error('Internal server error');
          }
        }
        
        return error;
      },
      
      // Logging
      plugins: [{
        requestDidStart() {
          return {
            didResolveOperation(requestContext) {
              logger.info('GraphQL Operation:', {
                operation: requestContext.request.operationName,
                variables: requestContext.request.variables,
                user: requestContext.context.user?.id
              });
            },
            
            didEncounterErrors(requestContext) {
              logger.error('GraphQL Operation Errors:', {
                operation: requestContext.request.operationName,
                errors: requestContext.errors
              });
            }
          };
        }
      }],
      
      // Validation rules
      validationRules: [
        // Add custom validation rules if needed
      ],
      
      // Cache configuration
      cache: process.env.NODE_ENV === 'production' ? undefined : 'bounded',
      
      // Data loading optimizations
      dataSources: () => ({
        // Add data sources here if needed
      }),
    });

    // Start Apollo Server
    await server.start();
    
    // Apply middleware
    server.applyMiddleware({
      app,
      path: '/graphql',
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      }
    });

    // Create HTTP server for subscriptions
    const httpServer = createServer(app);
    
    // Create subscription server
    const subscriptionServer = SubscriptionServer.create(
      {
        schema,
        execute,
        subscribe,
        onConnect: (connectionParams, webSocket, context) => {
          // Handle WebSocket connection
          logger.info('WebSocket connection established');
          
          // Authenticate WebSocket connection
          if (connectionParams.authorization) {
            try {
              const token = connectionParams.authorization.replace('Bearer ', '');
              const jwt = require('jsonwebtoken');
              const decoded = jwt.verify(token, process.env.JWT_SECRET);
              
              return { user: decoded };
            } catch (error) {
              logger.error('WebSocket authentication failed:', error);
              throw new Error('Authentication failed');
            }
          }
          
          return { user: null };
        },
        onDisconnect: (webSocket, context) => {
          logger.info('WebSocket connection closed');
        }
      },
      {
        server: httpServer,
        path: '/graphql'
      }
    );

    logger.info('🚀 GraphQL Server initialized');
    
    return { server, httpServer, subscriptionServer };
    
  } catch (error) {
    logger.error('Failed to initialize GraphQL server:', error);
    throw error;
  }
};

// Health check for GraphQL
const graphqlHealthCheck = async () => {
  try {
    // Basic health check
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  } catch (error) {
    throw new Error('GraphQL health check failed');
  }
};

// GraphQL Playground configuration
const playgroundConfig = {
  endpoint: '/graphql',
  subscriptionsEndpoint: 'ws://localhost:4000/graphql',
  settings: {
    'editor.theme': 'dark',
    'editor.fontSize': 14,
    'editor.fontFamily': 'Consolas, Monaco, "Source Code Pro", monospace',
    'request.credentials': 'include',
    'schema.polling.enable': false,
    'schema.polling.endpointFilter': '*localhost*'
  }
};

// Export GraphQL utilities
module.exports = {
  createGraphQLServer,
  graphqlHealthCheck,
  playgroundConfig,
  schema
};
