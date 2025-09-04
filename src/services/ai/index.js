import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import cors from 'cors';
import helmet from 'helmet';

import { config } from '../../shared/config/index.js';
import logger from '../../shared/utils/logger.js';
import serviceDiscovery from '../../shared/utils/serviceDiscovery.js';
import mongodb from '../../shared/database/mongodb.js';
import redis from '../../shared/database/redis.js';
import MCPServer, { createDefaultTools } from '../../shared/mcp/server.js';

// AI Service integrations
import OpenAIService from './services/openai.js';
import GoogleAIService from './services/googleai.js';
import HuggingFaceService from './services/huggingface.js';
import ElevenLabsService from './services/elevenlabs.js';
import TogetherAIService from './services/together.js';
import QdrantService from './services/qdrant.js';
import GoogleCloudService from './services/googlecloud.js';

// Models
import AIRequest from './models/AIRequest.js';
import AIResponse from './models/AIResponse.js';

class AIService {
  constructor() {
    this.app = express();
    this.apolloServer = null;
    this.mcpServer = null;
    this.port = config.AI_SERVICE_PORT;
    
    // Initialize AI services
    this.openai = new OpenAIService();
    this.googleai = new GoogleAIService();
    this.huggingface = new HuggingFaceService();
    this.elevenlabs = new ElevenLabsService();
    this.together = new TogetherAIService();
    this.qdrant = new QdrantService();
    this.googlecloud = new GoogleCloudService();
    
    logger.addServiceName('ai-service');
  }

  async initialize() {
    try {
      // Connect to databases
      await this.connectDatabases();
      
      // Initialize AI services
      await this.initializeAIServices();
      
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
      
      logger.info('AI service initialized successfully');
    } catch (error) {
      logger.error('AI service initialization failed:', error);
      throw error;
    }
  }

  async connectDatabases() {
    try {
      await mongodb.connect('ai_db');
      await redis.connect();
      logger.info('AI service databases connected');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async initializeAIServices() {
    try {
      await this.qdrant.initialize();
      await this.googlecloud.initialize();
      logger.info('AI services initialized');
    } catch (error) {
      logger.error('AI services initialization failed:', error);
      throw error;
    }
  }

  async setupMCPServer() {
    try {
      this.mcpServer = new MCPServer({
        name: 'ai-mcp-server',
        version: '1.0.0',
      });

      // Register default tools
      const defaultTools = createDefaultTools('ai-service');
      defaultTools.forEach(tool => {
        this.mcpServer.registerTool(tool);
      });

      // Register AI-specific tools
      this.registerAITools();

      logger.info('AI MCP Server setup completed');
    } catch (error) {
      logger.error('AI MCP Server setup failed:', error);
      throw error;
    }
  }

  registerAITools() {
    // OpenAI tools
    this.mcpServer.registerTool({
      name: 'openai_chat_completion',
      description: 'Generate text using OpenAI GPT models',
      inputSchema: {
        type: 'object',
        properties: {
          messages: {
            type: 'array',
            description: 'Array of message objects',
          },
          model: {
            type: 'string',
            description: 'OpenAI model to use',
            default: 'gpt-3.5-turbo',
          },
          temperature: {
            type: 'number',
            description: 'Temperature for randomness',
            default: 0.7,
          },
        },
        required: ['messages'],
      },
      handler: async (args) => {
        return await this.openai.chatCompletion(args);
      },
    });

    // Google AI tools
    this.mcpServer.registerTool({
      name: 'google_ai_generate',
      description: 'Generate text using Google Gemini models',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Text prompt for generation',
          },
          model: {
            type: 'string',
            description: 'Google AI model to use',
            default: 'gemini-pro',
          },
        },
        required: ['prompt'],
      },
      handler: async (args) => {
        return await this.googleai.generateText(args);
      },
    });

    // Vector database tools
    this.mcpServer.registerTool({
      name: 'qdrant_search',
      description: 'Search vectors in Qdrant database',
      inputSchema: {
        type: 'object',
        properties: {
          collection: {
            type: 'string',
            description: 'Collection name',
          },
          vector: {
            type: 'array',
            description: 'Query vector',
          },
          limit: {
            type: 'number',
            description: 'Number of results to return',
            default: 10,
          },
        },
        required: ['collection', 'vector'],
      },
      handler: async (args) => {
        return await this.qdrant.search(args);
      },
    });

