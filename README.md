# Node.js Microservices Base (GraphQL Gateway + AI/Media/Auth/Data + MCP-lite)

Gateway: Node.js + Express + Apollo Server (GraphQL).\
Services: AI (GraphQL + MCP-lite), Media (REST), Auth (REST/JWT), Data (REST + Mongo optional + Socket.IO).

MCP-lite: simple HTTP interface to register/call "tools" between services, e.g. Gateway → AI via `/mcp/call`.

Requirements: Node 18+.

## Quick start
```bash
npm i
docker compose up -d mongo redis   # optional (Mongo/Redis used by Data service)
npm run dev:ai
npm run dev:media
npm run dev:auth
npm run dev:data
npm run dev:gw

# Gateway GraphQL → http://localhost:5000/graphql
```
