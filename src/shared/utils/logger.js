import winston from 'winston';
import { config } from '../config/index.js';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = config.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Add service name to logs
logger.addServiceName = (serviceName) => {
  logger.defaultMeta = { service: serviceName };
};

// Custom methods for structured logging
logger.logError = (message, error, metadata = {}) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...metadata,
  });
};

logger.logRequest = (req, res, responseTime) => {
  logger.http(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });
};

logger.logServiceCall = (serviceName, method, url, responseTime, statusCode) => {
  logger.info(`Service call: ${serviceName}`, {
    service: serviceName,
    method,
    url,
    responseTime: `${responseTime}ms`,
    statusCode,
  });
};

logger.logDatabaseOperation = (operation, collection, duration, success = true) => {
  const level = success ? 'info' : 'error';
  logger[level](`Database ${operation}`, {
    operation,
    collection,
    duration: `${duration}ms`,
    success,
  });
};

logger.logCacheOperation = (operation, key, hit = null, duration = null) => {
  logger.debug(`Cache ${operation}`, {
    operation,
    key,
    hit,
    duration: duration ? `${duration}ms` : null,
  });
};

export default logger;
