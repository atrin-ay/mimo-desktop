import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './config/logger';

// ─── Catch-all error handlers ─────
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
import providerRoutes from './routes/providerRoutes';
import { initSchema } from './storage/database';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestLogger } from './middleware/requestLogger';
import { getProvider } from './providers';
import { getRuntimePaths } from './mimo/runtime';

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
app.use('/api/providers', providerRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', async (_req, res) => {
  const provider = getProvider() as any;
  let healthInfo = { name: 'mimo-serve', state: 'starting', isolationVerified: false, runtimeDir: '', reason: null };
  try {
    const paths = getRuntimePaths();
    healthInfo.runtimeDir = paths.runtimeRoot;
    if (typeof provider.healthCheck === 'function') {
      const h = await provider.healthCheck();
      healthInfo.state = h.details?.state || (h.healthy ? 'ready' : 'failed');
      healthInfo.isolationVerified = Boolean(h.details?.isolationVerified);
      healthInfo.reason = h.details?.error || h.details?.reason || null;
    }
  } catch (err: any) {
    healthInfo.state = 'failed';
    healthInfo.reason = err.message;
  }

  res.status(200).json({ status: 'ok', provider: healthInfo });
});

app.use(notFound);
app.use(errorHandler);

const port = env.port;

async function main() {
  initSchema();

  const provider = getProvider() as any;
  if (provider && typeof provider.init === 'function') {
    try {
      await provider.init();
    } catch (err: any) {
      logger.error({ error: err.message }, 'Provider failed to initialize during startup. Starting HTTP server in degraded mode for settings recovery.');
    }
  }

  app.listen(port, () => {
    logger.info({ port }, 'MIMO backend started');
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start backend main()');
  process.exit(1);
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down...');
  const provider = getProvider() as any;
  if (provider && typeof provider.stop === 'function') {
    try {
      await Promise.race([
        provider.stop(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Stop timeout')), 5000)),
      ]);
    } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('beforeExit', () => {
  const provider = getProvider() as any;
  if (provider && typeof provider.stop === 'function') {
    provider.stop();
  }
});
