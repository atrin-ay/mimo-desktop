import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './config/logger';

// ─── Catch-all error handlers (temporary — for debugging silent exits) ─────
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason: String(reason), stack: (reason as any)?.stack }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — process will exit');
  process.exit(1);
});
import sessionRoutes from './routes/sessionRoutes';
import chatRoutes from './routes/chatRoutes';
import adminRoutes from './routes/adminRoutes';
import projectRoutes from './routes/projectRoutes';
import contextRoutes from './routes/contextRoutes';
import mimoRoutes from './routes/mimoRoutes';
import questionRoutes from './routes/questionRoutes';
import modelRoutes from './routes/modelRoutes';
import { initSchema } from './storage/database';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestLogger } from './middleware/requestLogger';
import { getProvider } from './providers';

const app = express();

app.use(express.json());
app.use(cors({ origin: env.corsOrigins }));
// Disable ETags so API responses are never cached as 304
app.set('etag', false);
app.use(requestLogger);

app.use('/api/session', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/context', contextRoutes);
app.use('/api/mimo', mimoRoutes);
app.use('/api/question', questionRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(notFound);
app.use(errorHandler);

const port = env.port;

initSchema();

app.listen(port, () => {
  logger.info({ port }, 'MIMO backend started');
});

// Graceful shutdown — stop mimo serve process
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  const provider = getProvider() as any;
  if (typeof provider.stop === 'function') {
    provider.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down...');
  const provider = getProvider() as any;
  if (typeof provider.stop === 'function') {
    provider.stop();
  }
  process.exit(0);
});
