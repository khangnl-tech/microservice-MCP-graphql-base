// Common type definitions

export type ServiceName = 
  | 'api-gateway'
  | 'users-service'
  | 'auth-service'
  | 'ai-service'
  | 'media-service'
  | 'notification-service';

export type EventType = 
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'auth.login'
  | 'auth.logout'
  | 'ai.request'
  | 'ai.response'
  | 'media.uploaded'
  | 'media.processed'
  | 'notification.sent';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export type NotificationType = 'email' | 'push' | 'sms';

export type FileType = 'image' | 'video' | 'audio' | 'document' | 'excel';

export type AIModel = 
  | 'gpt-4'
  | 'gpt-3.5-turbo'
  | 'dall-e-3'
  | 'whisper-1'
  | 'gemini-pro'
  | 'gemini-pro-vision'
  | 'bert-base-uncased'
  | 'roberta-base';

export type MCPTransport = 'stdio' | 'sse';

export type MCPCapability = 'logging' | 'prompts' | 'resources' | 'tools';

export type DatabaseProvider = 'mongodb' | 'postgresql' | 'mysql' | 'redis' | 'qdrant';

export type CacheProvider = 'redis' | 'memory';

export type MessageBroker = 'nats' | 'rabbitmq' | 'kafka';

export type AuthProvider = 'jwt' | 'oauth2' | 'saml';

export type Environment = 'development' | 'staging' | 'production' | 'test';

export type SortOrder = 'asc' | 'desc';

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Maybe<T> = T | undefined;

export type Constructor<T = {}> = new (...args: any[]) => T;

export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;

export type EventHandler<T = any> = (data: T) => Promise<void> | void;

export type Middleware = (req: any, res: any, next: any) => void;

export type ValidationSchema = {
  [key: string]: any;
};

export type ConfigValue = string | number | boolean | object | null | undefined;

export type ConfigObject = {
  [key: string]: ConfigValue;
};

// GraphQL types
export type GraphQLContext = {
  user?: any;
  correlationId: string;
  services: {
    [key in ServiceName]?: any;
  };
};

export type GraphQLResolver<TResult = any, TParent = any, TArgs = any> = (
  parent: TParent,
  args: TArgs,
  context: GraphQLContext,
  info: any
) => Promise<TResult> | TResult;

// MCP types
export type MCPToolHandler = (params: any) => Promise<any>;

export type MCPResourceHandler = (uri: string) => Promise<any>;

export type MCPPromptHandler = (name: string, args?: any) => Promise<string>;

// Database types
export type DatabaseConnection = {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
};

export type Repository<T> = {
  findById(id: string): Promise<T | null>;
  findOne(filter: any): Promise<T | null>;
  findMany(filter: any, options?: any): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(filter?: any): Promise<number>;
};

// Service types
export type ServiceHealth = {
  status: HealthStatus;
  timestamp: Date;
  version: string;
  dependencies: {
    [key: string]: {
      status: HealthStatus;
      responseTime?: number;
      error?: string;
    };
  };
};

export type ServiceMetrics = {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
  };
  cpuUsage: number;
};

// Error types
export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'CONFLICT_ERROR'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'MCP_ERROR'
  | 'INTERNAL_ERROR';

export type ErrorDetails = {
  code: ErrorCode;
  message: string;
  statusCode: number;
  timestamp: Date;
  correlationId?: string;
  metadata?: any;
};

// API types
export type APIVersion = 'v1' | 'v2';

export type APIEndpoint = {
  method: HttpMethod;
  path: string;
  version: APIVersion;
  handler: string;
  middleware?: string[];
  auth?: boolean;
  roles?: string[];
  permissions?: string[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  cache?: {
    ttl: number;
  };
  validation?: ValidationSchema;
};

// Event types
export type EventMetadata = {
  eventId: string;
  eventType: EventType;
  timestamp: Date;
  source: ServiceName;
  correlationId?: string;
  userId?: string;
  version: string;
};

export type DomainEvent<T = any> = {
  metadata: EventMetadata;
  payload: T;
};

// Configuration types
export type ServiceConfiguration = {
  name: ServiceName;
  version: string;
  environment: Environment;
  port: number;
  host: string;
  database: {
    provider: DatabaseProvider;
    url: string;
    options?: any;
  };
  cache?: {
    provider: CacheProvider;
    url: string;
    options?: any;
  };
  messageBroker?: {
    provider: MessageBroker;
    url: string;
    options?: any;
  };
  auth?: {
    provider: AuthProvider;
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  logging: {
    level: LogLevel;
    format: string;
  };
  monitoring?: {
    enabled: boolean;
    endpoint?: string;
  };
  mcp?: {
    enabled: boolean;
    transport: MCPTransport;
    capabilities: MCPCapability[];
  };
};
