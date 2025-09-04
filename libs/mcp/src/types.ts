import { MCPMessage, MCPTool, MCPResource } from '@libs/common';

// MCP Protocol Types
export interface MCPServerCapabilities {
  logging?: {};
  prompts?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
}

export interface MCPClientCapabilities {
  experimental?: {
    [key: string]: any;
  };
  sampling?: {};
}

export interface MCPInitializeParams {
  protocolVersion: string;
  capabilities: MCPClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface MCPListToolsResult {
  tools: MCPTool[];
}

export interface MCPCallToolParams {
  name: string;
  arguments?: any;
}

export interface MCPCallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPListResourcesResult {
  resources: MCPResource[];
}

export interface MCPReadResourceParams {
  uri: string;
}

export interface MCPReadResourceResult {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}

export interface MCPListPromptsResult {
  prompts: Array<{
    name: string;
    description?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }>;
}

export interface MCPGetPromptParams {
  name: string;
  arguments?: {
    [key: string]: string;
  };
}

export interface MCPGetPromptResult {
  description?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text' | 'image';
      text?: string;
      data?: string;
      mimeType?: string;
    };
  }>;
}

export interface MCPLogEntry {
  level: 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';
  data: any;
  logger?: string;
}

export interface MCPNotificationParams {
  method: string;
  params?: any;
}

// Transport Types
export type MCPTransportType = 'stdio' | 'sse';

export interface MCPTransport {
  send(message: MCPMessage): Promise<void>;
  receive(): Promise<MCPMessage>;
  close(): Promise<void>;
  isConnected(): boolean;
}

export interface MCPTransportOptions {
  type: MCPTransportType;
  options?: any;
}

// Server Types
export interface MCPServerOptions {
  name: string;
  version: string;
  capabilities?: MCPServerCapabilities;
  transport: MCPTransportOptions;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: {
      [key: string]: any;
    };
    required?: string[];
  };
  handler: (params: any) => Promise<MCPCallToolResult>;
}

export interface MCPResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: (uri: string) => Promise<MCPReadResourceResult>;
}

export interface MCPPromptDefinition {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
  handler: (args?: any) => Promise<MCPGetPromptResult>;
}

// Client Types
export interface MCPClientOptions {
  serverInfo: {
    name: string;
    version: string;
  };
  capabilities?: MCPClientCapabilities;
  transport: MCPTransportOptions;
}

// Error Types
export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export const MCPErrorCodes = {
  // Standard JSON-RPC error codes
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // MCP-specific error codes
  INVALID_TOOL: -32000,
  INVALID_RESOURCE: -32001,
  INVALID_PROMPT: -32002,
  RESOURCE_NOT_FOUND: -32003,
  TOOL_EXECUTION_ERROR: -32004,
  PROMPT_EXECUTION_ERROR: -32005,
} as const;

// Event Types
export interface MCPServerEvents {
  'initialized': () => void;
  'tool-called': (toolName: string, params: any) => void;
  'resource-read': (uri: string) => void;
  'prompt-requested': (name: string, args?: any) => void;
  'error': (error: MCPError) => void;
  'disconnected': () => void;
}

export interface MCPClientEvents {
  'connected': () => void;
  'initialized': (result: MCPInitializeResult) => void;
  'notification': (method: string, params?: any) => void;
  'error': (error: MCPError) => void;
  'disconnected': () => void;
}

// Utility Types
export type MCPMethodHandler = (params?: any) => Promise<any>;

export type MCPNotificationHandler = (params?: any) => Promise<void>;

export interface MCPMethodRegistry {
  [method: string]: MCPMethodHandler;
}

export interface MCPNotificationRegistry {
  [method: string]: MCPNotificationHandler;
}
