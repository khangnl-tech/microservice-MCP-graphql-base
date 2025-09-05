# 🚀 Node.js Microservices Base (GraphQL Gateway + AI/Media/Auth/Data + MCP-lite)

Hệ thống microservices hiện đại sử dụng **GraphQL Gateway** làm điểm vào chính, tích hợp các service chuyên biệt với **MCP-lite protocol** để giao tiếp linh hoạt.

## 🏗️ Kiến trúc hệ thống

### Core Services
- **Gateway (5000)**: GraphQL API Gateway - tổng hợp tất cả services
- **AI Service (5001)**: Xử lý AI/ML với MCP-lite protocol  
- **Auth Service (5003)**: JWT authentication & authorization
- **Data Service (5004)**: CRUD operations + real-time với Socket.IO
- **Media Service (5002)**: Xử lý media files

### Công nghệ chính
- **Backend**: Node.js + TypeScript + Express
- **API**: Apollo GraphQL Server + REST APIs
- **Database**: MongoDB (optional, có fallback in-memory)
- **Cache**: Redis (optional)
- **Real-time**: Socket.IO
- **Authentication**: JWT + bcrypt
- **Communication**: MCP-lite protocol
- **Containerization**: Docker Compose

## 🔄 Luồng hoạt động

### 1. Authentication Flow
```
Client → Gateway → Auth Service
1. POST /login với email/password
2. Auth Service verify credentials  
3. Trả về JWT token
4. Client sử dụng token trong header Authorization
```

### 2. GraphQL Query Flow
```
Client → Gateway GraphQL → Target Service
1. Client gửi GraphQL query đến Gateway
2. Gateway phân tích và gọi service tương ứng
3. Service xử lý và trả về data
4. Gateway tổng hợp và trả về cho client
```

### 3. MCP-lite Communication
```
Gateway → AI Service (via MCP)
1. Gateway gọi /mcp/call với tool name và input
2. AI Service xử lý tool và trả về result
3. Fallback: Nếu MCP fail, dùng GraphQL thay thế
```

### 4. Real-time Updates
```
Data Service → Socket.IO → Clients
1. Khi có item mới được tạo
2. Data Service emit event qua Socket.IO
3. Clients nhận real-time updates
```

## 🚀 Quick Start

### Yêu cầu hệ thống
- Node.js 18+
- Docker & Docker Compose (optional)

### Cài đặt và chạy
```bash
# 1. Cài đặt dependencies
npm i

# 2. Chạy databases (optional)
docker compose up -d mongo redis

# 3. Chạy tất cả services
npm run dev:all

# Hoặc chạy từng service riêng lẻ
npm run dev:gw    # Gateway (5000)
npm run dev:ai    # AI Service (5001)  
npm run dev:media # Media Service (5002)
npm run dev:auth  # Auth Service (5003)
npm run dev:data  # Data Service (5004)
```

### Endpoints chính
- **Gateway GraphQL**: http://localhost:5000/graphql
- **AI Service GraphQL**: http://localhost:5001/graphql
- **AI Service MCP**: http://localhost:5001/mcp/tools
- **Auth Service**: http://localhost:5003/login
- **Data Service**: http://localhost:5004/items
- **Media Service**: http://localhost:5002/health

## 📋 GraphQL Schema

### Queries
```graphql
query {
  aiHello(name: "World")     # AI greeting
  me                         # Current user info
  items                      # List all items
  mediaHealth                # Media service status
}
```

### Mutations
```graphql
mutation {
  login(email: "admin@example.com", password: "admin")  # Authentication
  createItem(name: "New Item")                          # Create item
}
```

## 🔧 MCP-lite Protocol

MCP-lite cung cấp interface đơn giản để gọi "tools" giữa các services:

### List Tools
```bash
GET /mcp/tools
# Response: { tools: [{ name: "aiHelloTool", description: "..." }] }
```

### Call Tool
```bash
POST /mcp/call
{
  "tool": "aiHelloTool",
  "input": { "name": "World" }
}
# Response: { result: "🤖 AI says: Hello World!" }
```

## 🛠️ Development

### Cấu trúc project
```
├── apps/                    # Microservices
│   ├── gateway/            # GraphQL Gateway
│   ├── ai-service/         # AI Service + MCP
│   ├── auth-service/       # Authentication
│   ├── data-service/       # Data + Socket.IO
│   └── media-service/      # Media processing
├── libs/                   # Shared libraries
│   └── common/            # HTTP, GraphQL, MCP utilities
└── docker-compose.yml     # Database services
```

### Scripts có sẵn
```bash
npm run dev:all     # Chạy tất cả services
npm run dev:gw      # Chỉ Gateway
npm run dev:ai      # Chỉ AI Service
npm run dev:media   # Chỉ Media Service  
npm run dev:auth    # Chỉ Auth Service
npm run dev:data    # Chỉ Data Service
npm run build       # Build TypeScript
```

## 📚 Tài liệu thêm

- [Kiến trúc chi tiết](./ARCHITECTURE.md) - Sơ đồ và luồng hoạt động
- [API Documentation](./docs/) - Chi tiết các endpoints
- [MCP-lite Protocol](./docs/mcp.md) - Hướng dẫn sử dụng MCP

## 🎯 Tính năng nổi bật

- ✅ **Microservices Architecture** - Tách biệt concerns, dễ scale
- ✅ **GraphQL Gateway** - API thống nhất, flexible querying  
- ✅ **MCP-lite Protocol** - Giao tiếp linh hoạt giữa services
- ✅ **Real-time Updates** - Socket.IO cho live data
- ✅ **Fallback Mechanisms** - Hệ thống hoạt động khi database không có
- ✅ **TypeScript** - Type safety và better DX
- ✅ **Docker Support** - Dễ deploy và scale
