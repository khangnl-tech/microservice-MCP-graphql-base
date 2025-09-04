import { createClient } from 'redis';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

class Redis {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected && this.client) {
        return this.client;
      }

      this.client = createClient({
        url: config.REDIS_URL,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis server refused connection');
            return new Error('Redis server refused connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            logger.error('Redis max retry attempts reached');
            return undefined;
          }
          // Reconnect after
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // Event listeners
      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting');
      });

      await this.client.connect();
      this.isConnected = true;

      logger.info('Redis connected successfully');
      return this.client;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis disconnected successfully');
      }
    } catch (error) {
      logger.error('Redis disconnection error:', error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  isConnectionReady() {
    return this.isConnected && this.client && this.client.isReady;
  }

  // Cache operations
  async get(key) {
    try {
      if (!this.isConnectionReady()) {
        throw new Error('Redis client not ready');
      }
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      if (!this.isConnectionReady()) {
        throw new Error('Redis client not ready');
      }
      
      const serializedValue = JSON.stringify(value);
      
      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isConnectionReady()) {
        throw new Error('Redis client not ready');
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnectionReady()) {
        throw new Error('Redis client not ready');
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async expire(key, ttl) {
    try {
      if (!this.isConnectionReady()) {
        throw new Error('Redis client not ready');
      }
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  async flushAll() {
    try {
      if (!this.isConnectionReady()) {
        throw new Error('Redis client not ready');
      }
      await this.client.flushAll();
      return true;
    } catch (error) {
      logger.error('Redis FLUSHALL error:', error);
      return false;
    }
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.isConnectionReady()) {
        return { status: 'unhealthy', message: 'Not connected to Redis' };
      }

      await this.client.ping();
      return { status: 'healthy', message: 'Redis connection is healthy' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  // Session store methods
  async getSession(sessionId) {
    return await this.get(`session:${sessionId}`);
  }

  async setSession(sessionId, sessionData, ttl = 3600) {
    return await this.set(`session:${sessionId}`, sessionData, ttl);
  }

  async deleteSession(sessionId) {
    return await this.del(`session:${sessionId}`);
  }

  // Cache with prefix methods
  async getWithPrefix(prefix, key) {
    return await this.get(`${prefix}:${key}`);
  }

  async setWithPrefix(prefix, key, value, ttl = null) {
    return await this.set(`${prefix}:${key}`, value, ttl);
  }

  async delWithPrefix(prefix, key) {
    return await this.del(`${prefix}:${key}`);
  }
}

// Create singleton instance
const redis = new Redis();

export default redis;
export { Redis };
