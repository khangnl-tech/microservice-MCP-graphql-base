import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import logger from '../utils/logger.js';
import { config } from '../config/index.js';

class MCPServer {
  constructor(serverInfo) {
    this.server = new Server(
      {
        name: serverInfo.name || 'microservice-mcp-server',
        version: serverInfo.version || '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.tools = new Map();
    this.resources = new Map();
    this.prompts = new Map();
    
    this.setupHandlers();
    logger.info(`MCP Server initialized: ${serverInfo.name}`);
  }

  setupHandlers() {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.tools.values());
      logger.debug(`Listing ${tools.length} available tools`);
      return { tools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info(`Tool called: ${name}`, { arguments: args });
      
      const tool = this.tools.get(name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      try {
        // Validate arguments if schema is provided
        if (tool.inputSchema) {
          const schema = z.object(tool.inputSchema.properties || {});
          schema.parse(args);
        }

        const result = await tool.handler(args);
        
        logger.info(`Tool ${name} executed successfully`);
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error(`Tool ${name} execution failed:`, error);
        throw new Error(`Tool execution failed: ${error.message}`);
      }
    });
  }

  // Register a tool
  registerTool(toolConfig) {
    const {
      name,
      description,
      inputSchema,
      handler,
    } = toolConfig;

    if (!name || !description || !handler) {
      throw new Error('Tool must have name, description, and handler');
    }

    const tool = {
      name,
      description,
      inputSchema: inputSchema || {
        type: 'object',
        properties: {},
      },
      handler,
    };

    this.tools.set(name, tool);
    logger.info(`Tool registered: ${name}`);
  }

  // Register a resource
  registerResource(resourceConfig) {
    const {
      uri,
      name,
      description,
      mimeType,
      handler,
    } = resourceConfig;

    if (!uri || !name || !handler) {
      throw new Error('Resource must have uri, name, and handler');
    }

    const resource = {
      uri,
      name,
      description,
      mimeType,
      handler,
    };

    this.resources.set(uri, resource);
    logger.info(`Resource registered: ${name} (${uri})`);
  }

  // Register a prompt
  registerPrompt(promptConfig) {
    const {
      name,
      description,
      arguments: promptArgs,
      handler,
    } = promptConfig;

    if (!name || !description || !handler) {
      throw new Error('Prompt must have name, description, and handler');
    }

    const prompt = {
      name,
      description,
      arguments: promptArgs || [],
      handler,
    };

    this.prompts.set(name, prompt);
    logger.info(`Prompt registered: ${name}`);
  }

  // Start the MCP server
  async start() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info('MCP Server started successfully');
    } catch (error) {
      logger.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  // Stop the MCP server
  async stop() {
    try {
      await this.server.close();
      logger.info('MCP Server stopped successfully');
    } catch (error) {
      logger.error('Failed to stop MCP server:', error);
      throw error;
    }
  }

  // Get server instance
  getServer() {
    return this.server;
  }
}

// Default tools for microservice operations
export const createDefaultTools = (serviceName) => {
  return [
    {
      name: 'health_check',
      description: `Check the health status of ${serviceName} service`,
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        return {
          status: 'healthy',
          service: serviceName,
          timestamp: new Date().toISOString(),
        };
      },
    },
    {
      name: 'get_service_info',
      description: `Get information about ${serviceName} service`,
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        return {
          name: serviceName,
          version: '1.0.0',
          environment: config.NODE_ENV,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        };
      },
    },
    {
      name: 'list_endpoints',
      description: `List available endpoints for ${serviceName} service`,
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        return {
          graphql: '/graphql',
          health: '/health',
          metrics: '/metrics',
        };
      },
    },
  ];
};

export default MCPServer;
export { MCPServer };
