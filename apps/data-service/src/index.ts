import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Schema, Types } from 'mongoose';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const PORT = Number(process.env.PORT || 5004);
const MONGO_URI = process.env.MONGO_URI || '';

const ItemSchema = new Schema<{ _id: Types.ObjectId; name: string }>({ name: { type: String, required: true } }, { timestamps: true });
const Item = mongoose.models.Item || mongoose.model('Item', ItemSchema);

async function initMongo() {
  if (!MONGO_URI) return;
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Data service connected Mongo');
  } catch (e) {
    console.warn('Mongo connect failed (running in memory fallback).', (e as Error).message);
  }
}

async function bootstrap() {
  await initMongo();

  const app = express();
  app.use(cors());
  app.use(express.json());

  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });
  io.on('connection', (socket) => console.log('SocketIO client connected', socket.id));

  app.get('/items', async (_req, res) => {
    try {
      const items = await Item.find().sort({ createdAt: -1 }).lean();
      res.json({ items: items.map(i => ({ id: i._id.toString(), name: i.name })) });
    } catch {
      res.json({ items: [] });
    }
  });

  app.post('/items', async (req, res) => {
    const { name } = req.body || {};
    let item: any;
    try {
      item = await Item.create({ name });
      io.emit('item_created', { id: item._id.toString(), name: item.name });
      res.json({ item: { id: item._id.toString(), name: item.name } });
    } catch {
      const id = Math.random().toString(36).slice(2);
      io.emit('item_created', { id, name });
      res.json({ item: { id, name } });
    }
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));
  httpServer.listen(PORT, () => console.log(`Data service :${PORT} (Socket.IO enabled)`));
}
bootstrap();
