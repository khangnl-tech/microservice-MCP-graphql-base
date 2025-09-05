# 🏗️ Kiến trúc hệ thống

## 📊 Sơ đồ tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATIONS                      │
│                    (Web, Mobile, Desktop)                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ GraphQL Queries/Mutations
                      │ HTTP Requests
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    GATEWAY SERVICE                              │
│                    Port: 5000                                   │
│              ┌─────────────────────────┐                       │
│              │   Apollo GraphQL        │                       │
│              │   Server + Express      │                       │
│              └─────────────────────────┘                       │
│                         │                                       │
│    ┌────────────────────┼────────────────────┐                 │
│    │                    │                    │                 │
│    ▼                    ▼                    ▼                 │
│ ┌─────────┐        ┌─────────┐        ┌─────────┐             │
│ │   AI    │        │  AUTH   │        │  DATA   │             │
│ │Service  │        │Service  │        │Service  │             │
│ │ :5001   │        │ :5003   │        │ :5004   │             │
│ └─────────┘        └─────────┘        └─────────┘             │
│    │                    │                    │                 │
│    ▼                    ▼                    ▼                 │
│ ┌─────────┐        ┌─────────┐        ┌─────────┐             │
│ │ MEDIA   │        │   JWT   │        │MongoDB  │             │
│ │Service  │        │ Tokens  │        │+SocketIO│             │
│ │ :5002   │        │         │        │         │             │
│ └─────────┘        └─────────┘        └─────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Luồng hoạt động chính

### 1. Authentication Flow
```
Client → Gateway → Auth Service
┌─────┐    POST     ┌────────┐    POST     ┌─────────┐
│User │ ──────────► │Gateway │ ──────────► │  Auth   │
└─────┘  /login     │:5000   │  /login     │Service  │
                    └────────┘             │:5003    │
                          │                └─────────┘
                          │                       │
                          │ JWT Token             │
                          │ ◄─────────────────────┘
                          │
                    ┌─────▼─────┐
                    │   Client  │
                    │ stores    │
                    │ JWT token │
                    └───────────┘
```

### 2. GraphQL Query Flow
```
Client → Gateway → Target Service
┌─────┐   GraphQL   ┌────────┐   HTTP     ┌─────────┐
│User │ ──────────► │Gateway │ ─────────► │Service  │
└─────┘  Query      │:5000   │  Request   │(AI/Auth │
                    └────────┘            │/Data/   │
                          │               │Media)   │
                          │ Response      └─────────┘
                          │ ◄─────────────────────┘
                    ┌─────▼─────┐
                    │   Client  │
                    │ receives  │
                    │   data    │
                    └───────────┘
```

### 3. MCP-lite Communication
```
Gateway → AI Service (MCP Protocol)
┌────────┐   MCP Call   ┌─────────┐
│Gateway │ ───────────► │AI Service│
│:5000   │ /mcp/call    │:5001    │
└────────┘              └─────────┘
     │                         │
     │ Tool Result             │
     │ ◄───────────────────────┘
     │
┌────▼────┐
│Fallback │
│GraphQL  │
│if MCP   │
│fails    │
└─────────┘
```

### 4. Real-time Updates
```
Data Service → Socket.IO → Clients
┌─────────┐    Event     ┌─────────┐
│Data     │ ──────────►  │Socket.IO│
│Service  │ item_created │ Server  │
│:5004    │              └─────────┘
└─────────┘                    │
                               │ Real-time
                               │ Broadcast
                               ▼
                        ┌─────────────┐
                        │   Clients   │
                        │ (Web/Mobile)│
                        └─────────────┘
```

## 🛠️ Công nghệ sử dụng

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Gateway** | Apollo Server + Express | GraphQL API Gateway |
| **AI Service** | GraphQL + MCP-lite | AI/ML Operations |
| **Auth Service** | JWT + bcrypt | Authentication |
| **Data Service** | MongoDB + Socket.IO | Data Management + Real-time |
| **Media Service** | Express REST API | Media Processing |
| **Communication** | HTTP + MCP-lite | Inter-service communication |
| **Database** | MongoDB (optional) | Data persistence |
| **Cache** | Redis (optional) | Caching layer |

## 🔧 Cấu hình Ports

