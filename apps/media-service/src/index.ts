import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const PORT = Number(process.env.PORT || 5002);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/image/resize', (req, res) => {
  const { width, height } = req.body || {};
  res.json({ ok: true, message: `Pretend resized to ${width}x${height}` });
});

app.listen(PORT, () => console.log(`Media service :${PORT}`));
