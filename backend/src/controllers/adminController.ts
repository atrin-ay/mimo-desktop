import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger';
import { Request, Response } from 'express';
import { getAdminTokenValue } from '../middleware/adminAuth';

// Check admin-overrides.json at boot for legacy MIMO_API_KEY
const OVERRIDES_FILE = path.resolve(process.cwd(), 'data', 'admin-overrides.json');
try {
  if (fs.existsSync(OVERRIDES_FILE)) {
    const raw = fs.readFileSync(OVERRIDES_FILE, 'utf-8').trim();
    if (raw && raw !== '{}') {
      const overrides = JSON.parse(raw);
      if (overrides.MIMO_API_KEY) {
        logger.warn('LEGACY_KEY_DETECTED: admin-overrides.json contains MIMO_API_KEY. Please re-enter your provider API key in Settings.');
      }
    }
  }
} catch {}

export const adminController = {
  getToken(req: Request, res: Response): void {
    const ip = req.ip || req.socket.remoteAddress || '';
    const isLocal = ip.includes('127.0.0.1') || ip.includes('localhost') || ip.includes('::1') || ip.includes('::ffff:127.0.0.1');
    if (!isLocal) {
      res.status(403).json({ error: { code: 'forbidden', message: 'Local loopback only' } });
      return;
    }
    res.json({ data: { token: getAdminTokenValue() } });
  },
};
