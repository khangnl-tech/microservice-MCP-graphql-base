import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';

import { config } from '../../shared/config/index.js';
import logger from '../../shared/utils/logger.js';
import serviceDiscovery from '../../shared/utils/serviceDiscovery.js';
import mongodb from '../../shared/database/mongodb.js';
import redis from '../../shared/database/redis.js';
import MCPServer, { createDefaultTools } from '../../shared/mcp/server.js';

// GraphQL Schema
const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type MediaFile @key(fields: "id") {
    id: ID!
    filename: String!
    originalName: String!
    mimeType: String!
    size: Int!
    url: String!
    thumbnailUrl: String
    metadata: MediaMetadata
    uploadedAt: String!
    uploadedBy: String
  }

  type MediaMetadata {
    width: Int
    height: Int
    duration: Float
    format: String
    bitrate: Int
    fps: Float
  }

  input MediaUploadInput {
    file: Upload!
    category: String
    tags: [String!]
  }

  type Query {
    getMediaFile(id: ID!): MediaFile
    getMediaFiles(limit: Int = 10, offset: Int = 0): [MediaFile!]!
    searchMedia(query: String!, limit: Int = 10): [MediaFile!]!
  }

  type Mutation {
    uploadMedia(input: MediaUploadInput!): MediaFile!
    deleteMedia(id: ID!): Boolean!
    generateThumbnail(id: ID!): MediaFile!
    convertMedia(id: ID!, format: String!): MediaFile!
  }

  scalar Upload
