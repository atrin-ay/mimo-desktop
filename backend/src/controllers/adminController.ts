import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { resetProvider } from '../providers';
import { logger } from '../config/logger';

function upsertEnvVar(filePath: string, key: string, value: string) {
  const exists = fs.existsSync(filePath);
  let content = exists ? fs.readFileSync(filePath, 'utf8') : '';

  const line = `${key}=${value}`;

  if (content.includes(`${key}=`)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    content = content.replace(regex, line);
  } else {
    if (content && !content.endsWith('\n')) content += '\n';
    content += line + '\n';
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

export async function setApiKey(req: Request, res: Response) {
  // Only allow setting the API key in non-production environments.
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: { code: 'forbidden', message: 'Not allowed in production' } });
  }

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

    logger.info({ keyPrefix: trimmedKey.substring(0, 8) + '...', baseUrl: mimoBaseUrl || env.mimoBaseUrl, model: mimoModel || env.mimoModel }, 'API key updated and provider reset');

    // Also attempt to persist to .env at project root (development convenience)
    const envPath = path.resolve(process.cwd(), '.env');
    try {
      upsertEnvVar(envPath, 'MIMO_API_KEY', trimmedKey);
      upsertEnvVar(envPath, 'AI_PROVIDER', 'mimo');
      if (mimoBaseUrl && mimoBaseUrl.trim()) {
        upsertEnvVar(envPath, 'MIMO_BASE_URL', mimoBaseUrl);
      }
      if (mimoModel && mimoModel.trim()) {
        upsertEnvVar(envPath, 'MIMO_MODEL', mimoModel);
      }
    } catch (err) {
      // non-fatal, log and continue
      // eslint-disable-next-line no-console
      console.warn('Failed to write .env file', err);
    }

    return res.status(200).json({ data: { ok: true } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'server_error', message: err?.message ?? 'unknown' } });
  }
}
