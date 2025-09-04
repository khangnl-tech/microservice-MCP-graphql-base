/**
 * Shared utilities, models, and middleware for microservices
 * This module provides common functionality that can be used across all services
 */

// Database configurations
const { connectDB, disconnectDB } = require('./config/database');
const { connectRedis, getRedisClient, disconnectRedis } = require('./config/redis');

// Middleware
const { errorHandler, asyncHandler, notFoundHandler } = require('./middleware/errorHandler');

// Utilities
const { createLogger, createRequestLogger, createPerformanceLogger } = require('./utils/logger');

// Constants
const {
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
} = require('./constants');

// Common response helpers
const responseHelpers = {
  success: (res, data, message = 'Success', statusCode = HTTP_STATUS.OK) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  },

  error: (res, error, message = 'Error occurred', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR) => {
    return res.status(statusCode).json({
      success: false,
      message,
      error: error.message || error,
      timestamp: new Date().toISOString()
    });
  },

  paginated: (res, data, pagination, message = 'Success') => {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString()
    });
  }
};

// Common validation helpers
const validationHelpers = {
  isValidObjectId: (id) => {
    const mongoose = require('mongoose');
    return mongoose.Types.ObjectId.isValid(id);
  },

  sanitizeInput: (input) => {
    if (typeof input === 'string') {
      return input.trim().replace(/[<>]/g, '');
    }
    return input;
  },

  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validatePassword: (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }
};

// Common utility functions
const utils = {
  generateRandomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  formatBytes: (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  retry: async (fn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await utils.sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
};

// Export all shared functionality
module.exports = {
  // Database
  connectDB,
  disconnectDB,
  connectRedis,
  getRedisClient,
  disconnectRedis,

  // Middleware
  errorHandler,
  asyncHandler,
  notFoundHandler,

  // Utilities
  createLogger,
  createRequestLogger,
  createPerformanceLogger,

  // Constants
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
  MCP_CONSTANTS,

  // Helpers
  responseHelpers,
  validationHelpers,
  utils
};