`;

// Resolvers
const resolvers = {
  Query: {
    getMediaFile: async (_, { id }) => {
      try {
        const db = mongodb.getDb('media_db');
        const media = await db.collection('media_files').findOne({ _id: id });
        return media ? { ...media, id: media._id } : null;
      } catch (error) {
        logger.error('Error fetching media file:', error);
        throw new Error('Failed to fetch media file');
      }
    },

    getMediaFiles: async (_, { limit, offset }) => {
      try {
        const db = mongodb.getDb('media_db');
        const media = await db.collection('media_files')
          .find({})
          .skip(offset)
          .limit(limit)
          .sort({ uploadedAt: -1 })
          .toArray();
        
        return media.map(m => ({ ...m, id: m._id }));
      } catch (error) {
        logger.error('Error fetching media files:', error);
        throw new Error('Failed to fetch media files');
      }
    },

    searchMedia: async (_, { query, limit }) => {
      try {
        const db = mongodb.getDb('media_db');
        const media = await db.collection('media_files')
          .find({
            $or: [
              { filename: { $regex: query, $options: 'i' } },
              { originalName: { $regex: query, $options: 'i' } },
              { 'tags': { $in: [new RegExp(query, 'i')] } }
            ]
          })
          .limit(limit)
          .sort({ uploadedAt: -1 })
          .toArray();
        
        return media.map(m => ({ ...m, id: m._id }));
      } catch (error) {
        logger.error('Error searching media:', error);
        throw new Error('Failed to search media');
      }
    },
  },

  Mutation: {
    uploadMedia: async (_, { input }, context) => {
      try {
        const { file, category, tags } = input;
        const { createReadStream, filename, mimetype, encoding } = await file;
        
        // Generate unique filename
        const timestamp = Date.now();
        const ext = path.extname(filename);
        const uniqueFilename = `${timestamp}-${Math.random().toString(36).substr(2, 9)}${ext}`;
        
        // Create upload directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const filePath = path.join(uploadDir, uniqueFilename);
        
        // Save file
        const stream = createReadStream();
        const writeStream = fs.createWriteStream(filePath);
        stream.pipe(writeStream);
        
        await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
        
        // Get file stats
        const stats = fs.statSync(filePath);
        
        // Generate metadata based on file type
        let metadata = {};
        if (mimetype.startsWith('image/')) {
          try {
            const imageMetadata = await sharp(filePath).metadata();
            metadata = {
              width: imageMetadata.width,
              height: imageMetadata.height,
              format: imageMetadata.format,
            };
          } catch (error) {
            logger.warn('Failed to extract image metadata:', error);
          }
        }
        
        // Save to database
        const db = mongodb.getDb('media_db');
        const mediaFile = {
          _id: `media_${timestamp}`,
          filename: uniqueFilename,
          originalName: filename,
          mimeType: mimetype,
          size: stats.size,
          url: `/uploads/${uniqueFilename}`,
          metadata,
          category: category || 'general',
          tags: tags || [],
          uploadedAt: new Date().toISOString(),
          uploadedBy: context.user?.id || 'anonymous',
        };
        
        await db.collection('media_files').insertOne(mediaFile);
        
        logger.info(`Media file uploaded: ${filename}`);
        return { ...mediaFile, id: mediaFile._id };
      } catch (error) {
        logger.error('Error uploading media:', error);
        throw new Error('Failed to upload media');
      }
    },

    deleteMedia: async (_, { id }) => {
      try {
        const db = mongodb.getDb('media_db');
        const media = await db.collection('media_files').findOne({ _id: id });
        
        if (!media) {
          throw new Error('Media file not found');
        }
        
        // Delete file from filesystem
        const filePath = path.join(process.cwd(), 'uploads', media.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        // Delete thumbnail if exists
        if (media.thumbnailUrl) {
          const thumbnailPath = path.join(process.cwd(), 'uploads', 'thumbnails', media.filename);
          if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
          }
        }
        
        // Delete from database
        await db.collection('media_files').deleteOne({ _id: id });
        
        logger.info(`Media file deleted: ${id}`);
        return true;
      } catch (error) {
        logger.error('Error deleting media:', error);
        throw new Error('Failed to delete media');
      }
    },

    generateThumbnail: async (_, { id }) => {
      try {
        const db = mongodb.getDb('media_db');
        const media = await db.collection('media_files').findOne({ _id: id });
        
        if (!media) {
          throw new Error('Media file not found');
        }
        
        if (!media.mimeType.startsWith('image/')) {
          throw new Error('Thumbnails can only be generated for images');
        }
        
        const filePath = path.join(process.cwd(), 'uploads', media.filename);
        const thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
        
        if (!fs.existsSync(thumbnailDir)) {
          fs.mkdirSync(thumbnailDir, { recursive: true });
        }
        
        const thumbnailPath = path.join(thumbnailDir, `thumb_${media.filename}`);
        
        // Generate thumbnail
        await sharp(filePath)
          .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);
        
        // Update database
        const updatedMedia = {
          ...media,
          thumbnailUrl: `/uploads/thumbnails/thumb_${media.filename}`,
        };
        
        await db.collection('media_files').updateOne(
          { _id: id },
          { $set: { thumbnailUrl: updatedMedia.thumbnailUrl } }
        );
        
        logger.info(`Thumbnail generated for: ${id}`);
        return { ...updatedMedia, id: updatedMedia._id };
      } catch (error) {
        logger.error('Error generating thumbnail:', error);
        throw new Error('Failed to generate thumbnail');
      }
    },

    convertMedia: async (_, { id, format }) => {
      try {
        const db = mongodb.getDb('media_db');
        const media = await db.collection('media_files').findOne({ _id: id });
        
        if (!media) {
          throw new Error('Media file not found');
        }
        
        const filePath = path.join(process.cwd(), 'uploads', media.filename);
        const convertedFilename = `converted_${Date.now()}_${media.filename.replace(/\.[^/.]+$/, '')}.${format}`;
        const convertedPath = path.join(process.cwd(), 'uploads', convertedFilename);
        
        if (media.mimeType.startsWith('image/')) {
          // Convert image
          await sharp(filePath)
            .toFormat(format)
            .toFile(convertedPath);
        } else if (media.mimeType.startsWith('video/')) {
          // Convert video (basic example)
          await new Promise((resolve, reject) => {
            ffmpeg(filePath)
              .toFormat(format)
              .on('end', resolve)
              .on('error', reject)
              .save(convertedPath);
          });
        } else {
          throw new Error('Unsupported media type for conversion');
        }
        
        // Get converted file stats
        const stats = fs.statSync(convertedPath);
        
        // Create new media record
        const convertedMedia = {
          _id: `media_${Date.now()}`,
          filename: convertedFilename,
          originalName: `converted_${media.originalName}`,
          mimeType: `${media.mimeType.split('/')[0]}/${format}`,
          size: stats.size,
          url: `/uploads/${convertedFilename}`,
          metadata: media.metadata,
          category: media.category,
          tags: [...(media.tags || []), 'converted'],
          uploadedAt: new Date().toISOString(),
          uploadedBy: media.uploadedBy,
          convertedFrom: id,
        };
        
        await db.collection('media_files').insertOne(convertedMedia);
        
        logger.info(`Media converted: ${id} -> ${format}`);
        return { ...convertedMedia, id: convertedMedia._id };
      } catch (error) {
        logger.error('Error converting media:', error);
        throw new Error('Failed to convert media');
      }
    },
  },

  MediaFile: {
    __resolveReference: async (reference) => {
      const db = mongodb.getDb('media_db');
      const media = await db.collection('media_files').findOne({ _id: reference.id });
      return media ? { ...media, id: media._id } : null;
    },
  },
};

class MediaService {
  constructor() {
    this.app = express();
    this.apolloServer = null;
    this.mcpServer = null;
    this.port = config.MEDIA_SERVICE_PORT;
    
    logger.addServiceName('media-service');
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
      
      logger.info('Media service initialized successfully');
    } catch (error) {
      logger.error('Media service initialization failed:', error);
      throw error;
    }
  }

  async connectDatabases() {
    try {
      await mongodb.connect('media_db');
      await redis.connect();
      logger.info('Media service databases connected');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async setupMCPServer() {
    try {
      this.mcpServer = new MCPServer({
        name: 'media-mcp-server',
        version: '1.0.0',
      });

      // Register default tools
      const defaultTools = createDefaultTools('media-service');
      defaultTools.forEach(tool => {
        this.mcpServer.registerTool(tool);
      });

      // Register media-specific tools
      this.mcpServer.registerTool({
        name: 'get_media_stats',
        description: 'Get media storage statistics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async () => {
          const db = mongodb.getDb('media_db');
          const totalFiles = await db.collection('media_files').countDocuments();
          const totalSize = await db.collection('media_files').aggregate([
            { $group: { _id: null, totalSize: { $sum: '$size' } } }
          ]).toArray();
          
          return {
            totalFiles,
            totalSize: totalSize[0]?.totalSize || 0,
            timestamp: new Date().toISOString(),
          };
        },
      });

      logger.info('Media MCP Server setup completed');
    } catch (error) {
      logger.error('Media MCP Server setup failed:', error);
      throw error;
    }
  }

  async setupApolloServer() {
    try {
      const schema = buildSubgraphSchema({ typeDefs, resolvers });
      
      this.apolloServer = new ApolloServer({
        schema,
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
      logger.info('Media Apollo Server setup completed');
    } catch (error) {
      logger.error('Media Apollo Server setup failed:', error);
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

    // Static file serving
    this.app.use('/uploads', express.static('uploads'));

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
          service: 'media-service',
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
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (token) {
          try {
            user = { token };
          } catch (error) {
            logger.warn('Invalid token provided');
          }
        }

        return { user, req };
      },
    }));
  }

  async registerService() {
    try {
      await serviceDiscovery.registerService({
        name: 'media-service',
        port: this.port,
        tags: ['graphql', 'media', 'upload'],
        check: {
          http: `http://localhost:${this.port}/health`,
          interval: '10s',
        },
      });
      
      logger.info('Media service registered with service discovery');
    } catch (error) {
      logger.error('Failed to register media service with service discovery:', error);
    }
  }

  async start() {
    try {
      await this.initialize();
      
      this.app.listen(this.port, () => {
        logger.info(`Media service running on port ${this.port}`);
        logger.info(`GraphQL endpoint: http://localhost:${this.port}/graphql`);
        logger.info(`Health check: http://localhost:${this.port}/health`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start media service:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Media service shutdown initiated');
    
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
      
      logger.info('Media service shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during media service shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the service if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mediaService = new MediaService();
  mediaService.start();
}

export default MediaService;
