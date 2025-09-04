# 📁 Project Structure

## 🏗️ Tổng quan cấu trúc

```
microservice-MCP-graphql-base/
├── 📁 shared/                       # Shared utilities & components 🆕
│   ├── 📁 config/                   # Database, Redis configurations
│   │   ├── database.js              # MongoDB connection config
│   │   └── redis.js                 # Redis connection config
│   ├── 📁 middleware/               # Common middleware
│   │   └── errorHandler.js          # Error handling middleware
│   ├── 📁 utils/                    # Utility functions
│   │   └── logger.js                # Logger factory
│   ├── 📁 constants/                # Common constants
│   │   └── index.js                 # All constants & enums
│   ├── 📁 models/                   # Shared data models
│   ├── 📁 types/                    # TypeScript definitions
│   ├── package.json                 # Shared dependencies
│   └── index.js                     # Main export file
│
├── 📁 services/                     # Microservices
│   ├── 📁 gateway/                  # API Gateway (Port 4000)
│   │   ├── 📁 src/
│   │   │   ├── 📁 graphql/         # GraphQL schema & resolvers
│   │   │   ├── 📁 middleware/      # Auth, error handling
│   │   │   ├── 📁 routes/          # Health, proxy routes
│   │   │   └── index.js            # Main entry point
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── 📁 auth/                     # Authentication Service (Port 4001)
│   │   ├── 📁 src/
│   │   │   ├── 📁 config/          # Database, Redis config
│   │   │   ├── 📁 controllers/     # Business logic
│   │   │   ├── 📁 middleware/      # Auth, validation
│   │   │   ├── 📁 models/          # Mongoose models
│   │   │   ├── 📁 routes/          # API routes
│   │   │   ├── 📁 services/        # External services
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── 📁 ai/                       # AI Service với MCP (Port 4002)
│   │   ├── 📁 src/
│   │   │   ├── 📁 config/          # Database, Redis, Qdrant
│   │   │   ├── 📁 mcp/             # MCP Protocol implementation
│   │   │   ├── 📁 routes/          # AI & MCP routes
│   │   │   └── index.js
│   │   └── package.json
│   │
│   ├── 📁 media/                    # Media Processing Service (Port 4003)
│   │   ├── 📁 src/
│   │   │   ├── 📁 config/          # Database, Redis config
│   │   │   ├── 📁 controllers/     # Media processing logic
│   │   │   ├── 📁 middleware/      # Error handling
│   │   │   ├── 📁 routes/          # Media routes
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── 📁 user/                     # User Management Service (Port 4004)
│   │   ├── 📁 src/
│   │   │   ├── 📁 config/          # Database, Redis config
│   │   │   ├── 📁 controllers/     # User CRUD logic
│   │   │   ├── 📁 middleware/      # Error handling
│   │   │   ├── 📁 models/          # User models
│   │   │   ├── 📁 routes/          # User routes
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── 📁 notification/             # Notification Service (Port 4005)
│   │   ├── 📁 src/
│   │   │   ├── 📁 config/          # Database, Redis config
│   │   │   ├── 📁 controllers/     # Notification logic
│   │   │   ├── 📁 middleware/      # Error handling
│   │   │   ├── 📁 routes/          # Notification routes
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── 📁 orchestrator/             # Service Orchestrator (Port 4006)
│       ├── 📁 src/
│       │   ├── 📁 config/          # Configuration management
│       │   ├── 📁 loadbalancer/    # Load balancing logic
│       │   ├── 📁 monitoring/      # Health monitoring
│       │   ├── 📁 registry/        # Service registry
│       │   ├── 📁 routes/          # Orchestrator routes
│       │   └── index.js
│       ├── package.json
│       └── Dockerfile
│
├── 📁 traefik/                      # Traefik configuration
│   └── traefik.yml                  # Traefik config file
│
├── 📁 src/                          # Legacy source (if any)
├── 📄 docker-compose.yml            # Docker services & databases
├── 📄 package.json                  # Root package.json with workspaces
├── 📄 env.example                   # Environment variables template
├── 📄 README.md                     # Project documentation
└── 📄 PROJECT_STRUCTURE.md          # This file
```

