import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { buildSubgraphSchema } from '@apollo/subgraph';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

import { config } from '../shared/config/index.js';
import logger from '../shared/utils/logger.js';
import serviceDiscovery from '../shared/utils/serviceDiscovery.js';
import mongodb from '../shared/database/mongodb.js';
import redis from '../shared/database/redis.js';
import MCPServer, { createDefaultTools } from '../shared/mcp/server.js';

class Gateway {
  constructor() {
    this.app = express();
    this.httpServer = null;
    this.apolloServer = null;
    this.io = null;
    this.mcpServer = null;
    this.port = config.GATEWAY_PORT;
    
    logger.addServiceName('gateway');
  }

  async initialize() {
    try {
      // Connect to databases
      await this.connectDatabases();
      
      // Setup MCP server
      await this.setupMCPServer();
      
      // Setup Apollo Gateway
      await this.setupApolloGateway();
      
      // Setup Express middleware
      this.setupMiddleware();
      
      // Setup Socket.IO
      this.setupSocketIO();
      
      // Setup routes
      this.setupRoutes();
      
      // Register with service discovery
      await this.registerService();
      
      logger.info('Gateway initialized successfully');
    } catch (error) {
      logger.error('Gateway initialization failed:', error);
      throw error;
    }
  }

  async connectDatabases() {
    try {
      await mongodb.connect('gateway_db');
      await redis.connect();
      logger.info('Gateway databases connected');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async setupMCPServer() {
    try {
      this.mcpServer = new MCPServer({
        name: 'gateway-mcp-server',
        version: '1.0.0',
      });

      // Register default tools
      const defaultTools = createDefaultTools('gateway');
      defaultTools.forEach(tool => {
        this.mcpServer.registerTool(tool);
      });

      // Register gateway-specific tools
      this.mcpServer.registerTool({
        name: 'list_services',
        description: 'List all registered microservices',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async () => {
          const services = await serviceDiscovery.getAllServices();
          return services;
        },
      });

      this.mcpServer.registerTool({
        name: 'get_service_health',
        description: 'Get health status of a specific service',
        inputSchema: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string',
              description: 'Name of the service to check',
            },
          },
          required: ['serviceName'],
        },
        handler: async (args) => {
          const service = await serviceDiscovery.discoverService(args.serviceName);
          if (!service) {
            throw new Error(`Service ${args.serviceName} not found`);
          }
          
          try {
            const response = await fetch(`${service.url}/health`);
            const health = await response.json();
            return health;
          } catch (error) {
            return {
              status: 'unhealthy',
              error: error.message,
            };
          }
        },
      });

      logger.info('MCP Server setup completed');
    } catch (error) {
      logger.error('MCP Server setup failed:', error);
      throw error;
    }
  }

  async setupApolloGateway() {
    try {
      // Discover GraphQL subgraph services
      const subgraphs = await this.discoverSubgraphs();
      
      const gateway = new ApolloGateway({
        supergraphSdl: new IntrospectAndCompose({
          subgraphs,
        }),
        buildService: ({ url }) => {
          return {
            process: ({ request, context }) => {
              // Add authentication context
              if (context.user) {
                request.http.headers.set('x-user-id', context.user.id);
                request.http.headers.set('x-user-role', context.user.role);
              }
              return request;
            },
          };
        },
      });

      this.apolloServer = new ApolloServer({
        gateway,
        plugins: [
          {
            requestDidStart() {
              return {
                didResolveOperation(requestContext) {
                  logger.info(`GraphQL Operation: ${requestContext.request.operationName}`);
                },
                didEncounterErrors(requestContext) {
                  logger.error('GraphQL Errors:', requestContext.errors);
                },
              };
            },
          },
        ],
      });

      await this.apolloServer.start();
      logger.info('Apollo Gateway setup completed');
    } catch (error) {
      logger.error('Apollo Gateway setup failed:', error);
      throw error;
    }
  }

  async discoverSubgraphs() {
    const subgraphs = [];
    
    // Define expected services
    const expectedServices = [
      { name: 'auth-service', path: '/graphql' },
      { name: 'ai-service', path: '/graphql' },
      { name: 'media-service', path: '/graphql' },
      { name: 'data-service', path: '/graphql' },
    ];

    for (const service of expectedServices) {
      try {
        const serviceInfo = await serviceDiscovery.discoverService(service.name);
        if (serviceInfo) {
          subgraphs.push({
            name: service.name,
            url: `${serviceInfo.url}${service.path}`,
          });
          logger.info(`Discovered subgraph: ${service.name} at ${serviceInfo.url}${service.path}`);
        } else {
          logger.warn(`Service ${service.name} not found in service discovery`);
        }
      } catch (error) {
        logger.error(`Failed to discover service ${service.name}:`, error);
      }
    }

    if (subgraphs.length === 0) {
      logger.warn('No subgraphs discovered, using fallback configuration');
      // Fallback to localhost URLs for development
      return expectedServices.map(service => ({
        name: service.name,
        url: `http://localhost:${this.getServicePort(service.name)}${service.path}`,
      }));
    }

    return subgraphs;
  }

  getServicePort(serviceName) {
    const portMap = {
      'auth-service': config.AUTH_SERVICE_PORT,
      'ai-service': config.AI_SERVICE_PORT,
      'media-service': config.MEDIA_SERVICE_PORT,
      'data-service': config.DATA_SERVICE_PORT,
    };
    return portMap[serviceName] || 4000;
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.logRequest(req, res, duration);
      });
      next();
    });
  }

  setupSocketIO() {
    this.httpServer = createServer(this.app);
    
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });

      // Handle service-specific events
      socket.on('subscribe-service', (serviceName) => {
        socket.join(`service:${serviceName}`);
        logger.info(`Socket ${socket.id} subscribed to service: ${serviceName}`);
      });

      socket.on('unsubscribe-service', (serviceName) => {
        socket.leave(`service:${serviceName}`);
        logger.info(`Socket ${socket.id} unsubscribed from service: ${serviceName}`);
      });
    });

    logger.info('Socket.IO setup completed');
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        const mongoHealth = await mongodb.healthCheck();
        const redisHealth = await redis.healthCheck();
        
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'gateway',
          version: '1.0.0',
          dependencies: {
            mongodb: mongoHealth,
            redis: redisHealth,
          },
        };

        res.json(health);
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
        });
      }
    });

    // Service discovery endpoint
    this.app.get('/services', async (req, res) => {
      try {
        const services = await serviceDiscovery.getAllServices();
        res.json(services);
      } catch (error) {
        logger.error('Failed to get services:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // GraphQL Playground
    this.app.get('/playground', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'src/gateway/graphql-playground.html'));
    });

    // Redirect root to playground
    this.app.get('/', (req, res) => {
      res.redirect('/playground');
    });

    // GraphQL endpoint
    this.app.use('/graphql', expressMiddleware(this.apolloServer, {
      context: async ({ req }) => {
        // Extract user from JWT token if present
        let user = null;
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (token) {
          try {
            // This would typically verify JWT and extract user info
            // For now, we'll just pass the token
            user = { token };
          } catch (error) {
            logger.warn('Invalid token provided');
          }
        }

        return {
          user,
          req,
        };
      },
    }));

    // Catch-all route
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
      });
    });

    logger.info('Routes setup completed');
  }

  async registerService() {
    try {
      await serviceDiscovery.registerService({
        name: 'gateway',
        port: this.port,
        tags: ['graphql', 'api-gateway'],
        check: {
          http: `http://localhost:${this.port}/health`,
          interval: '10s',
        },
      });
      
      logger.info('Gateway registered with service discovery');
    } catch (error) {
      logger.error('Failed to register gateway with service discovery:', error);
    }
  }

  async start() {
    try {
      await this.initialize();
      
      this.httpServer.listen(this.port, () => {
        logger.info(`Gateway server running on port ${this.port}`);
        logger.info(`GraphQL endpoint: http://localhost:${this.port}/graphql`);
        logger.info(`Health check: http://localhost:${this.port}/health`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start gateway:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Gateway shutdown initiated');
    
    try {
      if (this.mcpServer) {
        await this.mcpServer.stop();
      }
      
      if (this.apolloServer) {
        await this.apolloServer.stop();
      }
      
      if (this.httpServer) {
        this.httpServer.close();
      }
      
      await serviceDiscovery.shutdown();
      await mongodb.disconnect();
      await redis.disconnect();
      
      logger.info('Gateway shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during gateway shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the gateway if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const gateway = new Gateway();
  gateway.start();
}

export default Gateway;
