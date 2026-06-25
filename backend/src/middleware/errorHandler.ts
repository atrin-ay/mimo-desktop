import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from './errors';
import { logger } from '../config/logger';
import type { ApiError } from '../types';

/**
 * Centralized error-handling middleware.
 *
 * Converts thrown errors into a consistent JSON envelope:
 *   { error: { code, message, details? } }
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod errors thrown outside the validate middleware.
  if (err instanceof ZodError) {
    const body: ApiError = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues,
      },
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof HttpError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path }, 'HTTP error');
    } else {
      logger.warn({ code: err.code, path: req.path, message: err.message }, 'Client error');
    }

    const body: ApiError = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // Unknown / unexpected errors.
  logger.error({ err, path: req.path }, 'Unhandled error');
  const body: ApiError = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
  res.status(500).json(body);
}

export default errorHandler;