| Service | Port | Protocol | Endpoints |
|---------|------|----------|-----------|
| Gateway | 5000 | GraphQL | `/graphql`, `/health` |
| AI Service | 5001 | GraphQL + MCP | `/graphql`, `/mcp/tools`, `/mcp/call` |
| Media Service | 5002 | REST | `/health`, `/image/resize` |
| Auth Service | 5003 | REST | `/login`, `/me`, `/health` |
| Data Service | 5004 | REST + Socket.IO | `/items`, `/health` |
| MongoDB | 27017 | Database | - |
| Redis | 6379 | Cache | - |

## 📋 Best Practices & Development Rules

### 🏗️ Microservices Best Practices

#### 1. Service Design Principles
- **Single Responsibility**: Mỗi service chỉ xử lý một domain cụ thể
- **Loose Coupling**: Services không phụ thuộc trực tiếp vào nhau
- **High Cohesion**: Các chức năng liên quan được nhóm trong cùng service
- **Stateless**: Services không lưu trữ state, sử dụng external storage

#### 2. Communication Patterns
```typescript
// ✅ GOOD: Async communication với fallback
const result = await callMcpTool(AI_URL, 'aiHelloTool', { name })
  .catch(() => gqlRequest(AI_URL + '/graphql', query, variables));

// ❌ BAD: Direct service dependency
const result = await aiService.directCall();
```

#### 3. Error Handling
- **Circuit Breaker**: Implement fallback mechanisms
- **Retry Logic**: Exponential backoff cho failed requests
- **Graceful Degradation**: System vẫn hoạt động khi một service fail
- **Health Checks**: Monitor service status với `/health` endpoints

#### 4. Data Management
- **Database per Service**: Mỗi service có database riêng
- **Event Sourcing**: Sử dụng events để sync data giữa services
- **CQRS**: Tách biệt read/write operations khi cần

### 🔧 MCP-lite Protocol Best Practices

#### 1. Tool Naming Convention (Domain-based)
```typescript
// ✅ GOOD: Clear domain-based naming
{
  name: "user.create",
  description: "Create a new user account",
  input: { email: "string", password: "string", name: "string" },
  output: { result: { id: "string", email: "string", name: "string" } }
}

{
  name: "user.update", 
  description: "Update user profile information",
  input: { id: "string", name: "string", email: "string" },
  output: { result: { id: "string", email: "string", name: "string" } }
}

{
  name: "auth.login",
  description: "Authenticate user and return JWT token",
  input: { email: "string", password: "string" },
  output: { result: { token: "string", user: { id: "string", email: "string" } } }
}

// ❌ BAD: Vague, non-domain naming
{
  name: "create",
  description: "Create something",
  input: { data: "any" },
  output: { result: "any" }
}

{
  name: "aiTool",
  description: "AI stuff"
}
```

#### 2. JSON Schema Requirements
```typescript
// ✅ GOOD: Complete JSON Schema với type/required/properties
const userCreateSchema = {
  type: "object",
  required: ["email", "password", "name"],
  properties: {
    email: {
      type: "string",
      format: "email",
      description: "User email address"
    },
    password: {
      type: "string",
      minLength: 8,
      description: "User password (will be hashed)"
    },
    name: {
      type: "string",
      minLength: 1,
      maxLength: 100,
      description: "User display name"
    }
  },
  additionalProperties: false
};

// ✅ GOOD: Tool registration với full schema
app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: "user.create",
        description: "Create a new user account",
        inputSchema: userCreateSchema,
        outputSchema: {
          type: "object",
          properties: {
            result: {
              type: "object",
              properties: {
                id: { type: "string" },
                email: { type: "string" },
                name: { type: "string" },
                createdAt: { type: "string", format: "date-time" }
              }
            }
          }
        }
      }
    ]
  });
});

// ❌ BAD: Incomplete schema
{
  name: "user.create",
  input: { email: "string", password: "string" }, // Missing validation
  output: { result: "object" } // Too vague
}
```

#### 3. Security Practices

