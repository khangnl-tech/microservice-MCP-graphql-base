# Microservice MCP GraphQL Base

A comprehensive microservice architecture built with Node.js, GraphQL Federation, and Model Context Protocol (MCP) integration. This project provides a scalable foundation for building distributed applications with AI capabilities.

## 🏗️ Architecture Overview

### Services Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Gateway       │    │   Auth Service  │    │   AI Service    │
│   Port: 4000    │────│   Port: 4001    │    │   Port: 4002    │
│   GraphQL Fed   │    │   Database:     │    │   Database:     │
│   MCP Server    │    │   auth_db       │    │   ai_db         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │  Media Service  │    │  Data Service   │
         └──────────────│   Port: 4003    │    │   Port: 4004    │
                        │   Database:     │    │   Database:     │
                        │   media_db      │    │   data_db       │
                        └─────────────────┘    └─────────────────┘
```

### Infrastructure
- **MongoDB**: Separate databases for each service
- **Redis**: Shared caching and session storage
- **Consul**: Service discovery and health checking
- **Qdrant**: Vector database for AI operations
- **Docker**: Containerization for all services

## 🚀 Features

### Core Features
- ✅ **Microservice Architecture**: Independent, scalable services
- ✅ **GraphQL Federation**: Unified API gateway with federated schemas
- ✅ **MCP Integration**: Model Context Protocol for AI tool integration
- ✅ **Service Discovery**: Automatic service registration and discovery
- ✅ **Database Isolation**: Separate databases per service
- ✅ **Docker Support**: Full containerization with Docker Compose
- ✅ **Health Monitoring**: Comprehensive health checks
- ✅ **GraphQL Playground**: Interactive API explorer

### Service Capabilities

#### 🔐 Auth Service (Port 4001)
- User authentication and authorization
- JWT token management
- Role-based access control
- Password hashing with bcrypt
- Database: `auth_db`

#### 🤖 AI Service (Port 4002)
- AI/ML model integration (OpenAI, Google AI, Hugging Face)
- Text processing and generation
- Vector embeddings with Qdrant
- Speech-to-text and text-to-speech
- Database: `ai_db`

#### 📁 Media Service (Port 4003)
- File upload and storage
- Image processing with Sharp
- Video processing with FFmpeg
- Thumbnail generation
- Media metadata extraction
- Database: `media_db`

#### 📊 Data Service (Port 4004)
- Dataset management
- Excel import/export
- Data analytics and statistics
- Flexible schema definitions
- Bulk operations
- Database: `data_db`

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB
- Redis

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd microservice-MCP-graphql-base
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
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
# Start all services in development mode
npm run dev

# Or start individual services
npm run dev:gateway
npm run dev:auth
npm run dev:ai
npm run dev:media
npm run dev:data
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
MONGODB_URI=mongodb://admin:password@localhost:27017
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# AI Services
OPENAI_API_KEY=your-openai-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Service Discovery
CONSUL_HOST=localhost
CONSUL_PORT=8500

# Vector Database
QDRANT_URL=http://localhost:6333

# CORS
CORS_ORIGIN=*
```

## 📖 API Documentation

### GraphQL Playground
Access the interactive GraphQL Playground at:
- **URL**: http://localhost:4000/playground
- **GraphQL Endpoint**: http://localhost:4000/graphql

### Service Endpoints

| Service | Port | GraphQL | Health Check |
|---------|------|---------|--------------|
| Gateway | 4000 | `/graphql` | `/health` |
| Auth    | 4001 | `/graphql` | `/health` |
| AI      | 4002 | `/graphql` | `/health` |
| Media   | 4003 | `/graphql` | `/health` |
| Data    | 4004 | `/graphql` | `/health` |

### Example Queries

#### Authentication
```graphql
mutation Login {
  login(input: {
    email: "user@example.com"
    password: "password123"
  }) {
    token
    user {
      id
      email
      role
    }
  }
}
```

