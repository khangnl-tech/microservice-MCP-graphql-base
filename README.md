# 🏗️ Microservice MCP GraphQL Base

Kiến trúc microservice toàn diện được xây dựng với GraphQL federation, chuẩn Model Context Protocol (MCP), và tích hợp AI/ML mở rộng.

## 📋 Mục lục

- [🏗️ Tổng quan Kiến trúc](#️-tổng-quan-kiến-trúc)
- [🚀 Các Services](#-các-services)
- [🤖 Kiến trúc MCP](#-kiến-trúc-mcp)
- [💻 Hướng dẫn Phát triển API](#-hướng-dẫn-phát-triển-api)
- [🛠️ Tech Stack](#️-tech-stack)
- [📦 Cài đặt](#-cài-đặt)
- [🔧 Cấu hình](#-cấu-hình)
- [🚀 Sử dụng](#-sử-dụng)
- [📊 Monitoring & Logging](#-monitoring--logging)

## 🏗️ Tổng quan Kiến trúc

### Kiến trúc Microservice với Orchestrator Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATIONS                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTP/GraphQL/WebSocket
┌─────────────────────▼───────────────────────────────────────────┐
│                   GATEWAY SERVICE (Port 4000)                  │
│  • GraphQL Federation Gateway                                  │
│  • Authentication Middleware                                   │
│  • Service Discovery & Load Balancing                         │
│  • Socket.IO Server                                           │
│  • MCP Server Integration                                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Service Communication
┌─────────────────────▼───────────────────────────────────────────┐
│                ORCHESTRATOR SERVICE (Port 4005)                │
│  • Workflow Engine & Management                               │
│  • Business Logic Coordination                                │
│  • Task Scheduling & Cron Jobs                               │
│  • Inter-service Communication                               │
│  • Saga Pattern Implementation                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Orchestrated Calls
┌─────────────────────▼───────────────────────────────────────────┐
│                      MICROSERVICES LAYER                       │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│  AUTH SERVICE   │   AI SERVICE    │  MEDIA SERVICE  │   DATA    │
│   (Port 4001)   │  (Port 4002)    │  (Port 4003)    │ SERVICE   │
│                 │                 │                 │(Port 4004)│
│ • User Mgmt     │ • OpenAI        │ • Image Proc    │• Excel    │
│ • JWT Auth      │ • Google AI     │ • Video Proc    │• Analytics│
│ • RBAC          │ • HuggingFace   │ • PDF Proc      │• ETL      │
│ • Sessions      │ • ElevenLabs    │ • File Upload   │• Reports  │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
                      │ Database Layer
┌─────────────────────▼───────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                        │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│    MONGODB      │     REDIS       │     QDRANT      │  CONSUL   │
│  (Port 27017)   │  (Port 6379)    │  (Port 6333)    │(Port 8500)│
│                 │                 │                 │           │
│ • User Data     │ • Sessions      │ • Vector DB     │• Service  │
│ • Workflows     │ • Caching       │ • Embeddings    │Discovery  │
│ • AI Requests   │ • Pub/Sub       │ • Semantic      │• Health   │
│ • Media Meta    │ • Rate Limit    │  Search         │Checks     │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
```

### Đặc điểm Kiến trúc

1. **API Gateway Pattern**: Gateway Service làm single entry point
2. **Orchestrator Pattern**: Orchestrator Service điều phối business logic
3. **Service Mesh**: Service discovery với Consul
4. **Event-Driven**: Async communication với Redis pub/sub
5. **CQRS**: Command Query Responsibility Segregation
6. **Saga Pattern**: Distributed transaction management

## 🚀 Các Services

### 🌐 Gateway Service (Port 4000)
**Vai trò**: API Gateway & Entry Point

**Chức năng chính**:
- **GraphQL Federation**: Kết hợp schemas từ tất cả microservices
- **Authentication**: JWT verification và user context
- **Service Discovery**: Tự động phát hiện và route đến services
- **Load Balancing**: Phân tải requests giữa service instances
- **Rate Limiting**: Giới hạn requests per user/IP
- **Socket.IO**: Real-time communication
- **MCP Integration**: Expose MCP tools qua GraphQL

**Endpoints**:
- `GET /health` - Health check
- `GET /services` - Danh sách services đã đăng ký
- `POST /graphql` - GraphQL endpoint chính
- `WS /socket.io` - WebSocket connections

### 🔐 Authentication Service (Port 4001)
**Vai trò**: User Management & Security

**Chức năng chính**:
- **User Registration/Login**: Đăng ký và đăng nhập user
- **JWT Management**: Tạo, verify và refresh tokens
- **Role-Based Access Control**: Phân quyền theo roles
- **Session Management**: Quản lý sessions với Redis
- **Password Security**: Bcrypt hashing, account lockout
- **Profile Management**: Cập nhật thông tin user

**GraphQL Schema**:
```graphql
type User {
  id: ID!
  email: String!
  name: String!
  role: String!
  isActive: Boolean!
}

type Mutation {
  register(input: RegisterInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
  updateProfile(input: UpdateProfileInput!): User!
}
```

### 🤖 AI Service (Port 4002)
**Vai trò**: AI/ML Processing Hub

**Chức năng chính**:
- **OpenAI Integration**: GPT models, DALL-E, Whisper
- **Google AI**: Gemini models, PaLM API
- **HuggingFace**: Transformers, custom models
- **ElevenLabs**: Text-to-speech synthesis
- **Together AI**: Open-source model hosting
- **Google Cloud AI**: Speech, Translation, Vision
- **Vector Database**: Qdrant for embeddings và semantic search

**Supported AI Operations**:
```javascript
// Text Generation
await aiService.openaiChatCompletion({
  messages: [{ role: 'user', content: 'Hello' }],
  model: 'gpt-4'
});

// Image Generation
await aiService.openaiImageGeneration({
  prompt: 'A beautiful landscape',
  size: '1024x1024'
});

// Text-to-Speech
await aiService.elevenLabsTTS({
  text: 'Hello world',
  voiceId: 'voice-id'
});

// Vector Search
await aiService.qdrantSearch({
  collection: 'documents',
  vector: [0.1, 0.2, ...],
  limit: 10
});
```

### 📁 Media Service (Port 4003)
**Vai trò**: File & Media Processing

**Chức năng chính**:
- **Image Processing**: Resize, crop, format conversion (Sharp, Jimp)
- **Video Processing**: Encoding, compression, thumbnail (FFmpeg)
- **Audio Processing**: Format conversion, noise reduction
- **PDF Processing**: Text extraction, page manipulation
- **File Upload**: Multipart upload với validation
- **Storage Management**: Local và cloud storage integration

### 📊 Data Service (Port 4004)
**Vai trò**: Data Management & Analytics

**Chức năng chính**:
- **Excel Processing**: Read/write Excel files (ExcelJS)
- **Data Transformation**: ETL operations
- **Analytics**: Statistical analysis, reporting
- **Bulk Operations**: Mass data import/export
- **Data Validation**: Schema validation, data cleaning

### 🎯 Orchestrator Service (Port 4005)
**Vai trò**: Workflow & Business Logic Coordinator

**Chức năng chính**:
- **Workflow Engine**: Tạo và thực thi complex workflows
- **Task Scheduling**: Cron jobs và delayed tasks
- **Service Orchestration**: Điều phối calls giữa services
- **Saga Pattern**: Distributed transaction management
- **Error Handling**: Compensation và retry logic
- **Pipeline Management**: AI/ML pipeline orchestration

**Workflow Example**:
```javascript
const workflow = {
  name: "Content Creation Pipeline",
  steps: [
    {
      id: "generate_text",
      service: "ai-service",
      action: "openai_chat_completion",
      parameters: { model: "gpt-4", prompt: "Write an article" }
    },
    {
      id: "generate_image", 
      service: "ai-service",
      action: "openai_image_generation",
      dependencies: ["generate_text"],
      parameters: { prompt: "{{generate_text.result}}" }
    },
    {
      id: "create_pdf",
      service: "media-service", 
      action: "create_pdf",
      dependencies: ["generate_text", "generate_image"],
      parameters: { 
        text: "{{generate_text.result}}",
        image: "{{generate_image.result}}"
      }
    }
  ]
};
```

## 🛠️ Tech Stack

### Backend Framework
- Node.js with Express.js
- GraphQL with Apollo Server
- Apollo Federation for microservices

### Databases
- MongoDB with Mongoose ODM
- Redis for caching and sessions
- Qdrant vector database

### AI/ML Services
- OpenAI (GPT models, DALL-E)
- Google AI (Gemini)
- HuggingFace Transformers
- ElevenLabs (Voice synthesis)
- Together AI
- Google Cloud (Speech-to-Text, Text-to-Speech, Translate)

### Infrastructure
- Docker & Docker Compose
- Consul for service discovery
- PM2 for process management
- Winston for logging

### Security
- JWT authentication
- Helmet for security headers
- CORS protection
- MongoDB sanitization
- Rate limiting

## 📦 Installation

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB
- Redis

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd microservice-mcp-graphql-base
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start with Docker Compose**
```bash
npm run docker:up
```

5. **Or start services individually**
```bash
# Start all services in development
npm run dev

# Or start individual services
npm run dev:gateway
npm run dev:auth
npm run dev:ai
npm run dev:media
npm run dev:data
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
MONGODB_URI=mongodb://admin:password@localhost:27017/microservice_db?authSource=admin
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# AI Services
OPENAI_API_KEY=your-openai-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
TOGETHER_API_KEY=your-together-api-key

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Vector Database
QDRANT_URL=http://localhost:6333
```

## 🚀 Usage

### GraphQL Playground

Access the GraphQL playground at:
- Gateway: http://localhost:4000/graphql
- Auth Service: http://localhost:4001/graphql
- AI Service: http://localhost:4002/graphql

### Health Checks

Check service health:
- Gateway: http://localhost:4000/health
- Auth Service: http://localhost:4001/health
- AI Service: http://localhost:4002/health

### Service Discovery

View registered services:
- Consul UI: http://localhost:8500
- Services API: http://localhost:4000/services

## 🤖 Kiến trúc MCP (Model Context Protocol)

### Tổng quan MCP trong Dự án

Model Context Protocol (MCP) là chuẩn giao tiếp cho phép các AI systems tương tác với external tools và resources một cách standardized. Trong dự án này, MCP được implement để:

1. **Standardize AI Tool Integration**: Tất cả AI tools được expose qua MCP interface
2. **Enable Cross-Service Communication**: Services có thể gọi tools từ services khác
3. **Provide Unified Tool Access**: Client applications có thể access tất cả tools qua single interface
4. **Support Tool Composition**: Combine multiple tools để tạo complex workflows

### Kiến trúc MCP trong Hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP CLIENT                               │
│  (External Applications, AI Assistants, Workflows)             │
└─────────────────────┬───────────────────────────────────────────┘
                      │ MCP Protocol (JSON-RPC over stdio/http)
┌─────────────────────▼───────────────────────────────────────────┐
│                   GATEWAY MCP SERVER                           │
│  • Tool Registry & Discovery                                   │
│  • Request Routing & Load Balancing                           │
│  • Authentication & Authorization                             │
│  • Tool Composition & Chaining                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Internal MCP Communication
┌─────────────────────▼───────────────────────────────────────────┐
│                  SERVICE MCP SERVERS                           │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│   AUTH MCP      │    AI MCP       │   MEDIA MCP     │ORCHESTRATOR│
│   SERVER        │   SERVER        │   SERVER        │MCP SERVER  │
│                 │                 │                 │           │
│ • verify_token  │ • openai_chat   │ • process_image │• create_  │
│ • create_user   │ • google_ai     │ • extract_text  │workflow   │
│ • get_profile   │ • qdrant_search │ • convert_video │• execute_ │
│ • update_role   │ • elevenlabs_tts│ • generate_pdf  │workflow   │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
```

### MCP Server Implementation

Mỗi service implement một MCP Server với các components chính:

#### 1. MCP Server Class
```javascript
// src/shared/mcp/server.js
class MCPServer {
  constructor(serverInfo) {
    this.server = new Server(serverInfo, {
      capabilities: {
        tools: {},      // Available tools
        resources: {},  // Available resources  
        prompts: {}     // Available prompts
      }
    });
    this.tools = new Map();
    this.resources = new Map();
    this.prompts = new Map();
  }

  // Register a tool
  registerTool(toolConfig) {
    const { name, description, inputSchema, handler } = toolConfig;
    this.tools.set(name, { name, description, inputSchema, handler });
  }

  // Register a resource
  registerResource(resourceConfig) {
    const { uri, name, description, mimeType, handler } = resourceConfig;
    this.resources.set(uri, { uri, name, description, mimeType, handler });
  }
}
```

#### 2. Tool Registration Pattern
```javascript
// Example: AI Service MCP Tools
this.mcpServer.registerTool({
  name: 'openai_chat_completion',
  description: 'Generate text using OpenAI GPT models',
  inputSchema: {
    type: 'object',
    properties: {
      messages: {
        type: 'array',
        description: 'Array of message objects'
      },
      model: {
        type: 'string', 
        description: 'OpenAI model to use',
        default: 'gpt-3.5-turbo'
      },
      temperature: {
        type: 'number',
        description: 'Temperature for randomness',
        default: 0.7
      }
    },
    required: ['messages']
  },
  handler: async (args) => {
    return await this.openai.chatCompletion(args);
  }
});
```

### Available MCP Tools by Service

#### 🔐 Authentication Service MCP Tools
```javascript
// User Management Tools
'verify_token'     // Verify JWT token và return user info
'create_user'      // Create new user account
'get_user_profile' // Get user profile by ID
'update_user_role' // Update user role (admin only)
'list_users'       // List all users (admin only)
'deactivate_user'  // Deactivate user account

// Session Management Tools  
'create_session'   // Create new user session
'validate_session' // Validate existing session
'destroy_session'  // Destroy user session
```

#### 🤖 AI Service MCP Tools
```javascript
// Text Generation Tools
'openai_chat_completion'    // GPT chat completion
'openai_text_completion'    // GPT text completion  
'google_ai_generate'        // Google Gemini generation
'huggingface_inference'     // HuggingFace model inference
'together_ai_completion'    // Together AI completion

// Image Generation Tools
'openai_image_generation'   // DALL-E image generation
'openai_image_edit'         // DALL-E image editing
'openai_image_variation'    // DALL-E image variations

// Audio Processing Tools
'elevenlabs_tts'           // Text-to-speech conversion
'openai_whisper_stt'       // Speech-to-text transcription
'google_speech_to_text'    // Google Cloud STT
'google_text_to_speech'    // Google Cloud TTS

// Vector Database Tools
'qdrant_upsert'           // Insert/update vectors
'qdrant_search'           // Semantic vector search
'qdrant_delete'           // Delete vectors
'create_embeddings'       // Generate text embeddings
```

#### 📁 Media Service MCP Tools
```javascript
// Image Processing Tools
'resize_image'            // Resize image dimensions
'crop_image'              // Crop image to specified area
'convert_image_format'    // Convert between image formats
'compress_image'          // Compress image file size
'add_watermark'           // Add watermark to image

// Video Processing Tools  
'extract_video_frames'    // Extract frames from video
'compress_video'          // Compress video file
'convert_video_format'    // Convert video format
'generate_thumbnail'      // Generate video thumbnail
'extract_audio'           // Extract audio from video

// PDF Processing Tools
'extract_pdf_text'        // Extract text from PDF
'pdf_to_images'           // Convert PDF pages to images
'merge_pdfs'              // Merge multiple PDFs
'split_pdf'               // Split PDF into pages
'add_pdf_watermark'       // Add watermark to PDF
```

#### 🎯 Orchestrator Service MCP Tools
```javascript
// Workflow Management Tools
'create_workflow'         // Create workflow definition
'execute_workflow'        // Execute workflow with parameters
'get_workflow_status'     // Get workflow execution status
'cancel_workflow'         // Cancel running workflow
'retry_workflow'          // Retry failed workflow

// Task Scheduling Tools
'schedule_task'           // Schedule task with cron expression
'cancel_scheduled_task'   // Cancel scheduled task
'list_scheduled_tasks'    // List all scheduled tasks
'trigger_task_now'        // Trigger scheduled task immediately

// Service Orchestration Tools
'orchestrate_ai_pipeline'     // Orchestrate AI processing pipeline
'orchestrate_data_processing' // Orchestrate data processing workflow
'orchestrate_media_pipeline'  // Orchestrate media processing pipeline
```

### MCP Tool Usage Examples

#### 1. Simple Tool Call
```javascript
// Call single MCP tool
const result = await mcpClient.callTool('openai_chat_completion', {
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Explain quantum computing' }
  ],
  model: 'gpt-4',
  temperature: 0.7
});

console.log(result.content); // AI response
```

#### 2. Tool Chaining
```javascript
// Chain multiple tools together
async function createContentWithImage() {
  // Step 1: Generate text content
  const textResult = await mcpClient.callTool('openai_chat_completion', {
    messages: [{ role: 'user', content: 'Write a blog post about AI' }],
    model: 'gpt-4'
  });

  // Step 2: Generate image based on text
  const imageResult = await mcpClient.callTool('openai_image_generation', {
    prompt: `Create an illustration for: ${textResult.content.substring(0, 100)}`,
    size: '1024x1024'
  });

  // Step 3: Create PDF combining text and image
  const pdfResult = await mcpClient.callTool('create_pdf', {
    content: textResult.content,
    images: [imageResult.url],
    template: 'blog_post'
  });

  return pdfResult;
}
```

#### 3. Workflow-based Tool Orchestration
```javascript
// Create complex workflow using Orchestrator
const workflow = await mcpClient.callTool('create_workflow', {
  name: 'Content Creation Pipeline',
  description: 'Generate blog post with images and audio',
  steps: [
    {
      id: 'generate_text',
      tool: 'openai_chat_completion',
      parameters: {
        messages: [{ role: 'user', content: '{{input.topic}}' }],
        model: 'gpt-4'
      }
    },
    {
      id: 'generate_image',
      tool: 'openai_image_generation', 
      dependencies: ['generate_text'],
      parameters: {
        prompt: 'Illustration for: {{generate_text.result}}',
        size: '1024x1024'
      }
    },
    {
      id: 'create_audio',
      tool: 'elevenlabs_tts',
      dependencies: ['generate_text'],
      parameters: {
        text: '{{generate_text.result}}',
        voice_id: 'professional_voice'
      }
    },
    {
      id: 'create_final_content',
      tool: 'create_multimedia_content',
      dependencies: ['generate_text', 'generate_image', 'create_audio'],
      parameters: {
        text: '{{generate_text.result}}',
        image: '{{generate_image.url}}',
        audio: '{{create_audio.url}}',
        format: 'interactive_post'
      }
    }
  ]
});

// Execute the workflow
const execution = await mcpClient.callTool('execute_workflow', {
  workflowId: workflow.id,
  parameters: {
    input: { topic: 'The Future of Artificial Intelligence' }
  }
});
```

### MCP Resources

MCP cũng support resources - các data sources có thể được access:

```javascript
// Register resource
mcpServer.registerResource({
  uri: 'file://user_data/{userId}',
  name: 'User Data',
  description: 'Access user profile and preferences',
  mimeType: 'application/json',
  handler: async (uri) => {
    const userId = extractUserIdFromUri(uri);
    return await User.findById(userId);
  }
});

// Access resource
const userData = await mcpClient.readResource('file://user_data/123');
```

### MCP Security & Authentication

```javascript
// MCP calls include authentication context
const mcpServer = new MCPServer({
  name: 'secure-mcp-server',
  version: '1.0.0'
});

// Authentication middleware for MCP tools
mcpServer.setAuthenticationHandler(async (request) => {
  const token = request.headers?.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('Authentication required');
  
  const user = await verifyJWT(token);
  return { user };
});

// Tools can access authenticated user
mcpServer.registerTool({
  name: 'get_my_data',
  handler: async (args, context) => {
    const { user } = context;
    return await getUserData(user.id);
  }
});
```

## 💻 Hướng dẫn Phát triển API

### 1. Tạo Service Mới

#### Bước 1: Tạo cấu trúc thư mục
```bash
mkdir -p src/services/your-service/{models,services,controllers}
```

#### Bước 2: Tạo service chính
```javascript
// src/services/your-service/index.js
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

import { config } from '../../shared/config/index.js';
import logger from '../../shared/utils/logger.js';
import serviceDiscovery from '../../shared/utils/serviceDiscovery.js';
import mongodb from '../../shared/database/mongodb.js';
import redis from '../../shared/database/redis.js';
import MCPServer, { createDefaultTools } from '../../shared/mcp/server.js';

class YourService {
  constructor() {
    this.app = express();
    this.apolloServer = null;
    this.mcpServer = null;
    this.port = config.YOUR_SERVICE_PORT || 4006;
    
    logger.addServiceName('your-service');
  }

  async initialize() {
    try {
      await this.connectDatabases();
      await this.setupMCPServer();
      await this.setupApolloServer();
      this.setupMiddleware();
      this.setupRoutes();
      await this.registerService();
      
      logger.info('Your service initialized successfully');
    } catch (error) {
      logger.error('Your service initialization failed:', error);
      throw error;
    }
  }

  // Implement other methods...
}
```

#### Bước 3: Định nghĩa GraphQL Schema
```javascript
const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type YourEntity @key(fields: "id") {
    id: ID!
    name: String!
    description: String
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    yourEntities: [YourEntity!]!
    yourEntity(id: ID!): YourEntity
  }

  type Mutation {
    createYourEntity(input: CreateYourEntityInput!): YourEntity!
    updateYourEntity(id: ID!, input: UpdateYourEntityInput!): YourEntity!
    deleteYourEntity(id: ID!): Boolean!
  }

  input CreateYourEntityInput {
    name: String!
    description: String
  }

  input UpdateYourEntityInput {
    name: String
    description: String
  }
`;
```

#### Bước 4: Implement Resolvers
```javascript
const resolvers = {
  Query: {
    yourEntities: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await YourEntity.find({ userId: user.userId });
    },
    
    yourEntity: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const entity = await YourEntity.findById(id);
      if (!entity || entity.userId !== user.userId) {
        throw new Error('Entity not found or not authorized');
      }
      return entity;
    },
  },

  Mutation: {
    createYourEntity: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const entity = new YourEntity({
        ...input,
        userId: user.userId,
      });
      
      await entity.save();
      return entity;
    },
    
    updateYourEntity: async (_, { id, input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const entity = await YourEntity.findOneAndUpdate(
        { _id: id, userId: user.userId },
        { ...input, updatedAt: new Date() },
        { new: true }
      );
      
      if (!entity) {
        throw new Error('Entity not found or not authorized');
      }
      
      return entity;
    },
    
    deleteYourEntity: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const result = await YourEntity.deleteOne({ 
        _id: id, 
        userId: user.userId 
      });
      
      return result.deletedCount > 0;
    },
  },

  YourEntity: {
    __resolveReference: async (reference) => {
      return await YourEntity.findById(reference.id);
    },
  },
};
```

### 2. Tạo MCP Tools

#### Đăng ký MCP Tools cho Service
```javascript
registerYourServiceTools() {
  // Basic CRUD tool
  this.mcpServer.registerTool({
    name: 'create_your_entity',
    description: 'Create a new entity in your service',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Entity name',
        },
        description: {
          type: 'string', 
          description: 'Entity description',
        },
      },
      required: ['name'],
    },
    handler: async (args, context) => {
      const { user } = context;
      if (!user) throw new Error('Authentication required');
      
      const entity = new YourEntity({
        ...args,
        userId: user.userId,
      });
      
      await entity.save();
      return entity.toObject();
    },
  });

  // Custom business logic tool
  this.mcpServer.registerTool({
    name: 'process_your_data',
    description: 'Process data using your service logic',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: 'Data to process',
        },
        options: {
          type: 'object',
          description: 'Processing options',
        },
      },
      required: ['data'],
    },
    handler: async (args, context) => {
      return await this.processData(args.data, args.options);
    },
  });
}
```

### 3. Database Models

#### Tạo Mongoose Model
```javascript
// src/services/your-service/models/YourEntity.js
import mongoose from 'mongoose';

const yourEntitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes
yourEntitySchema.index({ userId: 1, createdAt: -1 });
yourEntitySchema.index({ name: 1 });
yourEntitySchema.index({ status: 1 });

// Instance methods
yourEntitySchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  // Remove sensitive fields if any
  return obj;
};

