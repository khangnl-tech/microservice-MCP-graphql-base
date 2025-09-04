const winston = require('winston');
const path = require('path');

/**
 * Create a logger instance for a specific service
 * @param {string} serviceName - Name of the service
 * @param {string} logLevel - Log level (default: 'info')
 * @returns {winston.Logger} Winston logger instance
 */
const createLogger = (serviceName, logLevel = 'info') => {
  const logDir = path.join(process.cwd(), 'logs');
  
  // Create logs directory if it doesn't exist
  const fs = require('fs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports: [
      // Error logs
      new winston.transports.File({
        filename: path.join(logDir, `${serviceName.toLowerCase()}-error.log`),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      // Combined logs
      new winston.transports.File({
        filename: path.join(logDir, `${serviceName.toLowerCase()}-combined.log`),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ]
  });

  // Add console transport in development
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    }));
  }

  return logger;
};

/**
 * Create a request logger middleware
 * @param {string} serviceName - Name of the service
 * @returns {Function} Express middleware function
 */
const createRequestLogger = (serviceName) => {
  const logger = createLogger(serviceName);
  
  return (req, res, next) => {
    const start = Date.now();
    
    // Log request
    logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const duration = Date.now() - start;
      
      logger.info('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

/**
 * Create a performance logger
 * @param {string} serviceName - Name of the service
 * @returns {Function} Performance logging function
 */
const createPerformanceLogger = (serviceName) => {
  const logger = createLogger(serviceName);
  
  return (operation, duration, metadata = {}) => {
    logger.info('Performance metric', {
      operation,
      duration: `${duration}ms`,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  };
};

module.exports = {
  createLogger,
  createRequestLogger,
  createPerformanceLogger
};
