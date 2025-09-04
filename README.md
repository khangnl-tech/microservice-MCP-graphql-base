# AIVA Microservices Architecture

Modern microservices architecture built with Node.js, TypeScript, GraphQL, and Model Context Protocol (MCP) support.

## Architecture Overview

This project implements a scalable microservices architecture with the following components:

### Core Services
- **API Gateway** (Port 3000) - GraphQL endpoint, request routing, authentication
- **Users Service** (Port 3001) - User management and profiles
- **Auth Service** (Port 3002) - Authentication and authorization
- **AI Service** (Port 3003) - AI/ML integrations (OpenAI, Google AI, HuggingFace, etc.)
- **Media Service** (Port 3004) - File processing (images, videos, documents)
- **Notification Service** (Port 3005) - Email, SMS, push notifications
- **Orchestrator** (Port 3100) - Service discovery, health monitoring, load balancing

### Infrastructure Components
- **MongoDB** - Separate databases for each service
- **Redis** - Caching and session management
- **NATS** - Message broker for inter-service communication
- **Qdrant** - Vector database for AI embeddings
- **Docker** - Containerization and deployment

### Shared Libraries
- **@libs/common** - Shared utilities, types, patterns, NATS client
- **@libs/mcp** - Model Context Protocol implementation

## Tech Stack

### Backend Framework
- Node.js with TypeScript
- Express.js for HTTP services
- Apollo Server for GraphQL

### Databases
- MongoDB (with Mongoose) - Primary data storage
- Redis - Caching and sessions
- Qdrant - Vector database for AI

### AI/ML Integration
- OpenAI (GPT-4, DALL-E, Whisper)
- Google AI (Gemini)
- HuggingFace Transformers
- ElevenLabs (Voice synthesis)
- Together AI

### Communication
- GraphQL - Unified API layer
- NATS - Message broker and service mesh
- Socket.IO - Real-time communication
- MCP - Model Context Protocol

### Development Tools
- TypeScript with strict typing
- ESLint for code quality
- Jest for testing
- Nodemon for development
- Docker & Docker Compose

## Project Structure

```
├── apps/                          # Microservices
│   ├── api-gateway/              # GraphQL API Gateway
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── health.controller.ts
│   │   │   ├── users.controller.ts   # Proxy HTTP -> Users service
│   │   │   └── common/
│   │   │       └── swagger.ts
│   │   └── .env
│   │
│   ├── users-service/            # User management microservice
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   │       └── create-user.dto.ts
│   │   └── .env
│   │
│   ├── auth-service/             # Authentication service
│   ├── ai-service/               # AI/ML processing
│   ├── media-service/            # File processing
│   ├── notification-service/     # Notifications
│   └── orchestrator/             # Service orchestration
│
├── libs/                         # Shared libraries
│   ├── common/                   # Common utilities
│   │   └── src/
│   │       ├── index.ts
│   │       ├── constants.ts
│   │       ├── patterns.ts
│   │       ├── nats-client.module.ts
│   │       └── validation.pipe.ts
│   └── mcp/                      # MCP implementation
│
├── docker-compose.yml            # Infrastructure services
├── package.json                  # Workspace configuration
└── tsconfig.base.json           # TypeScript configuration
```

## Service Orchestration

The **Orchestrator** service provides:

### Service Discovery
- Automatic service registration via NATS
- Dynamic service discovery
- Load balancing and failover
- Health monitoring and circuit breakers

### Features
- **Health Monitoring**: Continuous health checks for all services
- **Load Balancing**: Intelligent request distribution
- **Circuit Breaker**: Fault tolerance and resilience
- **Service Registry**: Centralized service information
- **Metrics Collection**: Performance and usage metrics
- **Auto-scaling**: Dynamic scaling based on load

### Communication Flow
```
Client Request → API Gateway → Orchestrator → Target Service
                     ↓              ↓
                 GraphQL         NATS Messaging
                 Resolver        Service Discovery
```