## 🔧 Shared Utilities Layer 🆕

### **Cấu trúc thư mục shared:**

```
shared/
├── 📁 config/                       # Database & Redis configurations
│   ├── database.js                  # MongoDB connection với pooling
│   └── redis.js                     # Redis connection với reconnection
├── 📁 middleware/                   # Common middleware
│   └── errorHandler.js              # Error handling, async wrapper
├── 📁 utils/                        # Utility functions
│   └── logger.js                    # Logger factory, request logging
├── 📁 constants/                    # Common constants & enums
│   └── index.js                     # HTTP status, ports, configs
├── 📁 models/                       # Shared data models (future)
├── 📁 types/                        # TypeScript definitions (future)
├── package.json                     # Shared dependencies
└── index.js                         # Main export file
```

### **Shared Components:**

#### 1. **Database Config** (`shared/config/`)
- **MongoDB**: Connection pooling, retry logic, health monitoring
- **Redis**: Reconnection strategy, error handling, connection events
- **Features**: Service-specific naming, detailed logging

#### 2. **Middleware** (`shared/middleware/`)
- **Error Handler**: Comprehensive error handling với context logging
- **Async Wrapper**: Wrapper cho async route handlers
- **Not Found**: Standardized 404 responses

#### 3. **Utilities** (`shared/utils/`)
- **Logger Factory**: Winston-based logging với file rotation
- **Request Logger**: Request/response logging middleware
- **Performance**: Performance monitoring utilities

#### 4. **Constants** (`shared/constants/`)
- **HTTP Status**: Standard HTTP status codes
- **Service Info**: Ports, database names, service names
- **Configuration**: JWT, rate limiting, file upload configs
- **MCP Protocol**: MCP constants và supported tools

#### 5. **Helpers** (`shared/index.js`)
- **Response Helpers**: Standardized API responses
- **Validation Helpers**: Common validation functions
- **Utility Functions**: String generation, formatting, retry logic

### **Cách sử dụng Shared Components:**

```javascript
// Import shared components
const { 
  connectDB, 
  errorHandler, 
  createLogger, 
  HTTP_STATUS,
  responseHelpers,
  validationHelpers 
} = require('../../shared');

// Database connection
await connectDB(MONGODB_URI, 'Service Name');

// Error handling
app.use(errorHandler);

// Logging
const logger = createLogger('Service Name');

// Constants
res.status(HTTP_STATUS.CREATED);

// Response helpers
responseHelpers.success(res, data, 'Success message');
responseHelpers.error(res, error, 'Error message');

// Validation helpers
if (!validationHelpers.isValidObjectId(id)) {
  return responseHelpers.error(res, 'Invalid ID format', HTTP_STATUS.BAD_REQUEST);
}
```

## 🗄️ Database Architecture

### MongoDB Instances (Mỗi service có database riêng)
```
┌─────────────────┬─────────────┬─────────────┬─────────────────┐
│ Service         │ Database    │ Port        │ Collections     │
├─────────────────┼─────────────┼─────────────┼─────────────────┤
│ Gateway         │ gateway_db  │ 27017       │ API logs, config│
│ Auth            │ auth_db     │ 27018       │ Users, sessions │
│ AI              │ ai_db       │ 27019       │ AI requests     │
│ Media           │ media_db    │ 27020       │ Media files     │
│ User            │ user_db     │ 27021       │ User profiles   │
│ Notification    │ notification_db│ 27022    │ Notifications   │
└─────────────────┴─────────────┴─────────────┴─────────────────┘
```

