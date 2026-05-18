import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { loadEnvOrExit } from './config/env';
import { pool } from './db/index';
import articlesRouter from './routes/articles';
import authRouter from './routes/auth';
import blindspotRouter from './routes/blindspot';
import bookmarksRouter from './routes/bookmarks';
import signalsRouter from './routes/signals';
import sourcesRouter from './routes/sources';

dotenv.config();
const env = loadEnvOrExit();

const app = express();
const PORT = env.PORT;
const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || localOriginPattern.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
  })
);

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/auth') || req.path === '/blindspot',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.startsWith('/auth'),
});

const blindspotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path !== '/blindspot',
});

app.use(express.json());
app.use('/api', generalApiLimiter);
app.use('/api', authLimiter);
app.use('/api', blindspotLimiter);

app.use('/sources', sourcesRouter);
app.use('/articles', articlesRouter);
app.use('/api', signalsRouter);
app.use('/api', authRouter);
app.use('/api', blindspotRouter);
app.use('/api', bookmarksRouter);

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
