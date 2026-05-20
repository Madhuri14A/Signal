import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import type { Server } from 'node:http';
import helmet from 'helmet';
import morgan from 'morgan';
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
const FRONTEND_URL = env.FRONTEND_URL;
const FRONTEND_ORIGIN = new URL(FRONTEND_URL).origin;
let server: Server | null = null;

app.use(helmet());
app.use(morgan('combined'));

app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
}));

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

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode =
    typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status?: unknown }).status === 'number'
      ? ((err as { status: number }).status >= 400 ? (err as { status: number }).status : 500)
      : 500;

  console.error('Unhandled error:', err);
  res.status(statusCode).json({ error: 'Something went wrong', code: statusCode });
});

async function gracefulShutdown(signal: string) {
  console.log(`${signal} received. Starting graceful shutdown...`);

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    await pool.end();
    console.log('Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log('database connected');

    server = app.listen(PORT, () => {
      console.log(`signal backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('failed to connect to database', error);
    process.exit(1);
  }
}

startServer();