### Redis Instances (Mỗi service có Redis riêng)
```
┌─────────────────┬─────────────┬─────────────┬─────────────────┐
│ Service         │ Redis Port  │ Purpose     │ Data            │
├─────────────────┼─────────────┼─────────────┼─────────────────┤
│ Gateway         │ 6379        │ Cache       │ API responses   │
│ Auth            │ 6380        │ Sessions    │ User sessions   │
│ AI              │ 6381        │ AI cache    │ AI responses    │
│ Media           │ 6382        │ Media cache │ File metadata   │
│ User            │ 6383        │ User cache  │ User data       │
│ Notification    │ 6384        │ Notif cache │ Notification    │
└─────────────────┴─────────────┴─────────────┴─────────────────┘
```

## 🌐 Network Architecture

### Port Mapping
```
┌─────────────────┬─────────────┬─────────────┬─────────────────┐
│ Service         │ Container   │ Host        │ Purpose         │
├─────────────────┼─────────────┼─────────────┼─────────────────┤
│ Gateway         │ 4000        │ 4000        │ API Gateway     │
│ Auth            │ 4001        │ 4001        │ Authentication  │
│ AI              │ 4002        │ 4002        │ AI Processing   │
│ Media           │ 4003        │ 4003        │ Media Processing│
│ User            │ 4004        │ 4004        │ User Management │
│ Notification    │ 4005        │ 4005        │ Notifications   │
│ Orchestrator    │ 4006        │ 4006        │ Service Mgmt    │
│ Traefik         │ 80, 8080    │ 80, 8080    │ Reverse Proxy   │
└─────────────────┴─────────────┴─────────────┴─────────────────┘
```

### Domain Routing (via Traefik)
```
┌─────────────────┬─────────────────┬─────────────────────────┐
│ Domain          │ Service         │ URL                      │
├─────────────────┼─────────────────┼─────────────────────────┤
│ gateway.localhost│ Gateway        │ http://gateway.localhost │
│ auth.localhost   │ Auth           │ http://auth.localhost    │
│ ai.localhost     │ AI             │ http://ai.localhost      │
│ media.localhost  │ Media          │ http://media.localhost   │
│ user.localhost   │ User           │ http://user.localhost    │
│ notification.localhost│ Notification│ http://notification.localhost│
│ orchestrator.localhost│ Orchestrator│ http://orchestrator.localhost│
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 🔧 Development Workflow

### 1. **Setup Development Environment**
```bash
# Clone repository
git clone <repo-url>
cd microservice-MCP-graphql-base

# Install all dependencies
npm run install:all

# Setup environment
cp env.example .env
# Edit .env file with your configuration
```

### 2. **Run with Docker (Recommended)**
```bash
# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### 3. **Run Locally (Development)**
```bash
# Start all services locally
npm run dev

# Or start individual services
npm run dev:gateway
npm run dev:auth
npm run dev:ai
# ... etc
```

### 4. **Access Services**
```bash
# Direct access
Gateway: http://localhost:4000
Auth: http://localhost:4001
AI: http://localhost:4002
# ... etc

# Domain routing (after adding to /etc/hosts)
Gateway: http://gateway.localhost
Auth: http://auth.localhost
AI: http://ai.localhost
# ... etc

# Traefik Dashboard
http://localhost:8080
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints
Mỗi service có health check endpoint:
- `GET /health` - Service health status
- Response: Service status, uptime, environment info

### Orchestrator Monitoring
- Service registry và discovery
- Health monitoring tự động
- Metrics collection
- Load balancing
- Circuit breaker pattern

## 🔐 Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting
- CORS configuration
- Helmet security headers

### Network Security
- Docker network isolation
- Service-to-service communication
- Reverse proxy với Traefik
- SSL/TLS support (có thể cấu hình)

## 🚀 Production Considerations

### Scalability
- Mỗi service có thể scale độc lập
- Load balancing tự động
- Database sharding support
- Redis clustering

### Monitoring
- Health checks tự động
- Metrics collection
- Log aggregation
- Performance monitoring

### Deployment
- Docker containerization
- Multi-stage builds
- Environment-specific configs
- CI/CD pipeline support
