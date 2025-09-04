import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Logger, natsClient } from '@libs/common';
import { AppModule } from './app.module';

// Load environment variables
dotenv.config();

const logger = Logger.getInstance();

async function bootstrap() {
  const app = express();
  const port = process.env.PORT || 3001;

  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Connect to MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URL!);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error as Error);
    process.exit(1);
  }

  // Connect to NATS
  try {
    await natsClient.connect(process.env.NATS_URL);
    logger.info('Connected to NATS server');

    // Register service
    await natsClient.registerService('users-service', {
      port: port,
      version: '1.0.0',
      health: '/health',
      capabilities: ['users', 'profiles']
    });
  } catch (error) {
    logger.error('Failed to connect to NATS', error as Error);
  }

  // Initialize app module
  const appModule = new AppModule();
  await appModule.initialize();

  // Setup routes
  app.use('/api/users', appModule.getUsersController().getRouter());
  app.get('/health', appModule.getHealthController().getHealth.bind(appModule.getHealthController()));

  // Setup NATS handlers
  await appModule.setupNatsHandlers();

  // Error handling middleware
  app.use((error: any, req: any, res: any, next: any) => {
    logger.error('Unhandled error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date()
    });
  });

  // Start server
  app.listen(port, () => {
    logger.info(`Users Service running on port ${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await mongoose.disconnect();
    await natsClient.disconnect();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start Users Service', error);
  process.exit(1);
});
