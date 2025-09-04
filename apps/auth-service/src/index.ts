import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const PORT = Number(process.env.PORT || 5003);
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const user = { id: 'u1', email: 'admin@example.com', passwordHash: bcrypt.hashSync('admin', 8) };

const app = express();
app.use(cors());
app.use(express.json());

app.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (email !== user.email || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

app.get('/me', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    res.json({ user: { id: payload.sub, email: payload.email } });
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`Auth service :${PORT}`));