##### Password Handling
```typescript
// ✅ GOOD: Never return password, hash on server
app.post('/mcp/call', async (req, res) => {
  const { tool, input } = req.body;
  
  if (tool === 'user.create') {
    const { email, password, name } = input;
    
    // Hash password on server
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user with hashed password
    const user = await User.create({
      email,
      passwordHash, // Store hashed version
      name
    });
    
    // Return only public fields
    res.json({
      result: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
        // ❌ NEVER return: password, passwordHash
      }
    });
  }
});

// ❌ BAD: Return password or hash
res.json({
  result: {
    id: user.id,
    email: user.email,
    password: user.password, // ❌ NEVER do this
    passwordHash: user.passwordHash // ❌ NEVER do this
  }
});
```

##### Authentication & Authorization
```typescript
// ✅ GOOD: JWT validation for protected tools
const protectedTools = ['user.update', 'user.delete', 'admin.create'];

app.post('/mcp/call', async (req, res) => {
  const { tool, input } = req.body;
  const authHeader = req.headers.authorization;
  
  // Check if tool requires authentication
  if (protectedTools.includes(tool)) {
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = jwt.verify(token, JWT_SECRET) as any;
      
      // Add user context to input
      input.userId = payload.sub;
      input.userRole = payload.role;
      
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  
  // Role-based authorization
  if (tool === 'admin.create' && input.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }
  
  // Process tool...
});
```

#### 4. Error Handling Standards
```typescript
// ✅ GOOD: Standardized error responses
app.post('/mcp/call', async (req, res) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || generateRequestId();
  
  try {
    const { tool, input } = req.body;
    
    // Validation errors (4xx)
    if (!tool) {
      return res.status(400).json({ 
        error: 'Tool name is required',
        requestId 
      });
    }
    
    if (!input) {
      return res.status(400).json({ 
        error: 'Input data is required',
        requestId 
      });
    }
    
    // Process tool
    const result = await processTool(tool, input);
    
    // Success response
    res.json({ 
      result,
      requestId,
      processingTime: Date.now() - startTime
    });
    
  } catch (error) {
    // Server errors (5xx)
    console.error('MCP tool error', {
      tool: req.body.tool,
      error: error.message,
      requestId,
      processingTime: Date.now() - startTime
    });
    
    res.status(500).json({ 
      error: 'Internal server error',
      requestId 
    });
  }
});

// ❌ BAD: Inconsistent error format
res.status(400).send('Bad request'); // Missing JSON structure
res.json({ message: 'Error' }); // Wrong field name
```

#### 5. Idempotency
```typescript
// ✅ GOOD: Idempotent operations
app.post('/mcp/call', async (req, res) => {
  const { tool, input } = req.body;
  
  if (tool === 'user.create') {
    const { email, password, name } = input;
    
    // Check if user already exists (idempotent)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Return existing user instead of error
      return res.json({
        result: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          createdAt: existingUser.createdAt
        },
        message: 'User already exists'
      });
    }
    
    // Create new user
    const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 12), name });
    res.json({ result: { id: user.id, email: user.email, name: user.name } });
  }
  
  if (tool === 'user.update') {
    const { id, email, name } = input;
    
    // Protect against email conflicts
    if (email) {
      const emailExists = await User.findOne({ email, _id: { $ne: id } });
      if (emailExists) {
        return res.status(409).json({ 
          error: 'Email already exists',
          requestId: req.headers['x-request-id']
        });
      }
    }
    
    const user = await User.findByIdAndUpdate(id, { email, name }, { new: true });
    res.json({ result: { id: user.id, email: user.email, name: user.name } });
  }
});
```

#### 6. Observability & Logging
```typescript
// ✅ GOOD: Comprehensive logging với requestId
app.post('/mcp/call', async (req, res) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || generateRequestId();
  const { tool, input } = req.body;
  
  // Log tool call start
  console.log('MCP tool call started', {
    tool,
    requestId,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });
  
  try {
    // Process tool
    const result = await processTool(tool, input);
    const processingTime = Date.now() - startTime;
    
    // Log successful completion
    console.log('MCP tool call completed', {
      tool,
      requestId,
      processingTime,
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    res.json({ 
      result,
      requestId,
      processingTime
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Log error with context
    console.error('MCP tool call failed', {
      tool,
      requestId,
      processingTime,
      error: error.message,
      stack: error.stack,
      input: JSON.stringify(input),
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      error: 'Internal server error',
      requestId,
      processingTime
    });
  }
});

// ✅ GOOD: Tool-specific metrics
const toolMetrics = new Map();

const recordToolMetrics = (tool: string, processingTime: number, success: boolean) => {
  if (!toolMetrics.has(tool)) {
    toolMetrics.set(tool, {
      totalCalls: 0,
      totalTime: 0,
      successCount: 0,
      errorCount: 0
    });
  }
  
  const metrics = toolMetrics.get(tool);
  metrics.totalCalls++;
  metrics.totalTime += processingTime;
  
  if (success) {
    metrics.successCount++;
  } else {
    metrics.errorCount++;
  }
};

// ✅ GOOD: Health check với tool metrics
app.get('/mcp/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    tools: Object.fromEntries(toolMetrics),
    uptime: process.uptime()
  };
  
  res.json(health);
});
```

