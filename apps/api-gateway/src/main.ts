import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'graphql';
import dotenv from 'dotenv';
import { Logger, natsClient } from '@libs/common';
import { AppModule } from './app.module';
import { HealthController } from './health.controller';
import { UsersController } from './users.controller';

// Load environment variables
dotenv.config();

const logger = Logger.getInstance();

async function bootstrap() {
  const app = express();
  const port = process.env.PORT || 3000;

  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(compression());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use('/api/', limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Connect to NATS
  try {
    await natsClient.connect(process.env.NATS_URL);
    logger.info('Connected to NATS server');

    // Register service
    await natsClient.registerService('api-gateway', {
      port: port,
      version: '1.0.0',
      health: '/health',
      capabilities: ['graphql', 'rest', 'proxy']
    });
  } catch (error) {
    logger.error('Failed to connect to NATS', error as Error);
  }

  // Initialize controllers
  const healthController = new HealthController();
  const usersController = new UsersController();

  // Health check routes
  app.get('/health', healthController.getHealth.bind(healthController));
  app.get('/ready', healthController.getReadiness.bind(healthController));

  // API routes
  app.use('/api/users', usersController.getRouter());

  // GraphQL setup
  const appModule = new AppModule();
  const { typeDefs, resolvers } = await appModule.createGraphQLSchema();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({
      user: req.user,
      correlationId: req.headers['x-correlation-id'] || 'unknown',
      services: {
        'users-service': natsClient,
        'auth-service': natsClient,
        'ai-service': natsClient,
        'media-service': natsClient,
        'notification-service': natsClient
      }
    }),
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production'
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

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
    logger.info(`API Gateway running on port ${port}`);
    logger.info(`GraphQL endpoint: http://localhost:${port}/graphql`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await natsClient.disconnect();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start API Gateway', error);
  process.exit(1);
});
