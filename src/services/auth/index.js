import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import helmet from 'helmet';

import { config } from '../../shared/config/index.js';
import logger from '../../shared/utils/logger.js';
import serviceDiscovery from '../../shared/utils/serviceDiscovery.js';
import mongodb from '../../shared/database/mongodb.js';
import redis from '../../shared/database/redis.js';
import MCPServer, { createDefaultTools } from '../../shared/mcp/server.js';
import User from './models/User.js';

class AuthService {
  constructor() {
    this.app = express();
    this.apolloServer = null;
    this.mcpServer = null;
    this.port = config.AUTH_SERVICE_PORT;
    
    logger.addServiceName('auth-service');
  }

  async initialize() {
    try {
      // Connect to databases
      await this.connectDatabases();
      
      // Setup MCP server
      await this.setupMCPServer();
      
      // Setup Apollo Server
      await this.setupApolloServer();
      
      // Setup Express middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Register with service discovery
      await this.registerService();
      
      logger.info('Auth service initialized successfully');
    } catch (error) {
      logger.error('Auth service initialization failed:', error);
      throw error;
    }
  }

  async connectDatabases() {
    try {
      await mongodb.connect('auth_db');
      await redis.connect();
      logger.info('Auth service databases connected');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async setupMCPServer() {
    try {
      this.mcpServer = new MCPServer({
        name: 'auth-mcp-server',
        version: '1.0.0',
      });

      // Register default tools
      const defaultTools = createDefaultTools('auth-service');
      defaultTools.forEach(tool => {
        this.mcpServer.registerTool(tool);
      });

      // Register auth-specific tools
      this.mcpServer.registerTool({
        name: 'verify_token',
        description: 'Verify JWT token and return user information',
        inputSchema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT token to verify',
            },
          },
          required: ['token'],
        },
        handler: async (args) => {
          try {
            const decoded = jwt.verify(args.token, config.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');
            return {
              valid: true,
              user: user ? user.toObject() : null,
            };
          } catch (error) {
            return {
              valid: false,
              error: error.message,
            };
          }
        },
      });

      this.mcpServer.registerTool({
        name: 'create_user',
        description: 'Create a new user account',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'User email address',
            },
            password: {
              type: 'string',
              description: 'User password',
            },
            name: {
              type: 'string',
              description: 'User full name',
            },
            role: {
              type: 'string',
              description: 'User role (optional)',
              default: 'user',
            },
          },
          required: ['email', 'password', 'name'],
        },
        handler: async (args) => {
          try {
            const existingUser = await User.findOne({ email: args.email });
            if (existingUser) {
              throw new Error('User already exists');
            }

            const hashedPassword = await bcrypt.hash(args.password, config.BCRYPT_ROUNDS);
            const user = new User({
              email: args.email,
              password: hashedPassword,
              name: args.name,
              role: args.role || 'user',
            });

            await user.save();
            
            const userObj = user.toObject();
            delete userObj.password;
            
            return {
              success: true,
              user: userObj,
            };
          } catch (error) {
            return {
              success: false,
              error: error.message,
            };
          }
        },
      });

      logger.info('Auth MCP Server setup completed');
    } catch (error) {
      logger.error('Auth MCP Server setup failed:', error);
      throw error;
    }
  }

  async setupApolloServer() {
    const typeDefs = gql`
      extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

      type User @key(fields: "id") {
        id: ID!
        email: String!
        name: String!
        role: String!
        isActive: Boolean!
        createdAt: String!
        updatedAt: String!
      }

      type AuthPayload {
        token: String!
        user: User!
      }

      type Query {
        me: User
        users: [User!]!
        user(id: ID!): User
      }

      type Mutation {
        register(input: RegisterInput!): AuthPayload!
        login(input: LoginInput!): AuthPayload!
        updateProfile(input: UpdateProfileInput!): User!
        changePassword(input: ChangePasswordInput!): Boolean!
        deleteUser(id: ID!): Boolean!
      }

      input RegisterInput {
        email: String!
        password: String!
        name: String!
        role: String = "user"
      }

      input LoginInput {
        email: String!
        password: String!
      }

      input UpdateProfileInput {
        name: String
        email: String
      }

      input ChangePasswordInput {
        currentPassword: String!
        newPassword: String!
      }
    `;

    const resolvers = {
      Query: {
        me: async (_, __, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await User.findById(user.userId).select('-password');
        },
        users: async (_, __, { user }) => {
          if (!user || user.role !== 'admin') {
            throw new Error('Not authorized');
          }
          return await User.find().select('-password');
        },
        user: async (_, { id }, { user }) => {
          if (!user || (user.role !== 'admin' && user.userId !== id)) {
            throw new Error('Not authorized');
          }
          return await User.findById(id).select('-password');
        },
      },

      Mutation: {
        register: async (_, { input }) => {
          const existingUser = await User.findOne({ email: input.email });
          if (existingUser) {
            throw new Error('User already exists');
          }

          const hashedPassword = await bcrypt.hash(input.password, config.BCRYPT_ROUNDS);
          const user = new User({
            ...input,
            password: hashedPassword,
          });

          await user.save();

          const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRES_IN }
          );

          // Cache user session
          await redis.setSession(user._id.toString(), {
            userId: user._id,
            email: user.email,
            role: user.role,
          });

          return {
            token,
            user: user.toObject(),
          };
        },

        login: async (_, { input }) => {
          const user = await User.findOne({ email: input.email });
          if (!user) {
            throw new Error('Invalid credentials');
          }

          const isValidPassword = await bcrypt.compare(input.password, user.password);
          if (!isValidPassword) {
            throw new Error('Invalid credentials');
          }

          if (!user.isActive) {
            throw new Error('Account is deactivated');
          }

          const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRES_IN }
          );

          // Cache user session
          await redis.setSession(user._id.toString(), {
            userId: user._id,
            email: user.email,
            role: user.role,
          });

          // Update last login
          user.lastLogin = new Date();
          await user.save();

          return {
            token,
            user: user.toObject(),
          };
        },

        updateProfile: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');

          const updatedUser = await User.findByIdAndUpdate(
            user.userId,
            { ...input, updatedAt: new Date() },
            { new: true }
          ).select('-password');

          return updatedUser;
        },

        changePassword: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');

          const userDoc = await User.findById(user.userId);
          const isValidPassword = await bcrypt.compare(input.currentPassword, userDoc.password);
          
          if (!isValidPassword) {
            throw new Error('Current password is incorrect');
          }

          const hashedPassword = await bcrypt.hash(input.newPassword, config.BCRYPT_ROUNDS);
          await User.findByIdAndUpdate(user.userId, { 
            password: hashedPassword,
            updatedAt: new Date(),
          });

          return true;
        },

        deleteUser: async (_, { id }, { user }) => {
          if (!user || user.role !== 'admin') {
            throw new Error('Not authorized');
          }

          await User.findByIdAndDelete(id);
          await redis.deleteSession(id);
          
          return true;
        },
      },

      User: {
        __resolveReference: async (reference) => {
          return await User.findById(reference.id).select('-password');
        },
      },
    };

    this.apolloServer = new ApolloServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
      plugins: [
        {
          requestDidStart() {
            return {
              didResolveOperation(requestContext) {
                logger.info(`Auth GraphQL Operation: ${requestContext.request.operationName}`);
              },
              didEncounterErrors(requestContext) {
                logger.error('Auth GraphQL Errors:', requestContext.errors);
              },
            };
          },
        },
      ],
    });

    await this.apolloServer.start();
    logger.info('Auth Apollo Server setup completed');
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }));

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

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

  setupRoutes() {
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        const mongoHealth = await mongodb.healthCheck();
        const redisHealth = await redis.healthCheck();
        
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
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

    // GraphQL endpoint
    this.app.use('/graphql', expressMiddleware(this.apolloServer, {
      context: async ({ req }) => {
        let user = null;
        const token = req.headers.authorization?.replace('Bearer ', '') || 
                     req.headers['x-auth-token'];
        
        if (token) {
          try {
            const decoded = jwt.verify(token, config.JWT_SECRET);
            user = decoded;
          } catch (error) {
            logger.warn('Invalid token provided');
          }
        }

        return { user, req };
      },
    }));

    logger.info('Auth routes setup completed');
  }

  async registerService() {
    try {
      await serviceDiscovery.registerService({
        name: 'auth-service',
        port: this.port,
        tags: ['graphql', 'authentication'],
        check: {
          http: `http://localhost:${this.port}/health`,
          interval: '10s',
        },
      });
      
      logger.info('Auth service registered with service discovery');
    } catch (error) {
      logger.error('Failed to register auth service with service discovery:', error);
    }
  }

  async start() {
    try {
      await this.initialize();
      
      this.app.listen(this.port, () => {
        logger.info(`Auth service running on port ${this.port}`);
        logger.info(`GraphQL endpoint: http://localhost:${this.port}/graphql`);
        logger.info(`Health check: http://localhost:${this.port}/health`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start auth service:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Auth service shutdown initiated');
    
    try {
      if (this.mcpServer) {
        await this.mcpServer.stop();
      }
      
      if (this.apolloServer) {
        await this.apolloServer.stop();
      }
      
      await serviceDiscovery.shutdown();
      await mongodb.disconnect();
      await redis.disconnect();
      
      logger.info('Auth service shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during auth service shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the service if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const authService = new AuthService();
  authService.start();
}

export default AuthService;
