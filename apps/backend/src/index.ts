import dotenv from 'dotenv';
import express from 'express';
import { pool } from './db/index';
import articlesRouter from './routes/articles';
import authRouter from './routes/auth';
import signalsRouter from './routes/signals';
import sourcesRouter from './routes/sources';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(express.json());

app.use('/sources', sourcesRouter);
app.use('/articles', articlesRouter);
app.use('/api', signalsRouter);
app.use('/api', authRouter);

app.get('/', (_req, res) => {
  res.json({ message: 'signal backend is running' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log('database connected');

    app.listen(PORT, () => {
      console.log(`signal backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('failed to connect to database', error);
    process.exit(1);
  }
}

startServer();