#### Media Upload
```graphql
mutation UploadMedia {
  uploadMedia(input: {
    file: $file
    category: "images"
    tags: ["profile", "avatar"]
  }) {
    id
    filename
    url
    mimeType
    size
  }
}
```

#### Data Management
```graphql
mutation CreateDataset {
  createDataset(input: {
    name: "User Analytics"
    type: TABLE
    schema: {
      fields: [
        { name: "userId", type: STRING, required: true }
        { name: "action", type: STRING, required: true }
        { name: "timestamp", type: DATE, required: true }
      ]
    }
  }) {
    id
    name
    recordCount
  }
}
```

## 🔧 Development

### Project Structure
```
src/
├── gateway/                 # API Gateway
│   ├── index.js            # Gateway server
│   ├── Dockerfile          # Gateway container
│   └── graphql-playground.html
├── services/               # Microservices
│   ├── auth/              # Authentication service
│   ├── ai/                # AI/ML service
│   ├── media/             # Media processing service
│   └── data/              # Data management service
└── shared/                # Shared utilities
    ├── config/            # Configuration
    ├── database/          # Database connections
    ├── mcp/              # MCP server implementation
    └── utils/            # Utilities and helpers
```

### Adding New Services

1. **Create service directory**
```bash
mkdir src/services/your-service
```

2. **Implement service with GraphQL schema**
```javascript
// src/services/your-service/index.js
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])
  
  type YourType @key(fields: "id") {
    id: ID!
    name: String!
  }
`;
```

3. **Add to Docker Compose**
```yaml
your-service:
  build:
    context: .
    dockerfile: src/services/your-service/Dockerfile
  ports:
    - "4005:4005"
  environment:
    - PORT=4005
    - MONGODB_URI=mongodb://admin:password@mongodb:27017/your_db?authSource=admin
```

4. **Update Gateway configuration**
```javascript
const expectedServices = [
  // ... existing services
  { name: 'your-service', path: '/graphql' },
];
```

### MCP Integration

Each service includes MCP (Model Context Protocol) integration for AI tool capabilities:

```javascript
// Register custom MCP tools
this.mcpServer.registerTool({
  name: 'your_custom_tool',
  description: 'Description of your tool',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string' }
    }
  },
  handler: async (args) => {
    // Tool implementation
    return result;
  }
});
```

## 🐳 Docker Deployment

### Build and Run
```bash
# Build all services
npm run docker:build

# Start all services
npm run docker:up

# Stop all services
npm run docker:down
```

### Individual Service Deployment
```bash
# Build specific service
docker build -f src/services/auth/Dockerfile -t auth-service .

# Run specific service
docker run -p 4001:4001 auth-service
```

## 🔍 Monitoring & Health Checks

### Health Endpoints
Each service provides health check endpoints:
- Gateway: http://localhost:4000/health
- Auth: http://localhost:4001/health
- AI: http://localhost:4002/health
- Media: http://localhost:4003/health
- Data: http://localhost:4004/health

### Service Discovery
View registered services:
- Consul UI: http://localhost:8500
- Gateway endpoint: http://localhost:4000/services

### Logs
Services use structured logging with Winston:
```bash
# View logs in development
npm run dev

# View Docker logs
docker-compose logs -f [service-name]
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run linting
npm run lint

# Run specific service tests
npm test -- --testPathPattern=auth
```

## 🚀 Production Deployment

### Environment Setup
1. Set production environment variables
2. Configure proper MongoDB and Redis instances
3. Set up SSL/TLS certificates
4. Configure load balancers

### Scaling
Each service can be scaled independently:
```bash
docker-compose up --scale auth-service=3 --scale ai-service=2
```

### Domain Configuration
Configure domains for each service:
- Gateway: api.yourdomain.com
- Auth: auth.yourdomain.com
- AI: ai.yourdomain.com
- Media: media.yourdomain.com
- Data: data.yourdomain.com

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the GraphQL Playground for API examples

---

**Built with ❤️ using Node.js, GraphQL, and MCP**