// Static methods
yourEntitySchema.statics.findByUser = function(userId) {
  return this.find({ userId });
};

yourEntitySchema.statics.findActiveEntities = function() {
  return this.find({ status: 'active' });
};

const YourEntity = mongoose.model('YourEntity', yourEntitySchema);
export default YourEntity;
```

### 4. Service Registration

#### Cập nhật Gateway để nhận diện service mới
```javascript
// src/gateway/index.js - trong discoverSubgraphs method
const expectedServices = [
  { name: 'auth-service', path: '/graphql' },
  { name: 'ai-service', path: '/graphql' },
  { name: 'media-service', path: '/graphql' },
  { name: 'data-service', path: '/graphql' },
  { name: 'orchestrator-service', path: '/graphql' },
  { name: 'your-service', path: '/graphql' }, // Add your service
];
```

#### Cập nhật Docker Compose
```yaml
# docker-compose.yml
your-service:
  build:
    context: .
    dockerfile: src/services/your-service/Dockerfile
  container_name: your-service
  restart: unless-stopped
  ports:
    - "4006:4006"
  environment:
    - NODE_ENV=development
    - PORT=4006
    - MONGODB_URI=mongodb://admin:password@mongodb:27017/your_service_db?authSource=admin
    - REDIS_URL=redis://redis:6379
    - CONSUL_HOST=consul
    - CONSUL_PORT=8500
  depends_on:
    - mongodb
    - redis
    - consul
  networks:
    - microservice-network
