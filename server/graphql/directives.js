// GraphQL Directives for ServiceNexus
// Custom directives for authentication, authorization, and validation

const { defaultFieldResolver, GraphQLScalarType } = require('graphql');
const { SchemaDirectiveVisitor } = require('@graphql-tools/schema');
const { AuthenticationError, ForbiddenError } = require('apollo-server-express');

// Authentication Directive
class AuthDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { resolve = defaultFieldResolver } = field;
    
    field.resolve = async function (...args) {
      const [source, , context] = args;
      
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      return resolve.apply(this, args);
    };
  }
}

// Role-based Authorization Directive
class RoleDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { resolve = defaultFieldResolver } = field;
    const requiredRoles = this.args.roles;
    
    field.resolve = async function (...args) {
      const [source, , context] = args;
      
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      if (!requiredRoles.includes(context.user.role)) {
        throw new ForbiddenError(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
      }
      
      return resolve.apply(this, args);
    };
  }
}

// Organization-based Authorization Directive
class OrganizationDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { resolve = defaultFieldResolver } = field;
    
    field.resolve = async function (...args) {
      const [source, , context] = args;
      
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      // Admins can access any organization
      if (context.user.role === 'ADMIN') {
        return resolve.apply(this, args);
      }
      
      // Check if user belongs to the organization they're trying to access
      const result = await resolve.apply(this, args);
      
      if (result && result.organization) {
        const organizationId = result.organization.id || result.organization;
        
        if (context.user.organization.id !== organizationId) {
          throw new ForbiddenError('Access denied to this organization');
        }
      }
      
      return result;
    };
  }
}

// Rate Limiting Directive
class RateLimitDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { resolve = defaultFieldResolver } = field;
    const maxRequests = this.args.max || 10;
    const windowMs = this.args.window || 60000; // 1 minute default
    
    field.resolve = async function (...args) {
      const [source, , context] = args;
      
      // Simple in-memory rate limiting (in production, use Redis)
      const key = `rate_limit_${context.user?.id || 'anonymous'}_${field.name}`;
      const now = Date.now();
      
      // This would be replaced with a proper rate limiting implementation
      // For now, just proceed with the resolution
      
      return resolve.apply(this, args);
    };
  }
}

// Validation Directive
class ValidateDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { resolve = defaultFieldResolver } = field;
    const rules = this.args.rules || [];
    
    field.resolve = async function (...args) {
      const [source, args, context] = args;
      
      // Apply validation rules to arguments
      for (const rule of rules) {
        const { field: argField, type, min, max, pattern } = rule;
        
        if (args[argField] !== undefined) {
          const value = args[argField];
          
          switch (type) {
            case 'string':
              if (typeof value !== 'string') {
                throw new Error(`${argField} must be a string`);
              }
              if (min && value.length < min) {
                throw new Error(`${argField} must be at least ${min} characters`);
              }
              if (max && value.length > max) {
                throw new Error(`${argField} must be no more than ${max} characters`);
              }
              if (pattern && !new RegExp(pattern).test(value)) {
                throw new Error(`${argField} format is invalid`);
              }
              break;
              
            case 'number':
              if (typeof value !== 'number') {
                throw new Error(`${argField} must be a number`);
              }
              if (min !== undefined && value < min) {
                throw new Error(`${argField} must be at least ${min}`);
              }
              if (max !== undefined && value > max) {
                throw new Error(`${argField} must be no more than ${max}`);
              }
              break;
              
            case 'email':
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(value)) {
                throw new Error(`${argField} must be a valid email`);
              }
              break;
          }
        }
      }
      
      return resolve(source, args, context);
    };
  }
}

// Caching Directive
class CacheDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { resolve = defaultFieldResolver } = field;
    const ttl = this.args.ttl || 300; // 5 minutes default
    
    field.resolve = async function (...args) {
      const [source, args, context] = args;
      
      // Generate cache key
      const cacheKey = `cache_${field.name}_${JSON.stringify(args)}_${context.user?.id || 'anonymous'}`;
      
      // This would be replaced with a proper caching implementation (Redis)
      // For now, just proceed with the resolution
      
      return resolve.apply(this, args);
    };
  }
}

// Logging Directive
class LogDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { resolve = defaultFieldResolver } = field;
    const level = this.args.level || 'info';
    
    field.resolve = async function (...args) {
      const [source, args, context] = args;
      const startTime = Date.now();
      
      try {
        const result = await resolve.apply(this, args);
        const duration = Date.now() - startTime;
        
        // Log successful operation
        console.log(`[${level.toUpperCase()}] GraphQL Operation: ${field.name}`, {
          duration: `${duration}ms`,
          user: context.user?.id,
          args: Object.keys(args)
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Log failed operation
        console.error(`[ERROR] GraphQL Operation: ${field.name}`, {
          duration: `${duration}ms`,
          user: context.user?.id,
          error: error.message
        });
        
        throw error;
      }
    };
  }
}

// Custom Scalar Types
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value) {
    return value instanceof Date ? value.toISOString() : null;
  },
  parseValue(value) {
    return new Date(value);
  },
  parseLiteral(ast) {
    return ast.kind === 'StringValue' ? new Date(ast.value) : null;
  }
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case 'StringValue':
      case 'BooleanValue':
      case 'IntValue':
      case 'FloatValue':
      case 'ObjectValue':
      case 'ListValue':
        return ast.value;
      default:
        return null;
    }
  }
});

// Export directives and scalars
module.exports = {
  // Directive classes
  AuthDirective,
  RoleDirective,
  OrganizationDirective,
  RateLimitDirective,
  ValidateDirective,
  CacheDirective,
  LogDirective,
  
  // Scalar types
  DateTimeScalar,
  JSONScalar,
  
  // Directive definitions for schema
  directiveTypeDefs: `
    directive @auth on FIELD_DEFINITION
    directive @role(roles: [String!]) on FIELD_DEFINITION
    directive @organization on FIELD_DEFINITION
    directive @rateLimit(max: Int, window: Int) on FIELD_DEFINITION
    directive @validate(rules: [ValidationRule!]) on FIELD_DEFINITION
    directive @cache(ttl: Int) on FIELD_DEFINITION
    directive @log(level: String) on FIELD_DEFINITION
    
    input ValidationRule {
      field: String!
      type: String!
      min: Int
      max: Int
      pattern: String
    }
  `
};
