import crypto from 'crypto';
import { getProvider } from '../providers';
import { logger } from '../config/logger';
import { MimoLocalClient } from '../mimo/client';
import { modelService } from './modelService';
import { getRuntimePaths, assertPathInsideRuntime } from '../mimo/runtime';
import fs from 'fs';

const PROVIDER_ID_REGEX = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export interface ProviderSummary {
  id: string;
  name: string;
  hasCredential: boolean;
  source: string;
  modelCount: number;
}

export function keyHash(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 8);
}

export const providerService = {
  async listProviders(): Promise<ProviderSummary[]> {
    const catalog = await modelService.getCatalog();
    return catalog.providers.map((p) => ({
      id: p.id,
      name: p.name,
      hasCredential: p.hasCredential,
      source: p.source,
      modelCount: p.models.length,
    }));
  },

  async setCredential(providerId: string, key: string): Promise<void> {
    if (!PROVIDER_ID_REGEX.test(providerId)) {
      throw new Error(`Invalid provider ID format: "${providerId}"`);
    }
    if (!key || typeof key !== 'string' || key.length < 8 || key.length > 2048) {
      throw new Error('API key must be between 8 and 2048 characters');
    }
    if (/[\x00-\x1f\x7f]/.test(key)) {
      throw new Error('API key contains illegal control characters');
    }

    const provider = getProvider() as any;
    if (!provider || !provider.isReady || !provider.url) {
      throw new Error('MiMo serve instance is not ready');
    }

    const client = new MimoLocalClient(provider.url, provider.servePassword);
    const success = await client.putAuth(providerId, { type: 'api', key });
    if (!success) {
      throw new Error(`Failed to store credential for provider "${providerId}"`);
    }

    logger.info({ providerId, keyHash: keyHash(key) }, 'Provider credential stored successfully');

    // Secure auth.json permission if on disk
    try {
      const paths = getRuntimePaths();
      assertPathInsideRuntime(paths.authFile);
      if (fs.existsSync(paths.authFile)) {
        fs.chmodSync(paths.authFile, 0o600);
      }
    } catch {}

    // Run models refresh side-effect
    try {
      if (typeof provider.runCommand === 'function') {
        await provider.runCommand(['models', '--refresh']);
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Failed to warm models catalog after credential update (non-fatal)');
    }

    modelService.invalidate();
  },

  async removeCredential(providerId: string): Promise<void> {
    if (!PROVIDER_ID_REGEX.test(providerId)) {
      throw new Error(`Invalid provider ID format: "${providerId}"`);
    }

    const provider = getProvider() as any;
    if (!provider || !provider.isReady || !provider.url) {
      throw new Error('MiMo serve instance is not ready');
    }

    const client = new MimoLocalClient(provider.url, provider.servePassword);
    await client.deleteAuth(providerId);

    logger.info({ providerId }, 'Provider credential removed');
    modelService.invalidate();
  },

  async refreshCatalog(): Promise<{ modelCount: number }> {
    const provider = getProvider() as any;
    if (provider && typeof provider.runCommand === 'function') {
      try {
        await provider.runCommand(['models', '--refresh']);
      } catch (err: any) {
        logger.warn({ error: err.message }, 'Manual models refresh failed');
      }
    }
    modelService.invalidate();
    const catalog = await modelService.getCatalog();
    let total = 0;
    for (const p of catalog.providers) total += p.models.length;
    return { modelCount: total };
  },
};

export default providerService;
