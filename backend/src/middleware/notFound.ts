import type { Request, Response, NextFunction } from 'express';
import { NotFoundError } from './errors';

/** Middleware that catches all unmatched routes. */
export function notFound(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}

export default notFound;