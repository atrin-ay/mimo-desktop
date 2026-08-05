import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { resetProvider } from '../providers';
import { logger } from '../config/logger';

const OVERRIDES_FILE = path.resolve(process.cwd(), 'data', 'admin-overrides.json');

function loadOverrides(): Record<string, string> {
  try {
    if (fs.existsSync(OVERRIDES_FILE)) {
      return JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return {};
}

function saveOverrides(data: Record<string, string>): void {
  const dir = path.dirname(OVERRIDES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function keyHash(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 8);
}

export async function setApiKey(req: Request, res: Response) {
  try {
    const { mimoApiKey, mimoBaseUrl, mimoModel } = req.body ?? {};
    const trimmedKey = (typeof mimoApiKey === 'string' ? mimoApiKey : '').trim();
    if (!trimmedKey) {
      return res.status(400).json({ error: { code: 'invalid_input', message: 'mimoApiKey must be a non-empty string' } });
    }

    // Basic validation: reasonable length
    if (trimmedKey.length < 8 || trimmedKey.length > 2048) {
      return res.status(400).json({ error: { code: 'invalid_input', message: 'mimoApiKey length is invalid' } });
    }

    // Update process.env and runtime config
    process.env.MIMO_API_KEY = trimmedKey;
    process.env.AI_PROVIDER = 'mimo';
    if (typeof mimoBaseUrl === 'string' && mimoBaseUrl.trim()) {
      process.env.MIMO_BASE_URL = mimoBaseUrl;
    }
    if (typeof mimoModel === 'string' && mimoModel.trim()) {
      process.env.MIMO_MODEL = mimoModel;
    }
    try {
      // Keep the in-memory env config in sync so providers read the new key at runtime
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      env.mimoApiKey = trimmedKey;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      env.aiProvider = 'mimo';
      if (mimoBaseUrl && mimoBaseUrl.trim()) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        env.mimoBaseUrl = mimoBaseUrl;
      }
      if (mimoModel && mimoModel.trim()) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        env.mimoModel = mimoModel;
      }
    } catch (e) {
      // non-fatal
    }

    // Reset cached provider so it picks up the new key and provider type
    resetProvider();

    logger.info({ keyHash: keyHash(trimmedKey), baseUrl: mimoBaseUrl || env.mimoBaseUrl, model: mimoModel || env.mimoModel }, 'API key updated and provider reset');

    // Persist to admin-overrides.json (not .env — keeps secrets separate from config)
    try {
      const overrides = loadOverrides();
      overrides.MIMO_API_KEY = trimmedKey;
      overrides.AI_PROVIDER = 'mimo';
      if (mimoBaseUrl && mimoBaseUrl.trim()) {
        overrides.MIMO_BASE_URL = mimoBaseUrl;
      }
      if (mimoModel && mimoModel.trim()) {
        overrides.MIMO_MODEL = mimoModel;
      }
      saveOverrides(overrides);
    } catch (err) {
      logger.warn({ err }, 'Failed to write admin-overrides.json');
    }

    return res.status(200).json({ data: { ok: true } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'server_error', message: err?.message ?? 'unknown' } });
  }
}