## Model Context Protocol (MCP) Architecture

### MCP Overview
MCP enables AI models to interact with external tools and data sources through a standardized protocol.

### MCP Components

#### 1. MCP Server
```typescript
import { MCPServer } from '@libs/mcp';

const server = new MCPServer({
  name: 'aiva-tools',
  version: '1.0.0',
  transport: { type: 'stdio' }
});
```

#### 2. Tools
Functions that AI models can call:
```typescript
server.addTool({
  name: 'get-user',
  description: 'Retrieve user information',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string' }
    }
  },
  handler: async (params) => {
    // Call users-service via NATS
    return await natsClient.request('users.get', params);
  }
});
```

#### 3. Resources
Data sources accessible to AI models:
```typescript
server.addResource({
  uri: 'users://profile/{userId}',
  name: 'User Profile',
  description: 'User profile information',
  handler: async (uri) => {
    const userId = extractUserIdFromUri(uri);
    return await getUserProfile(userId);
  }
});
```

#### 4. Prompts
Reusable prompt templates:
```typescript
server.addPrompt({
  name: 'user-analysis',
  description: 'Analyze user behavior',
  arguments: [
    { name: 'userId', required: true },
    { name: 'timeframe', required: false }
  ],
  handler: async (args) => {
    return {
      messages: [{
        role: 'user',
        content: `Analyze user ${args.userId} behavior...`
      }]
    };
  }
});
```

### MCP Integration Flow

```
AI Model ←→ MCP Client ←→ MCP Server ←→ Microservices
    ↓           ↓           ↓           ↓
  Requests   Protocol   Tools/      NATS/HTTP
            Messages   Resources   Communication
```

### MCP Service Integration

Each microservice can expose MCP capabilities:

```typescript
// In users-service
import { MCPServer } from '@libs/mcp';
import { natsClient } from '@libs/common';

const mcpServer = new MCPServer({
  name: 'users-mcp',
  version: '1.0.0'
});

// Expose user operations as MCP tools
mcpServer.addTool({
  name: 'create-user',
  description: 'Create a new user',
  inputSchema: {
    type: 'object',
    properties: {
      email: { type: 'string' },
      name: { type: 'string' }
    }
  },
  handler: async (params) => {
    return await userService.createUser(params);
  }
});
```

## API Development Workflow

### 1. Service Development Pattern

#### Step 1: Define Data Transfer Objects (DTOs)
```typescript
// src/dto/create-user.dto.ts
export interface CreateUserDto {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
}
```

#### Step 2: Implement Service Logic
```typescript
// src/users.service.ts
import { natsClient, Logger } from '@libs/common';

export class UsersService {
  private logger = Logger.getInstance();

  async createUser(userData: CreateUserDto): Promise<User> {
    // Business logic
    const user = await this.userRepository.create(userData);
    
    // Publish event
    await natsClient.publishEvent({
      eventType: 'user.created',
      data: user,
      timestamp: new Date(),
      source: 'users-service'
    });

    return user;
  }
}
```

#### Step 3: Create Controllers
```typescript
// src/users.controller.ts
import { validationPipe, CommonSchemas } from '@libs/common';

export class UsersController {
  constructor(private usersService: UsersService) {}

  async createUser(req: Request, res: Response) {
    try {
      // Validate input
      const userData = await validationPipe.validateBody(
        req.body, 
        CommonSchemas.createUser
      );

      const user = await this.usersService.createUser(userData);
      
      res.status(201).json({
        success: true,
        data: user,
        timestamp: new Date()
      });
    } catch (error) {
      // Error handling
    }
  }
}
```

#### Step 4: Setup NATS Communication
```typescript
// src/main.ts
import { natsClient } from '@libs/common';

async function bootstrap() {
  // Connect to NATS
  await natsClient.connect(process.env.NATS_URL);

  // Register service
  await natsClient.registerService('users-service', {
    port: process.env.PORT,
    version: '1.0.0',
    health: '/health'
  });

  // Setup request handlers
  await natsClient.reply('users.create', async (data) => {
    return await usersService.createUser(data);
  });
}
```