    // Text-to-speech tools
    this.mcpServer.registerTool({
      name: 'elevenlabs_tts',
      description: 'Convert text to speech using ElevenLabs',
      inputSchema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Text to convert to speech',
          },
          voiceId: {
            type: 'string',
            description: 'Voice ID to use',
          },
        },
        required: ['text', 'voiceId'],
      },
      handler: async (args) => {
        return await this.elevenlabs.textToSpeech(args);
      },
    });

    // Google Cloud tools
    this.mcpServer.registerTool({
      name: 'google_speech_to_text',
      description: 'Convert speech to text using Google Cloud',
      inputSchema: {
        type: 'object',
        properties: {
          audioContent: {
            type: 'string',
            description: 'Base64 encoded audio content',
          },
          languageCode: {
            type: 'string',
            description: 'Language code',
            default: 'en-US',
          },
        },
        required: ['audioContent'],
      },
      handler: async (args) => {
        return await this.googlecloud.speechToText(args);
      },
    });
  }

  async setupApolloServer() {
    const typeDefs = gql`
      extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

      type AIRequest @key(fields: "id") {
        id: ID!
        userId: ID!
        service: String!
        model: String!
        prompt: String!
        parameters: JSON
        status: String!
        createdAt: String!
        updatedAt: String!
      }

      type AIResponse @key(fields: "id") {
        id: ID!
        requestId: ID!
        content: String!
        metadata: JSON
        tokensUsed: Int
        cost: Float
        processingTime: Int
        createdAt: String!
      }

      type ChatMessage {
        role: String!
        content: String!
      }

      type VectorSearchResult {
        id: String!
        score: Float!
        payload: JSON
      }

      scalar JSON

      type Query {
        aiRequests(userId: ID): [AIRequest!]!
        aiRequest(id: ID!): AIRequest
        aiResponses(requestId: ID!): [AIResponse!]!
      }

      type Mutation {
        # OpenAI
        openaiChatCompletion(input: OpenAIChatInput!): AIResponse!
        openaiImageGeneration(input: OpenAIImageInput!): AIResponse!
        
        # Google AI
        googleAIGenerate(input: GoogleAIInput!): AIResponse!
        
        # HuggingFace
        huggingfaceInference(input: HuggingFaceInput!): AIResponse!
        
        # ElevenLabs
        elevenLabsTTS(input: ElevenLabsInput!): AIResponse!
        
        # Together AI
        togetherAICompletion(input: TogetherAIInput!): AIResponse!
        
        # Vector Database
        qdrantUpsert(input: QdrantUpsertInput!): Boolean!
        qdrantSearch(input: QdrantSearchInput!): [VectorSearchResult!]!
        
        # Google Cloud
        googleSpeechToText(input: GoogleSpeechInput!): AIResponse!
        googleTextToSpeech(input: GoogleTTSInput!): AIResponse!
        googleTranslate(input: GoogleTranslateInput!): AIResponse!
      }

      input OpenAIChatInput {
        messages: [ChatMessageInput!]!
        model: String = "gpt-3.5-turbo"
        temperature: Float = 0.7
        maxTokens: Int
      }

      input OpenAIImageInput {
        prompt: String!
        size: String = "1024x1024"
        quality: String = "standard"
        n: Int = 1
      }

      input GoogleAIInput {
        prompt: String!
        model: String = "gemini-pro"
        temperature: Float = 0.7
      }

      input HuggingFaceInput {
        model: String!
        inputs: String!
        parameters: JSON
      }

      input ElevenLabsInput {
        text: String!
        voiceId: String!
        modelId: String = "eleven_monolingual_v1"
      }

      input TogetherAIInput {
        model: String!
        prompt: String!
        maxTokens: Int = 512
        temperature: Float = 0.7
      }

      input QdrantUpsertInput {
        collection: String!
        points: [QdrantPointInput!]!
      }

      input QdrantSearchInput {
        collection: String!
        vector: [Float!]!
        limit: Int = 10
        filter: JSON
      }

      input GoogleSpeechInput {
        audioContent: String!
        languageCode: String = "en-US"
        sampleRateHertz: Int = 16000
      }

      input GoogleTTSInput {
        text: String!
        languageCode: String = "en-US"
        voiceName: String = "en-US-Wavenet-D"
      }

      input GoogleTranslateInput {
        text: String!
        targetLanguage: String!
        sourceLanguage: String
      }

      input ChatMessageInput {
        role: String!
        content: String!
      }

      input QdrantPointInput {
        id: String!
        vector: [Float!]!
        payload: JSON
      }
    `;

    const resolvers = {
      Query: {
        aiRequests: async (_, { userId }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          
          const query = userId ? { userId } : {};
          if (user.role !== 'admin' && !userId) {
            query.userId = user.userId;
          }
          
          return await AIRequest.find(query).sort({ createdAt: -1 });
        },
        
        aiRequest: async (_, { id }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          
          const request = await AIRequest.findById(id);
          if (!request) throw new Error('Request not found');
          
          if (user.role !== 'admin' && request.userId !== user.userId) {
            throw new Error('Not authorized');
          }
          
          return request;
        },
        
        aiResponses: async (_, { requestId }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          
          const request = await AIRequest.findById(requestId);
          if (!request) throw new Error('Request not found');
          
          if (user.role !== 'admin' && request.userId !== user.userId) {
            throw new Error('Not authorized');
          }
          
          return await AIResponse.find({ requestId }).sort({ createdAt: -1 });
        },
      },

      Mutation: {
        openaiChatCompletion: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.handleAIRequest('openai', 'chat', input, user);
        },
        
        openaiImageGeneration: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.handleAIRequest('openai', 'image', input, user);
        },
        
        googleAIGenerate: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.handleAIRequest('googleai', 'generate', input, user);
        },
        
        huggingfaceInference: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.handleAIRequest('huggingface', 'inference', input, user);
        },
        
        elevenLabsTTS: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.handleAIRequest('elevenlabs', 'tts', input, user);
        },
        
        togetherAICompletion: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.handleAIRequest('together', 'completion', input, user);
        },
        
        qdrantUpsert: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.qdrant.upsert(input);
        },
        
        qdrantSearch: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.qdrant.search(input);
        },
        
        googleSpeechToText: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.handleAIRequest('googlecloud', 'stt', input, user);
        },
        
        googleTextToSpeech: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.handleAIRequest('googlecloud', 'tts', input, user);
        },
        
        googleTranslate: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.handleAIRequest('googlecloud', 'translate', input, user);
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
                logger.info(`AI GraphQL Operation: ${requestContext.request.operationName}`);
              },
              didEncounterErrors(requestContext) {
                logger.error('AI GraphQL Errors:', requestContext.errors);
              },
            };
          },
        },
      ],
    });

    await this.apolloServer.start();
    logger.info('AI Apollo Server setup completed');
  }

  async handleAIRequest(service, operation, input, user) {
    const startTime = Date.now();
    
    // Create AI request record
    const aiRequest = new AIRequest({
      userId: user.userId,
      service,
      model: input.model || 'default',
      prompt: input.prompt || input.text || JSON.stringify(input),
      parameters: input,
      status: 'processing',
    });
    
    await aiRequest.save();
    
    try {
      let result;
      
      // Route to appropriate AI service
      switch (service) {
        case 'openai':
          result = operation === 'chat' 
            ? await this.openai.chatCompletion(input)
            : await this.openai.imageGeneration(input);
          break;
        case 'googleai':
          result = await this.googleai.generateText(input);
          break;
        case 'huggingface':
          result = await this.huggingface.inference(input);
          break;
        case 'elevenlabs':
          result = await this.elevenlabs.textToSpeech(input);
          break;
        case 'together':
          result = await this.together.completion(input);
          break;
        case 'googlecloud':
          if (operation === 'stt') {
            result = await this.googlecloud.speechToText(input);
          } else if (operation === 'tts') {
            result = await this.googlecloud.textToSpeech(input);
          } else if (operation === 'translate') {
            result = await this.googlecloud.translate(input);
          }
          break;
        default:
          throw new Error(`Unknown AI service: ${service}`);
      }
      
      const processingTime = Date.now() - startTime;
      
      // Create AI response record
      const aiResponse = new AIResponse({
        requestId: aiRequest._id,
        content: typeof result === 'string' ? result : JSON.stringify(result),
        metadata: result.metadata || {},
        tokensUsed: result.tokensUsed || 0,
        cost: result.cost || 0,
        processingTime,
      });
      
      await aiResponse.save();
      
      // Update request status
      aiRequest.status = 'completed';
      await aiRequest.save();
      
      return aiResponse;
      
    } catch (error) {
      logger.error(`AI request failed for ${service}:`, error);
      
      // Update request status
      aiRequest.status = 'failed';
      await aiRequest.save();
      
      throw error;
    }
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
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
          service: 'ai-service',
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
            // This would typically verify JWT and extract user info
            // For now, we'll just pass the token
            user = { token };
          } catch (error) {
            logger.warn('Invalid token provided');
          }
        }

        return { user, req };
      },
    }));

    logger.info('AI routes setup completed');
  }

  async registerService() {
    try {
      await serviceDiscovery.registerService({
        name: 'ai-service',
        port: this.port,
        tags: ['graphql', 'ai', 'ml'],
        check: {
          http: `http://localhost:${this.port}/health`,
          interval: '10s',
        },
      });
      
      logger.info('AI service registered with service discovery');
    } catch (error) {
      logger.error('Failed to register AI service with service discovery:', error);
    }
  }

  async start() {
    try {
      await this.initialize();
      
      this.app.listen(this.port, () => {
        logger.info(`AI service running on port ${this.port}`);
        logger.info(`GraphQL endpoint: http://localhost:${this.port}/graphql`);
        logger.info(`Health check: http://localhost:${this.port}/health`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start AI service:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('AI service shutdown initiated');
    
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
      
      logger.info('AI service shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during AI service shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the service if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const aiService = new AIService();
  aiService.start();
}

export default AIService;
