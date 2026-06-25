import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';
import { runWithRequestContext } from './requestContext';

const SESSION_CREATE_PATH = '/api/session';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.header('X-Request-ID')?.trim() || uuidv4();
  const timestamp = new Date().toISOString();
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  const metadata = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    timestamp,
    clientIp,
  };

  runWithRequestContext({ requestId }, () => {
    (req as Request & { requestId?: string }).requestId = requestId;

    logger.info(metadata, 'HTTP request received');

    if (req.method === 'POST' && req.originalUrl === SESSION_CREATE_PATH) {
      logger.info(
        {
          requestId,
          timestamp,
          clientIp,
          method: req.method,
          url: req.originalUrl,
        },
        '[SESSION CREATE] incoming request',
      );
    }

    next();
  });
}
