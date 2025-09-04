import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import cors from 'cors';
import helmet from 'helmet';
import ExcelJS from 'exceljs';
import XLSX from 'xlsx';

import { config } from '../../shared/config/index.js';
import logger from '../../shared/utils/logger.js';
import serviceDiscovery from '../../shared/utils/serviceDiscovery.js';
import mongodb from '../../shared/database/mongodb.js';
import redis from '../../shared/database/redis.js';
import MCPServer, { createDefaultTools } from '../../shared/mcp/server.js';

// GraphQL Schema
const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type Dataset @key(fields: "id") {
    id: ID!
    name: String!
    description: String
    type: DatasetType!
    schema: DatasetSchema
    records: [DataRecord!]!
    recordCount: Int!
    createdAt: String!
    updatedAt: String!
    createdBy: String
    tags: [String!]
  }

  type DatasetSchema {
    fields: [DataField!]!
    primaryKey: String
    indexes: [String!]
  }

  type DataField {
    name: String!
    type: FieldType!
    required: Boolean!
    unique: Boolean!
    defaultValue: String
    validation: FieldValidation
  }

  type FieldValidation {
    min: Float
    max: Float
    pattern: String
    enum: [String!]
  }

  type DataRecord @key(fields: "id") {
    id: ID!
    datasetId: ID!
    data: JSON!
    createdAt: String!
    updatedAt: String!
    version: Int!
  }

  enum DatasetType {
    TABLE
    DOCUMENT
    TIME_SERIES
    GRAPH
  }

  enum FieldType {
    STRING
    NUMBER
    BOOLEAN
    DATE
    ARRAY
    OBJECT
    JSON
  }

  input DatasetInput {
    name: String!
    description: String
    type: DatasetType!
    schema: DatasetSchemaInput
    tags: [String!]
  }

  input DatasetSchemaInput {
    fields: [DataFieldInput!]!
    primaryKey: String
    indexes: [String!]
  }

  input DataFieldInput {
    name: String!
    type: FieldType!
    required: Boolean = false
    unique: Boolean = false
    defaultValue: String
    validation: FieldValidationInput
  }

  input FieldValidationInput {
    min: Float
    max: Float
    pattern: String
    enum: [String!]
  }

  input DataRecordInput {
    datasetId: ID!
    data: JSON!
  }

  input DataRecordUpdateInput {
    id: ID!
    data: JSON!
  }

  input DataQueryInput {
    datasetId: ID!
    filter: JSON
    sort: JSON
    limit: Int = 10
    offset: Int = 0
  }

  type Query {
    getDataset(id: ID!): Dataset
    getDatasets(limit: Int = 10, offset: Int = 0): [Dataset!]!
    searchDatasets(query: String!, limit: Int = 10): [Dataset!]!
    getDataRecord(id: ID!): DataRecord
    queryData(input: DataQueryInput!): [DataRecord!]!
    getDataStats(datasetId: ID!): DataStats!
  }

  type Mutation {
    createDataset(input: DatasetInput!): Dataset!
    updateDataset(id: ID!, input: DatasetInput!): Dataset!
    deleteDataset(id: ID!): Boolean!
    createDataRecord(input: DataRecordInput!): DataRecord!
    updateDataRecord(input: DataRecordUpdateInput!): DataRecord!
    deleteDataRecord(id: ID!): Boolean!
    bulkInsertRecords(datasetId: ID!, records: [JSON!]!): [DataRecord!]!
    importFromExcel(datasetId: ID!, file: Upload!): ImportResult!
    exportToExcel(datasetId: ID!): String!
  }

  type DataStats {
    totalRecords: Int!
    avgRecordSize: Float!
    lastUpdated: String!
    fieldStats: [FieldStats!]!
  }

  type FieldStats {
    fieldName: String!
    uniqueValues: Int!
    nullCount: Int!
    avgLength: Float
  }

  type ImportResult {
    success: Boolean!
    recordsImported: Int!
    errors: [String!]!
  }

  scalar JSON
  scalar Upload
