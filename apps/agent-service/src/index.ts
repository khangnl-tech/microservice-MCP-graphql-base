import express from 'express';
import dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectNats, serve } from '@common/nats';
import { PATTERNS } from '@common/patterns';
import { Agent } from './models';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ms_agent';
const PORT = Number(process.env.PORT || 4102);

async function main() {
  await mongoose.connect(MONGO_URI);
  const nc = await connectNats(NATS_URL);

  // RPC handlers
  serve(nc, PATTERNS.HEALTH_PING, async () => ({ ok:true, service: 'agent' }));

  serve(nc, PATTERNS.AGENT_CREATE, async ({ name, description, model }) => {
    const doc = await Agent.create({ name, description, model });
    return { ok:true, id: doc._id.toString(), name: doc.name, description: doc.description, model: doc.model };
  });

  serve(nc, PATTERNS.AGENT_GET_BY_ID, async ({ id }) => {
    const doc = await Agent.findById(id).lean();
    if (!doc) return { ok:false, error: 'Not found' };
    return { ok:true, id: doc._id.toString(), name: doc.name, description: doc.description, model: doc.model };
  });

  serve(nc, PATTERNS.AGENT_LIST, async ({ limit = 50, offset = 0 }) => {
    const items = await Agent.find().skip(offset).limit(limit).sort({ createdAt: -1 }).lean();
    return { ok:true, items: items.map(a => ({ id: a._id.toString(), name: a.name, description: a.description, model: a.model })) };
  });

  const app = express();
  app.get('/health', (_req, res) => res.json({ ok:true, service: 'agent' }));
  app.listen(PORT, () => console.log(`Agent service http health on :${PORT}`));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
