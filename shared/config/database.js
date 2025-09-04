const mongoose = require('mongoose');
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
 * Connect to MongoDB with common configuration
 * @param {string} uri - MongoDB connection URI
 * @param {string} serviceName - Name of the service for logging
 * @returns {Promise<mongoose.Connection>}
 */
const connectDB = async (uri, serviceName = 'Service') => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false
    });

    logger.info(`✅ ${serviceName} connected to MongoDB successfully`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error for ${serviceName}:`, err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn(`MongoDB disconnected for ${serviceName}`);
    });

    mongoose.connection.on('reconnected', () => {
      logger.info(`MongoDB reconnected for ${serviceName}`);
    });

    return mongoose.connection;
  } catch (error) {
    logger.error(`MongoDB connection failed for ${serviceName}:`, error);
    throw error;
  }
};

/**
 * Disconnect from MongoDB
 * @param {string} serviceName - Name of the service for logging
 */
const disconnectDB = async (serviceName = 'Service') => {
  try {
    await mongoose.disconnect();
    logger.info(`✅ ${serviceName} disconnected from MongoDB`);
  } catch (error) {
    logger.error(`MongoDB disconnection failed for ${serviceName}:`, error);
    throw error;
  }
};

module.exports = { connectDB, disconnectDB };
