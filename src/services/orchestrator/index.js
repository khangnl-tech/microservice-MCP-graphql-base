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

// Workflow models
import Workflow from './models/Workflow.js';
import WorkflowExecution from './models/WorkflowExecution.js';

// Orchestrator services
import WorkflowEngine from './services/WorkflowEngine.js';
import TaskScheduler from './services/TaskScheduler.js';
import ServiceCommunicator from './services/ServiceCommunicator.js';

class OrchestratorService {
  constructor() {
    this.app = express();
    this.apolloServer = null;
    this.mcpServer = null;
    this.port = config.ORCHESTRATOR_SERVICE_PORT || 4005;
    
    // Initialize orchestrator components
    this.workflowEngine = new WorkflowEngine();
    this.taskScheduler = new TaskScheduler();
    this.serviceCommunicator = new ServiceCommunicator();
    
    logger.addServiceName('orchestrator-service');
  }

  async initialize() {
    try {
      // Connect to databases
      await this.connectDatabases();
      
      // Initialize orchestrator services
      await this.initializeOrchestratorServices();
      
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
      
      logger.info('Orchestrator service initialized successfully');
    } catch (error) {
      logger.error('Orchestrator service initialization failed:', error);
      throw error;
    }
  }

  async connectDatabases() {
    try {
      await mongodb.connect('orchestrator_db');
      await redis.connect();
      logger.info('Orchestrator service databases connected');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async initializeOrchestratorServices() {
    try {
      await this.workflowEngine.initialize();
      await this.taskScheduler.initialize();
      await this.serviceCommunicator.initialize();
      logger.info('Orchestrator services initialized');
    } catch (error) {
      logger.error('Orchestrator services initialization failed:', error);
      throw error;
    }
  }

  async setupMCPServer() {
    try {
      this.mcpServer = new MCPServer({
        name: 'orchestrator-mcp-server',
        version: '1.0.0',
      });

      // Register default tools
      const defaultTools = createDefaultTools('orchestrator-service');
      defaultTools.forEach(tool => {
        this.mcpServer.registerTool(tool);
      });

      // Register orchestrator-specific tools
      this.registerOrchestratorTools();

      logger.info('Orchestrator MCP Server setup completed');
    } catch (error) {
      logger.error('Orchestrator MCP Server setup failed:', error);
      throw error;
    }
  }

  registerOrchestratorTools() {
    // Workflow management tools
    this.mcpServer.registerTool({
      name: 'create_workflow',
      description: 'Create a new workflow definition',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Workflow name',
          },
          description: {
            type: 'string',
            description: 'Workflow description',
          },
          steps: {
            type: 'array',
            description: 'Array of workflow steps',
          },
        },
        required: ['name', 'steps'],
      },
      handler: async (args) => {
        return await this.workflowEngine.createWorkflow(args);
      },
    });

