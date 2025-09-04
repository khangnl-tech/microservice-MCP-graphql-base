const redis = require('redis');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

/**
 * Connect to Redis with common configuration
 * @param {string} url - Redis connection URL
 * @param {string} serviceName - Name of the service for logging
 * @returns {Promise<redis.RedisClient>}
 */
const connectRedis = async (url, serviceName = 'Service') => {
  try {
    const client = redis.createClient({
      url: url,
      socket: {
        connectTimeout: 10000,
        lazyConnect: true,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error(`Redis max reconnection attempts reached for ${serviceName}`);
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        }
      },
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    client.on('error', (err) => {
      logger.error(`Redis Client Error for ${serviceName}:`, err);
    });

    client.on('connect', () => {
      logger.info(`✅ ${serviceName} connected to Redis successfully`);
    });

    client.on('ready', () => {
      logger.info(`Redis ready for ${serviceName}`);
    });

    client.on('reconnecting', () => {
      logger.warn(`Redis reconnecting for ${serviceName}`);
    });

    client.on('end', () => {
      logger.info(`Redis connection ended for ${serviceName}`);
    });

    await client.connect();
    return client;
  } catch (error) {
    logger.error(`Redis connection failed for ${serviceName}:`, error);
    throw error;
  }
};

/**
 * Get Redis client instance
 * @param {redis.RedisClient} client - Redis client instance
 * @returns {redis.RedisClient}
 */
const getRedisClient = (client) => {
  if (!client) {
    throw new Error('Redis client not initialized');
  }
  return client;
};

/**
 * Disconnect from Redis
 * @param {redis.RedisClient} client - Redis client instance
 * @param {string} serviceName - Name of the service for logging
 */
const disconnectRedis = async (client, serviceName = 'Service') => {
  try {
    if (client && client.isOpen) {
      await client.quit();
      logger.info(`✅ ${serviceName} disconnected from Redis`);
    }
  } catch (error) {
    logger.error(`Redis disconnection failed for ${serviceName}:`, error);
    throw error;
  }
};

module.exports = { connectRedis, getRedisClient, disconnectRedis };
