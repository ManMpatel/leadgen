import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db';
import { createIndexes } from './collections';
import leadsRouter from './routes/leads';
import searchesRouter from './routes/searches';
import subscribersRouter from './routes/subscribers';
import geminiRouter from './routes/gemini';
import dashboardRouter from './routes/dashboard';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/leads', leadsRouter);
app.use('/api/searches', searchesRouter);
app.use('/api/subscribers', subscribersRouter);
app.use('/api/gemini', geminiRouter);
app.use('/api/dashboard', dashboardRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

async function start() {
  await connectDB();
  await createIndexes();
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

start().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
