import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';
import { runWithRequestContext } from './requestContext';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.header('X-Request-ID')?.trim() || uuidv4();
  const timestamp = new Date().toISOString();

  const metadata = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    timestamp,
  };

  runWithRequestContext({ requestId }, () => {
    (req as Request & { requestId?: string }).requestId = requestId;

    logger.debug(metadata, 'HTTP request');

    next();
  });
}