```

### 5. Testing APIs

#### GraphQL Queries
```graphql
# Create entity
mutation CreateEntity {
  createYourEntity(input: {
    name: "Test Entity"
    description: "This is a test entity"
  }) {
    id
    name
    description
    createdAt
  }
}

# Query entities
query GetEntities {
  yourEntities {
    id
    name
    description
    createdAt
  }
}

# Update entity
mutation UpdateEntity {
  updateYourEntity(
    id: "entity-id"
    input: {
      name: "Updated Entity"
      description: "Updated description"
    }
  ) {
    id
    name
    description
    updatedAt
  }
}
```

#### MCP Tool Calls
```javascript
// Test MCP tools
const result = await mcpClient.callTool('create_your_entity', {
  name: 'MCP Created Entity',
  description: 'Created via MCP tool'
});

const processResult = await mcpClient.callTool('process_your_data', {
  data: { key: 'value' },
  options: { format: 'json' }
});
```

### 6. Error Handling Best Practices

```javascript
// Custom error classes
class YourServiceError extends Error {
  constructor(message, code = 'YOUR_SERVICE_ERROR') {
    super(message);
    this.name = 'YourServiceError';
    this.code = code;
  }
}

class ValidationError extends YourServiceError {
  constructor(message, field) {
    super(message, 'VALIDATION_ERROR');
    this.field = field;
  }
}