`;

// Resolvers
const resolvers = {
  Query: {
    getDataset: async (_, { id }) => {
      try {
        const db = mongodb.getDb('data_db');
        const dataset = await db.collection('datasets').findOne({ _id: id });
        if (!dataset) return null;

        const recordCount = await db.collection('data_records').countDocuments({ datasetId: id });
        return { ...dataset, id: dataset._id, recordCount };
      } catch (error) {
        logger.error('Error fetching dataset:', error);
        throw new Error('Failed to fetch dataset');
      }
    },

    getDatasets: async (_, { limit, offset }) => {
      try {
        const db = mongodb.getDb('data_db');
        const datasets = await db.collection('datasets')
          .find({})
          .skip(offset)
          .limit(limit)
          .sort({ createdAt: -1 })
          .toArray();
        
        const datasetsWithCounts = await Promise.all(
          datasets.map(async (dataset) => {
            const recordCount = await db.collection('data_records').countDocuments({ datasetId: dataset._id });
            return { ...dataset, id: dataset._id, recordCount };
          })
        );

        return datasetsWithCounts;
      } catch (error) {
        logger.error('Error fetching datasets:', error);
        throw new Error('Failed to fetch datasets');
      }
    },

    searchDatasets: async (_, { query, limit }) => {
      try {
        const db = mongodb.getDb('data_db');
        const datasets = await db.collection('datasets')
          .find({
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
              { tags: { $in: [new RegExp(query, 'i')] } }
            ]
          })
          .limit(limit)
          .sort({ createdAt: -1 })
          .toArray();
        
        const datasetsWithCounts = await Promise.all(
          datasets.map(async (dataset) => {
            const recordCount = await db.collection('data_records').countDocuments({ datasetId: dataset._id });
            return { ...dataset, id: dataset._id, recordCount };
          })
        );

        return datasetsWithCounts;
      } catch (error) {
        logger.error('Error searching datasets:', error);
        throw new Error('Failed to search datasets');
      }
    },

    getDataRecord: async (_, { id }) => {
      try {
        const db = mongodb.getDb('data_db');
        const record = await db.collection('data_records').findOne({ _id: id });
        return record ? { ...record, id: record._id } : null;
      } catch (error) {
        logger.error('Error fetching data record:', error);
        throw new Error('Failed to fetch data record');
      }
    },

    queryData: async (_, { input }) => {
      try {
        const { datasetId, filter, sort, limit, offset } = input;
        const db = mongodb.getDb('data_db');
        
        let query = { datasetId };
        if (filter) {
          // Apply filters to the data field
          Object.keys(filter).forEach(key => {
            query[`data.${key}`] = filter[key];
          });
        }

        let cursor = db.collection('data_records').find(query);
        
        if (sort) {
          const sortObj = {};
          Object.keys(sort).forEach(key => {
            sortObj[`data.${key}`] = sort[key];
          });
          cursor = cursor.sort(sortObj);
        }

        const records = await cursor
          .skip(offset)
          .limit(limit)
          .toArray();
        
        return records.map(r => ({ ...r, id: r._id }));
      } catch (error) {
        logger.error('Error querying data:', error);
        throw new Error('Failed to query data');
      }
    },

    getDataStats: async (_, { datasetId }) => {
      try {
        const db = mongodb.getDb('data_db');
        
        const totalRecords = await db.collection('data_records').countDocuments({ datasetId });
        
        const pipeline = [
          { $match: { datasetId } },
          {
            $group: {
              _id: null,
              avgSize: { $avg: { $bsonSize: '$data' } },
              lastUpdated: { $max: '$updatedAt' }
            }
          }
        ];
        
        const stats = await db.collection('data_records').aggregate(pipeline).toArray();
        const basicStats = stats[0] || { avgSize: 0, lastUpdated: new Date().toISOString() };

        // Get field statistics
        const dataset = await db.collection('datasets').findOne({ _id: datasetId });
        const fieldStats = [];
        
        if (dataset && dataset.schema && dataset.schema.fields) {
          for (const field of dataset.schema.fields) {
            const fieldName = field.name;
            const uniqueValues = await db.collection('data_records').distinct(`data.${fieldName}`, { datasetId });
            const nullCount = await db.collection('data_records').countDocuments({
              datasetId,
              [`data.${fieldName}`]: { $in: [null, undefined, ''] }
            });
            
            fieldStats.push({
              fieldName,
              uniqueValues: uniqueValues.length,
              nullCount,
              avgLength: field.type === 'STRING' ? 0 : null // Could calculate actual avg length
            });
          }
        }

        return {
          totalRecords,
          avgRecordSize: basicStats.avgSize,
          lastUpdated: basicStats.lastUpdated,
          fieldStats
        };
      } catch (error) {
        logger.error('Error getting data stats:', error);
        throw new Error('Failed to get data stats');
      }
    },
  },

  Mutation: {
    createDataset: async (_, { input }, context) => {
      try {
        const db = mongodb.getDb('data_db');
        const timestamp = new Date().toISOString();
        
        const dataset = {
          _id: `dataset_${Date.now()}`,
          ...input,
          recordCount: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: context.user?.id || 'anonymous',
        };
        
        await db.collection('datasets').insertOne(dataset);
        
        logger.info(`Dataset created: ${input.name}`);
        return { ...dataset, id: dataset._id };
      } catch (error) {
        logger.error('Error creating dataset:', error);
        throw new Error('Failed to create dataset');
      }
    },

    updateDataset: async (_, { id, input }) => {
      try {
        const db = mongodb.getDb('data_db');
        const timestamp = new Date().toISOString();
        
        const result = await db.collection('datasets').updateOne(
          { _id: id },
          { 
            $set: { 
              ...input, 
              updatedAt: timestamp 
            } 
          }
        );
        
        if (result.matchedCount === 0) {
          throw new Error('Dataset not found');
        }
        
        const dataset = await db.collection('datasets').findOne({ _id: id });
        const recordCount = await db.collection('data_records').countDocuments({ datasetId: id });
        
        logger.info(`Dataset updated: ${id}`);
        return { ...dataset, id: dataset._id, recordCount };
      } catch (error) {
        logger.error('Error updating dataset:', error);
        throw new Error('Failed to update dataset');
      }
    },

    deleteDataset: async (_, { id }) => {
      try {
        const db = mongodb.getDb('data_db');
        
        // Delete all records first
        await db.collection('data_records').deleteMany({ datasetId: id });
        
        // Delete dataset
        const result = await db.collection('datasets').deleteOne({ _id: id });
        
        if (result.deletedCount === 0) {
          throw new Error('Dataset not found');
        }
        
        logger.info(`Dataset deleted: ${id}`);
        return true;
      } catch (error) {
        logger.error('Error deleting dataset:', error);
        throw new Error('Failed to delete dataset');
      }
    },

    createDataRecord: async (_, { input }) => {
      try {
        const { datasetId, data } = input;
        const db = mongodb.getDb('data_db');
        const timestamp = new Date().toISOString();
        
        // Validate dataset exists
        const dataset = await db.collection('datasets').findOne({ _id: datasetId });
        if (!dataset) {
          throw new Error('Dataset not found');
        }
        
        // TODO: Validate data against schema
        
        const record = {
          _id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          datasetId,
          data,
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1,
        };
        
        await db.collection('data_records').insertOne(record);
        
        logger.info(`Data record created for dataset: ${datasetId}`);
        return { ...record, id: record._id };
      } catch (error) {
        logger.error('Error creating data record:', error);
        throw new Error('Failed to create data record');
      }
    },

    updateDataRecord: async (_, { input }) => {
      try {
        const { id, data } = input;
        const db = mongodb.getDb('data_db');
        const timestamp = new Date().toISOString();
        
        const existingRecord = await db.collection('data_records').findOne({ _id: id });
        if (!existingRecord) {
          throw new Error('Data record not found');
        }
        
        const result = await db.collection('data_records').updateOne(
          { _id: id },
          { 
            $set: { 
              data, 
              updatedAt: timestamp,
              version: existingRecord.version + 1
            } 
          }
        );
        
        const updatedRecord = await db.collection('data_records').findOne({ _id: id });
        
        logger.info(`Data record updated: ${id}`);
        return { ...updatedRecord, id: updatedRecord._id };
      } catch (error) {
        logger.error('Error updating data record:', error);
        throw new Error('Failed to update data record');
      }
    },

    deleteDataRecord: async (_, { id }) => {
      try {
        const db = mongodb.getDb('data_db');
        const result = await db.collection('data_records').deleteOne({ _id: id });
        
        if (result.deletedCount === 0) {
          throw new Error('Data record not found');
        }
        
        logger.info(`Data record deleted: ${id}`);
        return true;
      } catch (error) {
        logger.error('Error deleting data record:', error);
        throw new Error('Failed to delete data record');
      }
    },

    bulkInsertRecords: async (_, { datasetId, records }) => {
      try {
        const db = mongodb.getDb('data_db');
        const timestamp = new Date().toISOString();
        
        // Validate dataset exists
        const dataset = await db.collection('datasets').findOne({ _id: datasetId });
        if (!dataset) {
          throw new Error('Dataset not found');
        }
        
        const dataRecords = records.map((data, index) => ({
          _id: `record_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          datasetId,
          data,
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1,
        }));
        
        await db.collection('data_records').insertMany(dataRecords);
        
        logger.info(`Bulk inserted ${records.length} records for dataset: ${datasetId}`);
        return dataRecords.map(r => ({ ...r, id: r._id }));
      } catch (error) {
        logger.error('Error bulk inserting records:', error);
        throw new Error('Failed to bulk insert records');
      }
    },

    importFromExcel: async (_, { datasetId, file }) => {
      try {
        const { createReadStream, filename } = await file;
        const stream = createReadStream();
        
        // Read file into buffer
        const chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        
        // Parse Excel file
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          return {
            success: false,
            recordsImported: 0,
            errors: ['No data found in Excel file']
          };
        }
        
        // Import records
        const db = mongodb.getDb('data_db');
        const timestamp = new Date().toISOString();
        
        const dataRecords = jsonData.map((data, index) => ({
          _id: `record_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          datasetId,
          data,
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1,
        }));
        
        await db.collection('data_records').insertMany(dataRecords);
        
        logger.info(`Imported ${jsonData.length} records from Excel for dataset: ${datasetId}`);
        return {
          success: true,
          recordsImported: jsonData.length,
          errors: []
        };
      } catch (error) {
        logger.error('Error importing from Excel:', error);
        return {
          success: false,
          recordsImported: 0,
          errors: [error.message]
        };
      }
    },

    exportToExcel: async (_, { datasetId }) => {
      try {
        const db = mongodb.getDb('data_db');
        
        // Get dataset info
        const dataset = await db.collection('datasets').findOne({ _id: datasetId });
        if (!dataset) {
          throw new Error('Dataset not found');
        }
        
        // Get all records
        const records = await db.collection('data_records')
          .find({ datasetId })
          .toArray();
        
        if (records.length === 0) {
          throw new Error('No records to export');
        }
        
        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(dataset.name);
        
        // Extract headers from first record
        const headers = Object.keys(records[0].data);
        worksheet.addRow(headers);
        
        // Add data rows
        records.forEach(record => {
          const row = headers.map(header => record.data[header]);
          worksheet.addRow(row);
        });
        
        // Generate filename
        const filename = `${dataset.name}_export_${Date.now()}.xlsx`;
        const filepath = `./exports/${filename}`;
        
        // Ensure exports directory exists
        const fs = await import('fs');
        if (!fs.existsSync('./exports')) {
          fs.mkdirSync('./exports', { recursive: true });
        }
        
        // Write file
        await workbook.xlsx.writeFile(filepath);
        
        logger.info(`Dataset exported to Excel: ${datasetId}`);
        return `/exports/${filename}`;
      } catch (error) {
        logger.error('Error exporting to Excel:', error);
        throw new Error('Failed to export to Excel');
      }
    },
  },

  Dataset: {
    records: async (parent) => {
      try {
        const db = mongodb.getDb('data_db');
        const records = await db.collection('data_records')
          .find({ datasetId: parent.id })
          .limit(100) // Limit for performance
          .toArray();
        
        return records.map(r => ({ ...r, id: r._id }));
      } catch (error) {
        logger.error('Error fetching dataset records:', error);
        return [];
      }
    },

    __resolveReference: async (reference) => {
      const db = mongodb.getDb('data_db');
      const dataset = await db.collection('datasets').findOne({ _id: reference.id });
      if (!dataset) return null;
      
      const recordCount = await db.collection('data_records').countDocuments({ datasetId: reference.id });
      return { ...dataset, id: dataset._id, recordCount };
    },
  },

  DataRecord: {
    __resolveReference: async (reference) => {
      const db = mongodb.getDb('data_db');
      const record = await db.collection('data_records').findOne({ _id: reference.id });
      return record ? { ...record, id: record._id } : null;
    },
  },
};

class DataService {
  constructor() {
    this.app = express();
    this.apolloServer = null;
    this.mcpServer = null;
    this.port = config.DATA_SERVICE_PORT;
    
    logger.addServiceName('data-service');
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
      
      logger.info('Data service initialized successfully');
    } catch (error) {
      logger.error('Data service initialization failed:', error);
      throw error;
    }
  }

  async connectDatabases() {
    try {
      await mongodb.connect('data_db');
      await redis.connect();
      logger.info('Data service databases connected');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async setupMCPServer() {
    try {
      this.mcpServer = new MCPServer({
        name: 'data-mcp-server',
        version: '1.0.0',
      });

      // Register default tools
      const defaultTools = createDefaultTools('data-service');
      defaultTools.forEach(tool => {
        this.mcpServer.registerTool(tool);
      });

      // Register data-specific tools
      this.mcpServer.registerTool({
        name: 'get_dataset_summary',
        description: 'Get summary of all datasets',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async () => {
          const db = mongodb.getDb('data_db');
          const totalDatasets = await db.collection('datasets').countDocuments();
          const totalRecords = await db.collection('data_records').countDocuments();
          
          return {
            totalDatasets,
            totalRecords,
            timestamp: new Date().toISOString(),
          };
        },
      });

      logger.info('Data MCP Server setup completed');
    } catch (error) {
      logger.error('Data MCP Server setup failed:', error);
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
      logger.info('Data Apollo Server setup completed');
    } catch (error) {
      logger.error('Data Apollo Server setup failed:', error);
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
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static file serving for exports
    this.app.use('/exports', express.static('exports'));

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
          service: 'data-service',
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
        name: 'data-service',
        port: this.port,
        tags: ['graphql', 'data', 'analytics'],
        check: {
          http: `http://localhost:${this.port}/health`,
          interval: '10s',
        },
      });
      
      logger.info('Data service registered with service discovery');
    } catch (error) {
      logger.error('Failed to register data service with service discovery:', error);
    }
  }

  async start() {
    try {
      await this.initialize();
      
      this.app.listen(this.port, () => {
        logger.info(`Data service running on port ${this.port}`);
        logger.info(`GraphQL endpoint: http://localhost:${this.port}/graphql`);
        logger.info(`Health check: http://localhost:${this.port}/health`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start data service:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Data service shutdown initiated');
    
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
      
      logger.info('Data service shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during data service shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the service if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dataService = new DataService();
  dataService.start();
}

export default DataService;
