/**
 * Common constants used across all microservices
 */

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// User Roles
const USER_ROLES = {
  USER: 'USER',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN'
};

// Service Names
const SERVICE_NAMES = {
  GATEWAY: 'gateway',
  AUTH: 'auth',
  AI: 'ai',
  MEDIA: 'media',
  USER: 'user',
  NOTIFICATION: 'notification',
  ORCHESTRATOR: 'orchestrator'
};

// Service Ports
const SERVICE_PORTS = {
  GATEWAY: 4000,
  AUTH: 4001,
  AI: 4002,
  MEDIA: 4003,
  USER: 4004,
  NOTIFICATION: 4005,
  ORCHESTRATOR: 4006
};

// Database Names
const DATABASE_NAMES = {
  GATEWAY: 'gateway_db',
  AUTH: 'auth_db',
  AI: 'ai_db',
  MEDIA: 'media_db',
  USER: 'user_db',
  NOTIFICATION: 'notification_db'
};

// Redis Ports
const REDIS_PORTS = {
  GATEWAY: 6379,
  AUTH: 6380,
  AI: 6381,
  MEDIA: 6382,
  USER: 6383,
  NOTIFICATION: 6384
};

// MongoDB Ports
const MONGODB_PORTS = {
  GATEWAY: 27017,
  AUTH: 27018,
  AI: 27019,
  MEDIA: 27020,
  USER: 27021,
  NOTIFICATION: 27022
};

// JWT Configuration
const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  ALGORITHM: 'HS256'
};

// Rate Limiting
const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  MESSAGE: 'Too many requests from this IP, please try again later.'
};

// File Upload
const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  UPLOAD_PATH: './uploads'
};

// Pagination
const PAGINATION_CONFIG = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0
};

// Cache TTL (Time To Live)
const CACHE_TTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 3600,    // 1 hour
  LONG: 86400,     // 24 hours
  VERY_LONG: 604800 // 1 week
};

// Environment
const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
};

// Log Levels
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

// MCP Protocol Constants
const MCP_CONSTANTS = {
  PROTOCOL_VERSION: '1.0.0',
  SUPPORTED_TOOLS: [
    'text_generation',
    'image_generation',
    'speech_to_text',
    'text_to_speech',
    'translation',
    'vector_search',
    'document_processing'
  ],
  SUPPORTED_RESOURCES: [
    'ai_models',
    'vector_collections',
    'processing_capabilities'
  ]
};

module.exports = {
  HTTP_STATUS,
  USER_ROLES,
  SERVICE_NAMES,
  SERVICE_PORTS,
  DATABASE_NAMES,
  REDIS_PORTS,
  MONGODB_PORTS,
  JWT_CONFIG,
  RATE_LIMIT_CONFIG,
  FILE_UPLOAD_CONFIG,
  PAGINATION_CONFIG,
  CACHE_TTL,
  ENVIRONMENT,
  LOG_LEVELS,
  MCP_CONSTANTS
};