// Error handling in resolvers
const resolvers = {
  Mutation: {
    createYourEntity: async (_, { input }, { user }) => {
      try {
        if (!user) {
          throw new YourServiceError('Authentication required', 'AUTH_REQUIRED');
        }
        
        // Validation
        if (!input.name || input.name.trim().length === 0) {
          throw new ValidationError('Name is required', 'name');
        }
        
        const entity = new YourEntity({
          ...input,
          userId: user.userId,
        });
        
        await entity.save();
        
        logger.info('Entity created successfully', { 
          entityId: entity._id, 
          userId: user.userId 
        });
        
        return entity;
        
      } catch (error) {
        logger.error('Failed to create entity:', error);
        
        if (error instanceof YourServiceError) {
          throw error;
        }
        
        throw new YourServiceError('Failed to create entity');
      }
    },
  },
};
```

### 7. Performance Optimization

#### Caching với Redis
```javascript
// Cache frequently accessed data
async function getCachedEntity(id) {
  const cacheKey = `entity:${id}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    logger.logCacheOperation('GET', cacheKey, true);
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const entity = await YourEntity.findById(id);
  if (entity) {
    // Cache for 1 hour
    await redis.set(cacheKey, JSON.stringify(entity), 3600);
    logger.logCacheOperation('SET', cacheKey, false);
  }
  
  return entity;
}

// Invalidate cache on updates
async function updateEntity(id, updates) {
  const entity = await YourEntity.findByIdAndUpdate(id, updates, { new: true });
  
  // Invalidate cache
  const cacheKey = `entity:${id}`;
  await redis.del(cacheKey);
  logger.logCacheOperation('DEL', cacheKey);
  
  return entity;
}
```

#### Database Optimization
```javascript
// Use proper indexes
yourEntitySchema.index({ userId: 1, status: 1, createdAt: -1 });

// Optimize queries with projection
const entities = await YourEntity.find({ userId })
  .select('name description status createdAt')
  .limit(20)
  .sort({ createdAt: -1 });

// Use aggregation for complex queries
const stats = await YourEntity.aggregate([
  { $match: { userId: new ObjectId(userId) } },
  { $group: {
    _id: '$status',
    count: { $sum: 1 },
    avgCreatedTime: { $avg: '$createdAt' }
  }}
]);
```

Với hướng dẫn này, bạn có thể dễ dàng tạo thêm các services mới và integrate chúng vào kiến trúc microservice MCP GraphQL của dự án.

## 📊 Monitoring & Logging

### Logging
- Winston for structured logging
- Log levels: error, warn, info, http, debug
- File rotation and console output
- Service-specific log contexts

### Health Monitoring
- Health check endpoints for all services
- Consul health checks
- Database connection monitoring
- Service dependency tracking

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Request rate limiting
- CORS protection
- Helmet security headers
- MongoDB query sanitization
- Session management with Redis
- Account lockout protection

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Run type checking
npm run type-check
```

## 📈 Scaling

### Horizontal Scaling
- Each service can be scaled independently
- Load balancing through service discovery
- Stateless service design
- Redis for shared session state

### Performance Optimization
- Redis caching for frequently accessed data
- Database indexing for optimal queries
- Connection pooling for databases
- Lazy loading for AI models

## 🚀 Deployment

### Docker Deployment
```bash
# Build and deploy with Docker Compose
npm run docker:build
npm run docker:up
```

### Production Deployment
```bash
# Build for production
npm run build

# Start with PM2
pm2 start ecosystem.config.js
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the health check endpoints

## 🔮 Roadmap

- [ ] Add more AI service integrations
- [ ] Implement GraphQL subscriptions
- [ ] Add comprehensive test suite
- [ ] Create admin dashboard
- [ ] Add metrics and monitoring
- [ ] Implement API versioning
- [ ] Add more MCP tools and resources
- [ ] Create client SDKs
