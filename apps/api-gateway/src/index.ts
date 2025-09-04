import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import * as path from 'path';
import { connectNats, request } from '@common/nats';
import { PATTERNS } from '@common/patterns';
import { z } from 'zod';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = Number(process.env.PORT || 4000);
const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Swagger
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const openapi = require('../openapi.json');
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

  const nc = await connectNats(NATS_URL);

  app.get('/health', async (_req, res) => {
    const pingAgent = await request(nc, PATTERNS.HEALTH_PING, {}).catch(() => ({ ok:false }));
    res.json({ ok:true, bus: 'nats', agent: pingAgent });
  });

  // Agents
  const createAgentSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    model: z.string().optional()
  });
  app.post('/agents', async (req, res) => {
    const parsed = createAgentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok:false, errors: parsed.error.issues });
    const data = await request(nc, PATTERNS.AGENT_CREATE, parsed.data);
    res.json(data);
  });

  app.get('/agents/:id', async (req, res) => {
    const data = await request(nc, PATTERNS.AGENT_GET_BY_ID, { id: req.params.id });
    res.json(data);
  });

  app.get('/agents', async (_req, res) => {
    const data = await request(nc, PATTERNS.AGENT_LIST, { limit: 50, offset: 0 });
    res.json(data);
  });

  // Chat
  const chatMsgSchema = z.object({
    agentId: z.string(),
    userId: z.string(),
    content: z.string().min(1)
  });
  app.post('/chat/messages', async (req, res) => {
    const parsed = chatMsgSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok:false, errors: parsed.error.issues });
    const data = await request(nc, PATTERNS.CHAT_SEND_MESSAGE, parsed.data);
    res.json(data);
  });

  app.get('/chat/conversations/:id', async (req, res) => {
    const data = await request(nc, PATTERNS.CHAT_GET_CONVERSATION, { conversationId: req.params.id });
    res.json(data);
  });

  app.listen(PORT, () => {
    console.log(`API Gateway listening on http://localhost:${PORT} (Swagger /docs)`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