#### 7. Tool Registration Best Practices
```typescript
// ✅ GOOD: Complete tool registration
const registerTools = () => {
  const tools = [
    {
      name: "user.create",
      description: "Create a new user account",
      version: "1.0.0",
      inputSchema: {
        type: "object",
        required: ["email", "password", "name"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          name: { type: "string", minLength: 1, maxLength: 100 }
        }
      },
      outputSchema: {
        type: "object",
        properties: {
          result: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
              name: { type: "string" },
              createdAt: { type: "string", format: "date-time" }
            }
          }
        }
      },
      requiresAuth: false,
      rateLimit: { requests: 10, window: "1m" }
    },
    {
      name: "user.update",
      description: "Update user profile information", 
      version: "1.0.0",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string" },
          name: { type: "string", minLength: 1, maxLength: 100 },
          email: { type: "string", format: "email" }
        }
      },
      outputSchema: {
        type: "object",
        properties: {
          result: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
              name: { type: "string" },
              updatedAt: { type: "string", format: "date-time" }
            }
          }
        }
      },
      requiresAuth: true,
      rateLimit: { requests: 20, window: "1m" }
    }
  ];
  
  return tools;
};

app.get('/mcp/tools', (req, res) => {
  res.json({ tools: registerTools() });
});
```

### 📋 MCP Standards Summary

#### ✅ DO's
- **Tool Naming**: Use domain.action format (`user.create`, `auth.login`)
- **JSON Schema**: Complete schemas với type/required/properties
- **Security**: Never return passwords, hash on server với bcryptjs
- **Errors**: HTTP 4xx/5xx với `{ error: "..." }` format
- **Success**: Return `{ result: ... }` format
- **Auth**: Check JWT ở `/mcp/call` cho protected tools
- **Idempotency**: Handle duplicate operations gracefully
- **Logging**: Log tool, processing time, requestId
- **Validation**: Validate all input parameters
- **Rate Limiting**: Implement per-tool rate limits

#### ❌ DON'Ts
- **Vague Naming**: Avoid generic names like `create`, `update`
- **Incomplete Schemas**: Don't use `any` types without validation
- **Password Exposure**: Never return password or hash in responses
- **Inconsistent Errors**: Don't mix error response formats
- **Missing Auth**: Don't skip authentication for sensitive operations
- **Non-idempotent**: Don't create duplicates on retry
- **No Logging**: Don't skip observability for debugging
- **No Validation**: Don't trust client input without validation

### 🚀 GraphQL Best Practices

#### 1. Schema Design
```graphql
# ✅ GOOD: Clear, descriptive types
type User {
  id: ID!
  email: String!
  profile: UserProfile
  createdAt: DateTime!
}

# ❌ BAD: Vague types
type User {
  id: String
  data: JSON
}
```

#### 2. Resolver Patterns
```typescript
// ✅ GOOD: Error handling và data validation
const resolvers = {
  Query: {
    me: async (_, __, { req }) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) throw new AuthenticationError('Token required');
      
      try {
        const user = await authService.verifyToken(token);
        return user;
      } catch (error) {
        throw new AuthenticationError('Invalid token');
      }
    }
  }
};
```

#### 3. Performance Optimization
- **DataLoader**: Batch và cache database queries
- **Field-level Caching**: Cache expensive computations
- **Query Complexity**: Limit query depth và complexity
- **Pagination**: Implement cursor-based pagination

#### 4. Security
```typescript
// ✅ GOOD: Input validation
const typeDefs = gql`
  type Mutation {
    createItem(name: String!): Item!
  }
