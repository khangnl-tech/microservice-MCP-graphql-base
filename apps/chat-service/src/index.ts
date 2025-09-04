import express from 'express';
import dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectNats, serve } from '@common/nats';
import { PATTERNS } from '@common/patterns';
import { Conversation, Message } from './models';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ms_chat';
const PORT = Number(process.env.PORT || 4101);

async function main() {
  await mongoose.connect(MONGO_URI);
  const nc = await connectNats(NATS_URL);

  // RPC handlers
  serve(nc, PATTERNS.HEALTH_PING, async () => ({ ok:true, service: 'chat' }));

  serve(nc, PATTERNS.CHAT_SEND_MESSAGE, async ({ agentId, userId, content }) => {
    let conv = await Conversation.findOne({ agentId, userId });
    if (!conv) conv = await Conversation.create({ agentId, userId });
    const msg = await Message.create({ conversationId: conv._id, sender: 'user', content });
    return { ok:true, conversationId: conv._id.toString(), message: { id: msg._id.toString(), content: msg.content, createdAt: msg.createdAt } };
  });

  serve(nc, PATTERNS.CHAT_GET_CONVERSATION, async ({ conversationId }) => {
    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 }).lean();
    return { ok:true, messages: messages.map(m => ({ id: m._id.toString(), sender: m.sender, content: m.content, createdAt: m.createdAt })) };
  });

  // Optional tiny HTTP just for liveness
  const app = express();
  app.get('/health', (_req, res) => res.json({ ok:true, service: 'chat' }));
  app.listen(PORT, () => console.log(`Chat service http health on :${PORT}`));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
