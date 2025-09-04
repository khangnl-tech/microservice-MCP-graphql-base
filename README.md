# Node.js Microservices Base (Express + NATS + Mongo + Redis)

Services:
- **api-gateway** (Express + Swagger) – HTTP entrypoint, RPC to services via NATS
- **chat-service** (Express for health only; core via NATS handlers) – conversations & messages (MongoDB)
- **agent-service** – agents CRUD (MongoDB)

Infra (docker-compose): **NATS**, **MongoDB**, **Redis** for local dev.

## Quick Start
```bash
# 1) Install deps at repo root
npm i

# 2) Start infra
docker compose up -d nats mongo redis

# 3) Run services (3 terminals or use dev:all)
npm run dev:gw
npm run dev:chat
npm run dev:agent
# or
npm run dev:all

# Swagger UI
# → http://localhost:4000/docs
```

## Notes
- Message bus: **NATS** (request/reply). Subjects defined in `libs/common/src/patterns.ts`.
- DB: Each service owns its DB (loose coupling).
- Validation: **zod** at gateway & services boundaries.