`;

// ✅ GOOD: Authorization
const resolvers = {
  Mutation: {
    createItem: async (_, { name }, { user }) => {
      if (!user) throw new AuthenticationError('Must be logged in');
      return await dataService.createItem(name, user.id);
    }
  }
};
```

### 🛠️ Development Rules & Conventions

#### 1. Code Organization
```
apps/
├── service-name/
│   ├── src/
│   │   ├── index.ts          # Main entry point
│   │   ├── resolvers/        # GraphQL resolvers
│   │   ├── routes/           # REST routes
│   │   ├── services/         # Business logic
│   │   ├── models/           # Data models
│   │   └── utils/            # Utilities
│   ├── package.json
│   └── tsconfig.json
```

#### 2. Environment Configuration
```typescript
// ✅ GOOD: Environment variables với defaults
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/app';

// ❌ BAD: Hardcoded values
const PORT = 5000;
const JWT_SECRET = 'secret';
```

#### 3. Logging & Monitoring
```typescript
// ✅ GOOD: Structured logging
console.log('Service started', { 
  service: 'ai-service', 
  port: PORT, 
  env: process.env.NODE_ENV 
});

// ✅ GOOD: Error logging với context
console.error('MCP call failed', { 
  tool, 
  input, 
  error: error.message,
  timestamp: new Date().toISOString()
});
```

#### 4. Testing Strategy
- **Unit Tests**: Test individual functions và methods
- **Integration Tests**: Test service interactions
- **Contract Tests**: Test API contracts giữa services
- **End-to-End Tests**: Test complete user workflows

#### 5. Deployment Rules
- **Health Checks**: Implement `/health` endpoints
- **Graceful Shutdown**: Handle SIGTERM signals
- **Resource Limits**: Set memory và CPU limits
- **Rolling Updates**: Deploy services independently

### 🔒 Security Best Practices

#### 1. Authentication & Authorization
```typescript
// ✅ GOOD: JWT validation
const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new AuthenticationError('Invalid token');
  }
};

// ✅ GOOD: Role-based access
const requireRole = (role: string) => (req, res, next) => {
  if (!req.user.roles.includes(role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
```

#### 2. Input Validation
```typescript
// ✅ GOOD: Input sanitization
import { z } from 'zod';

const createItemSchema = z.object({
  name: z.string().min(1).max(100).trim()
});

const { name } = createItemSchema.parse(req.body);
```

#### 3. CORS Configuration
```typescript
// ✅ GOOD: Specific CORS settings
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

### 📊 Monitoring & Observability

#### 1. Metrics Collection
- **Response Times**: Monitor API response times
- **Error Rates**: Track error percentages
- **Throughput**: Monitor requests per second
- **Resource Usage**: CPU, memory, disk usage

#### 2. Logging Standards
```typescript
// ✅ GOOD: Structured logging
const logger = {
  info: (message: string, meta?: object) => 
    console.log(JSON.stringify({ level: 'info', message, ...meta })),
  error: (message: string, error?: Error, meta?: object) => 
    console.error(JSON.stringify({ level: 'error', message, error: error?.message, ...meta }))
};
```

#### 3. Health Check Implementation
```typescript
// ✅ GOOD: Comprehensive health checks
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      external: await checkExternalServices()
    }
  };
  
  const isHealthy = Object.values(health.services).every(status => status === 'healthy');
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### 🚀 Performance Guidelines

#### 1. Database Optimization
- **Indexing**: Create proper indexes cho queries
- **Connection Pooling**: Sử dụng connection pools
- **Query Optimization**: Avoid N+1 queries
- **Caching**: Implement Redis caching cho frequent data

#### 2. API Performance
- **Pagination**: Implement pagination cho large datasets
- **Field Selection**: Chỉ return fields cần thiết
- **Compression**: Enable gzip compression
- **CDN**: Sử dụng CDN cho static assets

#### 3. Memory Management
- **Streaming**: Sử dụng streams cho large files
- **Memory Leaks**: Monitor và fix memory leaks
- **Garbage Collection**: Tune GC settings nếu cần
- **Resource Cleanup**: Properly cleanup resources

Những best practices này sẽ giúp team phát triển maintainable, scalable và secure microservices architecture! 🎯