### 2. Inter-Service Communication

#### Request-Response Pattern
```typescript
// From api-gateway to users-service
const user = await natsClient.request('users.get', { userId: '123' });
```

#### Event-Driven Pattern
```typescript
// Publish event
await natsClient.publishEvent({
  eventType: 'user.created',
  data: userData,
  timestamp: new Date(),
  source: 'users-service'
});

// Subscribe to events
await natsClient.subscribeToEvents('user.created', async (event) => {
  // Handle user creation in other services
});
```

### 3. GraphQL Integration

#### Define GraphQL Schema
```typescript
// In api-gateway
const typeDefs = `
  type User {
    id: ID!
    email: String!
    username: String!
    firstName: String!
    lastName: String!
  }

  type Query {
    user(id: ID!): User
    users(pagination: PaginationInput): UsersConnection
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
  }
`;
```

#### Implement Resolvers
```typescript
const resolvers = {
  Query: {
    user: async (_, { id }, context) => {
      return await natsClient.request('users.get', { userId: id });
    }
  },
  Mutation: {
    createUser: async (_, { input }, context) => {
      return await natsClient.request('users.create', input);
    }
  }
};
```

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd aiva-microservices
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Configure environment variables
```

3. **Start infrastructure services**
```bash
npm run docker:up
```

4. **Start all microservices**
```bash
npm run services:start
```

### Development Commands

```bash
# Start individual services
npm run dev -w apps/api-gateway
npm run dev -w apps/users-service
npm run dev -w apps/orchestrator

# Build all services
npm run build

# Run tests
npm run test

# Lint code
npm run lint
```

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | GraphQL endpoint |
| Users Service | 3001 | User management |
| Auth Service | 3002 | Authentication |
| AI Service | 3003 | AI/ML processing |
| Media Service | 3004 | File processing |
| Notification Service | 3005 | Notifications |
| Orchestrator | 3100 | Service orchestration |

## Environment Configuration

### Service-Specific Environment Files
Each service has its own `.env` file:
- `apps/api-gateway/.env`
- `apps/users-service/.env`
- `apps/auth-service/.env`
- etc.

### Common Environment Variables
```env
# Database URLs (separate for each service)
MONGODB_USERS_URL=mongodb://admin:password@localhost:27017/users_db
MONGODB_AUTH_URL=mongodb://admin:password@localhost:27018/auth_db

# Redis
REDIS_URL=redis://localhost:6379

# Message Broker
NATS_URL=nats://localhost:4222

# AI Services
OPENAI_API_KEY=your-openai-key
GOOGLE_AI_API_KEY=your-google-ai-key

# JWT
JWT_SECRET=your-jwt-secret
```

## Monitoring and Health Checks

### Health Check Endpoints
```
GET /health - Service health status
GET /metrics - Service metrics
GET /ready - Readiness probe
```

### Service Discovery
Services automatically register with the orchestrator:
```typescript
await natsClient.registerService('users-service', {
  port: 3001,
  version: '1.0.0',
  health: '/health',
  capabilities: ['users', 'profiles']
});
```

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Helmet** - Security headers
- **CORS** - Cross-origin protection
- **Rate Limiting** - API protection
- **Input Validation** - Data sanitization with Joi
- **Service-to-Service Auth** - NATS-based secure communication

## Testing

```bash
# Run all tests
npm run test

# Run tests for specific service
npm run test -w apps/users-service

# Run with coverage
npm run test:coverage
```

## Deployment

### Docker Deployment
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Scaling Services
```bash
# Scale specific service
docker-compose up -d --scale users-service=3
```

## Performance Optimization

- **Redis Caching** - Response and session caching
- **Connection Pooling** - Database connection optimization
- **Message Queues** - Async processing with NATS
- **Load Balancing** - Orchestrator-managed load distribution
- **Circuit Breakers** - Fault tolerance patterns

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
