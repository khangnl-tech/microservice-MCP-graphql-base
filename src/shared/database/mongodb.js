import mongoose from 'mongoose';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

class MongoDB {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect(databaseName = null) {
    try {
      if (this.isConnected) {
        return this.connection;
      }

      const uri = databaseName 
        ? config.MONGODB_URI.replace(/\/[^/]*\?/, `/${databaseName}?`)
        : config.MONGODB_URI;

      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0,
      };

      this.connection = await mongoose.connect(uri, options);
      this.isConnected = true;

      logger.info(`MongoDB connected successfully to ${databaseName || 'default'} database`);

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      return this.connection;
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.isConnected = false;
        logger.info('MongoDB disconnected successfully');
      }
    } catch (error) {
      logger.error('MongoDB disconnection error:', error);
      throw error;
    }
  }

  getConnection() {
    return this.connection;
  }

  isConnectionReady() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.isConnectionReady()) {
        return { status: 'unhealthy', message: 'Not connected to MongoDB' };
      }

      await mongoose.connection.db.admin().ping();
      return { status: 'healthy', message: 'MongoDB connection is healthy' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }
}

// Create singleton instance
const mongodb = new MongoDB();

export default mongodb;
export { MongoDB };