    this.mcpServer.registerTool({
      name: 'execute_workflow',
      description: 'Execute a workflow with given parameters',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'Workflow ID to execute',
          },
          parameters: {
            type: 'object',
            description: 'Workflow execution parameters',
          },
        },
        required: ['workflowId'],
      },
      handler: async (args) => {
        return await this.workflowEngine.executeWorkflow(args.workflowId, args.parameters);
      },
    });

    // Service orchestration tools
    this.mcpServer.registerTool({
      name: 'orchestrate_ai_pipeline',
      description: 'Orchestrate a complex AI processing pipeline',
      inputSchema: {
        type: 'object',
        properties: {
          pipeline: {
            type: 'array',
            description: 'Array of AI processing steps',
          },
          input: {
            type: 'object',
            description: 'Input data for the pipeline',
          },
        },
        required: ['pipeline', 'input'],
      },
      handler: async (args) => {
        return await this.orchestrateAIPipeline(args.pipeline, args.input);
      },
    });

    // Task scheduling tools
    this.mcpServer.registerTool({
      name: 'schedule_task',
      description: 'Schedule a task for future execution',
      inputSchema: {
        type: 'object',
        properties: {
          taskType: {
            type: 'string',
            description: 'Type of task to schedule',
          },
          schedule: {
            type: 'string',
            description: 'Cron expression for scheduling',
          },
          parameters: {
            type: 'object',
            description: 'Task parameters',
          },
        },
        required: ['taskType', 'schedule'],
      },
      handler: async (args) => {
        return await this.taskScheduler.scheduleTask(args);
      },
    });
  }

  async setupApolloServer() {
    const typeDefs = gql`
      extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

      type Workflow @key(fields: "id") {
        id: ID!
        name: String!
        description: String
        steps: [WorkflowStep!]!
        status: String!
        createdBy: ID!
        createdAt: String!
        updatedAt: String!
      }

      type WorkflowStep {
        id: String!
        name: String!
        service: String!
        action: String!
        parameters: JSON
        dependencies: [String!]
        timeout: Int
        retryCount: Int
      }

      type WorkflowExecution @key(fields: "id") {
        id: ID!
        workflowId: ID!
        status: String!
        startedAt: String!
        completedAt: String
        parameters: JSON
        result: JSON
        error: String
        steps: [StepExecution!]!
      }

      type StepExecution {
        stepId: String!
        status: String!
        startedAt: String!
        completedAt: String
        result: JSON
        error: String
        retryCount: Int
      }

      type ScheduledTask @key(fields: "id") {
        id: ID!
        name: String!
        taskType: String!
        schedule: String!
        parameters: JSON
        status: String!
        lastRun: String
        nextRun: String
        createdAt: String!
      }

      scalar JSON

      type Query {
        workflows: [Workflow!]!
        workflow(id: ID!): Workflow
        workflowExecutions(workflowId: ID): [WorkflowExecution!]!
        workflowExecution(id: ID!): WorkflowExecution
        scheduledTasks: [ScheduledTask!]!
        scheduledTask(id: ID!): ScheduledTask
      }

      type Mutation {
        # Workflow Management
        createWorkflow(input: CreateWorkflowInput!): Workflow!
        updateWorkflow(id: ID!, input: UpdateWorkflowInput!): Workflow!
        deleteWorkflow(id: ID!): Boolean!
        
        # Workflow Execution
        executeWorkflow(workflowId: ID!, parameters: JSON): WorkflowExecution!
        cancelWorkflowExecution(id: ID!): Boolean!
        retryWorkflowExecution(id: ID!): WorkflowExecution!
        
        # Task Scheduling
        scheduleTask(input: ScheduleTaskInput!): ScheduledTask!
        updateScheduledTask(id: ID!, input: UpdateScheduledTaskInput!): ScheduledTask!
        deleteScheduledTask(id: ID!): Boolean!
        
        # Service Orchestration
        orchestrateAIPipeline(input: AIPipelineInput!): WorkflowExecution!
        orchestrateDataProcessing(input: DataProcessingInput!): WorkflowExecution!
        orchestrateMediaProcessing(input: MediaProcessingInput!): WorkflowExecution!
      }

      input CreateWorkflowInput {
        name: String!
        description: String
        steps: [WorkflowStepInput!]!
      }

      input UpdateWorkflowInput {
        name: String
        description: String
        steps: [WorkflowStepInput!]
      }

      input WorkflowStepInput {
        id: String!
        name: String!
        service: String!
        action: String!
        parameters: JSON
        dependencies: [String!]
        timeout: Int = 30000
        retryCount: Int = 3
      }

      input ScheduleTaskInput {
        name: String!
        taskType: String!
        schedule: String!
        parameters: JSON
      }

      input UpdateScheduledTaskInput {
        name: String
        schedule: String
        parameters: JSON
        status: String
      }

      input AIPipelineInput {
        steps: [AIPipelineStepInput!]!
        input: JSON!
      }

      input AIPipelineStepInput {
        service: String!
        model: String!
        action: String!
        parameters: JSON
      }

      input DataProcessingInput {
        source: String!
        operations: [DataOperationInput!]!
        destination: String!
      }

      input DataOperationInput {
        type: String!
        parameters: JSON
      }

      input MediaProcessingInput {
        files: [String!]!
        operations: [MediaOperationInput!]!
        outputFormat: String!
      }

      input MediaOperationInput {
        type: String!
        parameters: JSON
      }
    `;

    const resolvers = {
      Query: {
        workflows: async (_, __, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await Workflow.find({ createdBy: user.userId });
        },
        
        workflow: async (_, { id }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          const workflow = await Workflow.findById(id);
          if (!workflow || workflow.createdBy.toString() !== user.userId) {
            throw new Error('Workflow not found or not authorized');
          }
          return workflow;
        },
        
        workflowExecutions: async (_, { workflowId }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          const query = workflowId ? { workflowId } : {};
          return await WorkflowExecution.find(query).sort({ startedAt: -1 });
        },
        
        workflowExecution: async (_, { id }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await WorkflowExecution.findById(id);
        },
        
        scheduledTasks: async (_, __, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.taskScheduler.getScheduledTasks();
        },
        
        scheduledTask: async (_, { id }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.taskScheduler.getScheduledTask(id);
        },
      },

      Mutation: {
        createWorkflow: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.workflowEngine.createWorkflow({
            ...input,
            createdBy: user.userId,
          });
        },
        
        updateWorkflow: async (_, { id, input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.workflowEngine.updateWorkflow(id, input, user.userId);
        },
        
        deleteWorkflow: async (_, { id }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.workflowEngine.deleteWorkflow(id, user.userId);
        },
        
        executeWorkflow: async (_, { workflowId, parameters }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.workflowEngine.executeWorkflow(workflowId, parameters, user.userId);
        },
        
        cancelWorkflowExecution: async (_, { id }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.workflowEngine.cancelExecution(id);
        },
        
        retryWorkflowExecution: async (_, { id }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.workflowEngine.retryExecution(id);
        },
        
        scheduleTask: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.taskScheduler.scheduleTask(input);
        },
        
        updateScheduledTask: async (_, { id, input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.taskScheduler.updateScheduledTask(id, input);
        },
        
        deleteScheduledTask: async (_, { id }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.taskScheduler.deleteScheduledTask(id);
        },
        
        orchestrateAIPipeline: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.orchestrateAIPipeline(input.steps, input.input, user.userId);
        },
        
        orchestrateDataProcessing: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.orchestrateDataProcessing(input, user.userId);
        },
        
        orchestrateMediaProcessing: async (_, { input }, { user }) => {
          if (!user) throw new Error('Not authenticated');
          return await this.orchestrateMediaProcessing(input, user.userId);
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
                logger.info(`Orchestrator GraphQL Operation: ${requestContext.request.operationName}`);
              },
              didEncounterErrors(requestContext) {
                logger.error('Orchestrator GraphQL Errors:', requestContext.errors);
              },
            };
          },
        },
      ],
    });

    await this.apolloServer.start();
    logger.info('Orchestrator Apollo Server setup completed');
  }

  // Orchestration methods
  async orchestrateAIPipeline(steps, input, userId) {
    logger.info('Starting AI pipeline orchestration', { steps: steps.length, userId });
    
    // Create workflow for AI pipeline
    const workflow = await this.workflowEngine.createWorkflow({
      name: `AI Pipeline - ${new Date().toISOString()}`,
      description: 'Auto-generated AI processing pipeline',
      steps: steps.map((step, index) => ({
        id: `step_${index}`,
        name: `${step.service}_${step.action}`,
        service: step.service,
        action: step.action,
        parameters: { ...step.parameters, model: step.model },
        dependencies: index > 0 ? [`step_${index - 1}`] : [],
      })),
      createdBy: userId,
    });
    
    // Execute the workflow
    return await this.workflowEngine.executeWorkflow(workflow._id, { input }, userId);
  }

  async orchestrateDataProcessing(input, userId) {
    logger.info('Starting data processing orchestration', { source: input.source, userId });
    
    const steps = input.operations.map((op, index) => ({
      id: `data_op_${index}`,
      name: `Data ${op.type}`,
      service: 'data-service',
      action: op.type,
      parameters: op.parameters,
      dependencies: index > 0 ? [`data_op_${index - 1}`] : [],
    }));
    
    const workflow = await this.workflowEngine.createWorkflow({
      name: `Data Processing - ${new Date().toISOString()}`,
      description: 'Auto-generated data processing pipeline',
      steps,
      createdBy: userId,
    });
    
    return await this.workflowEngine.executeWorkflow(workflow._id, input, userId);
  }

  async orchestrateMediaProcessing(input, userId) {
    logger.info('Starting media processing orchestration', { files: input.files.length, userId });
    
    const steps = input.operations.map((op, index) => ({
      id: `media_op_${index}`,
      name: `Media ${op.type}`,
      service: 'media-service',
      action: op.type,
      parameters: op.parameters,
      dependencies: index > 0 ? [`media_op_${index - 1}`] : [],
    }));
    
    const workflow = await this.workflowEngine.createWorkflow({
      name: `Media Processing - ${new Date().toISOString()}`,
      description: 'Auto-generated media processing pipeline',
      steps,
      createdBy: userId,
    });
    
    return await this.workflowEngine.executeWorkflow(workflow._id, input, userId);
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
          service: 'orchestrator-service',
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
            user = { token };
          } catch (error) {
            logger.warn('Invalid token provided');
          }
        }

        return { user, req };
      },
    }));

    logger.info('Orchestrator routes setup completed');
  }

  async registerService() {
    try {
      await serviceDiscovery.registerService({
        name: 'orchestrator-service',
        port: this.port,
        tags: ['graphql', 'orchestrator', 'workflow'],
        check: {
          http: `http://localhost:${this.port}/health`,
          interval: '10s',
        },
      });
      
      logger.info('Orchestrator service registered with service discovery');
    } catch (error) {
      logger.error('Failed to register orchestrator service with service discovery:', error);
    }
  }

  async start() {
    try {
      await this.initialize();
      
      this.app.listen(this.port, () => {
        logger.info(`Orchestrator service running on port ${this.port}`);
        logger.info(`GraphQL endpoint: http://localhost:${this.port}/graphql`);
        logger.info(`Health check: http://localhost:${this.port}/health`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start orchestrator service:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Orchestrator service shutdown initiated');
    
    try {
      if (this.mcpServer) {
        await this.mcpServer.stop();
      }
      
      if (this.apolloServer) {
        await this.apolloServer.stop();
      }
      
      await this.taskScheduler.shutdown();
      await serviceDiscovery.shutdown();
      await mongodb.disconnect();
      await redis.disconnect();
      
      logger.info('Orchestrator service shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during orchestrator service shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the service if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestratorService = new OrchestratorService();
  orchestratorService.start();
}

export default OrchestratorService;
