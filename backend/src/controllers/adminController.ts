import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger';

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
