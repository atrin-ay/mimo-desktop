import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './config/logger';
import sessionRoutes from './routes/sessionRoutes';
import chatRoutes from './routes/chatRoutes';
import adminRoutes from './routes/adminRoutes';
import projectRoutes from './routes/projectRoutes';
import contextRoutes from './routes/contextRoutes';
import mimoRoutes from './routes/mimoRoutes';
import { initSchema } from './storage/database';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestLogger } from './middleware/requestLogger';

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
if (env.nodeEnv !== 'production') {
  app.use('/api/admin', adminRoutes);
} else {
  // In production do not expose the admin API for security
  logger.info('Admin routes disabled in production');
}

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
