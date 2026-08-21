import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../config/logger';

const TOKEN_FILE = path.resolve(process.cwd(), 'data', 'admin.token');

let cachedToken: string | null = null;

/**
 * Get or create the admin token.
 * On first call, checks if the token file exists. If not, generates a random
 * token and writes it to data/admin.token with restrictive permissions.
 */
function getAdminToken(): string {
  if (cachedToken) return cachedToken;

  try {
    if (fs.existsSync(TOKEN_FILE)) {
      cachedToken = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
      if (cachedToken) {
        logger.info('Admin token loaded from file');
        return cachedToken;
      }
    }
  } catch {
    // Fall through to generate
  }

  // Generate new token
  cachedToken = crypto.randomBytes(32).toString('hex');

  try {
    const dir = path.dirname(TOKEN_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_FILE, cachedToken, { mode: 0o600 });
    logger.info({ path: TOKEN_FILE }, 'Generated new admin token');
  } catch (err) {
    logger.error({ err }, 'Failed to write admin token file — token is still valid for this session');
  }

  return cachedToken!;
}

/**
 * Middleware requiring a valid bearer token on admin routes.
 * Works in ALL NODE_ENV values — the old development-only gate is removed.
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = getAdminToken();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Admin token required. Pass it as Authorization: Bearer <token>' } });
    return;
  }

  const provided = authHeader.slice(7).trim();
  const providedBuf = Buffer.from(provided);
  const tokenBuf = Buffer.from(token);
  if (providedBuf.length !== tokenBuf.length || !crypto.timingSafeEqual(providedBuf, tokenBuf)) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Invalid admin token' } });
    return;
  }

  next();
}

/** Get the admin token without middleware (for use in adminController). */
export function getAdminTokenValue(): string {
  return getAdminToken();
}
