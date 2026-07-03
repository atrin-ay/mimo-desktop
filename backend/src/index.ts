import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import sessionRoutes from './routes/sessionRoutes';
import chatRoutes from './routes/chatRoutes';
import adminRoutes from './routes/adminRoutes';
import { initSchema } from './storage/database';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestLogger } from './middleware/requestLogger';

const app = express();

app.use(express.json());
app.use(cors({ origin: env.corsOrigins }));
app.use(requestLogger);
app.use(pinoHttp({ logger } as any));

app.use('/api/session', sessionRoutes);
app.use('/api/chat', chatRoutes);
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
