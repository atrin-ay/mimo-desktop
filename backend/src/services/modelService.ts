import { getProvider } from '../providers';
import { logger } from '../config/logger';
import { MimoLocalClient, type MimoProvidersResponse } from '../mimo/client';
import getDatabase from '../storage/database';

export interface ProviderWithModels {
  id: string;
  name: string;
  env: string[];
  options: Record<string, unknown>;
  source: string;
  hasCredential: boolean;
  models: ModelInfo[];
}

export interface ModelInfo {
  id: string;
  providerID: string;
  modelID: string;
  name: string;
  family?: string;
  status?: string;
  contextLimit?: number;
  outputLimit?: number;
  capabilities?: {
    temperature?: boolean;
    reasoning?: boolean;
    attachment?: boolean;
    toolcall?: boolean;
  };
  cost?: {
    input?: number;
    output?: number;
    cache?: number | { read?: number; write?: number };
  };
}

export interface ModelCatalog {
  providers: ProviderWithModels[];
  default: Record<string, string>;
  fetchedAt: number;
}

export class ProviderNotReadyError extends Error {
  code = 'provider_not_ready';
  constructor(message = 'MiMo Code provider is not ready or uninitialized') {
    super(message);
    this.name = 'ProviderNotReadyError';
  }
}

export class UnknownModelError extends Error {
  code = 'unknown_model';
  constructor(modelId: string) {
    super(`Unknown or invalid model ID: "${modelId}"`);
    this.name = 'UnknownModelError';
  }
}

let cachedCatalog: ModelCatalog | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const modelService = {
  invalidate(): void {
    cachedCatalog = null;
    cacheTimestamp = 0;
  },

  async getCatalog(): Promise<ModelCatalog> {
    const now = Date.now();
    if (cachedCatalog && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedCatalog;
    }

    const provider = getProvider() as any;
    if (!provider || !provider.isReady || !provider.url) {
      throw new ProviderNotReadyError('MiMo serve instance is not ready or starting.');
    }

    const client = new MimoLocalClient(provider.url, provider.servePassword);
    let raw: MimoProvidersResponse;
    try {
      raw = await client.getProviders();
    } catch (err: any) {
      throw new ProviderNotReadyError(`Failed to fetch providers catalog from local serve: ${err.message}`);
    }

    const providers: ProviderWithModels[] = [];
    for (const provData of raw.providers) {
      const provId = provData.id;
      const modelsList: ModelInfo[] = [];
      const hasCredential = provData.source !== 'none' && (Object.keys(provData.models).length > 0 || provData.source === 'config' || provData.source === 'auth');

      for (const [modKey, modVal] of Object.entries(provData.models)) {
        const canonicalId = `${provId}/${modVal.id || modKey}`;
        modelsList.push({
          id: canonicalId,
          providerID: provId,
          modelID: modVal.id || modKey,
          name: modVal.name || modKey,
          family: modVal.family,
          status: modVal.status || 'active',
          contextLimit: modVal.limit?.context,
          outputLimit: modVal.limit?.output,
          capabilities: modVal.capabilities,
          cost: modVal.cost,
        });
      }

      // Sort models: active before beta, then by name
      modelsList.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return a.name.localeCompare(b.name);
      });

      providers.push({
        id: provId,
        name: provData.name || provId,
        env: provData.env || [],
        options: provData.options || {},
        source: provData.source,
        hasCredential,
        models: modelsList,
      });
    }

    // Sort providers by name
    providers.sort((a, b) => a.name.localeCompare(b.name));

    cachedCatalog = {
      providers,
      default: raw.default || {},
      fetchedAt: now,
    };
    cacheTimestamp = now;

    logger.info({ providerCount: providers.length }, 'Model catalog successfully cached');
    return cachedCatalog;
  },

  async getCurrentModel(): Promise<string> {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('selected_model') as { value: string } | undefined;
    if (row && row.value) {
      if (await this.isKnownModel(row.value)) {
        return row.value;
      }
    }

    // Fallback to catalog default
    try {
      const catalog = await this.getCatalog();
      // Pick first default or first model available
      const defaults = catalog.default;
      const firstProv = Object.keys(defaults)[0];
      if (firstProv && defaults[firstProv]) {
        const defModel = `${firstProv}/${defaults[firstProv]}`;
        await this.setCurrentModel(defModel);
        return defModel;
      }

      for (const p of catalog.providers) {
        if (p.models.length > 0) {
          const fallback = p.models[0].id;
          await this.setCurrentModel(fallback);
          return fallback;
        }
      }
    } catch {}

    return 'xiaomi/mimo-v2.5';
  },

  async setCurrentModel(modelId: string): Promise<void> {
    if (!await this.isKnownModel(modelId)) {
      throw new UnknownModelError(modelId);
    }
    const db = getDatabase();
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('selected_model', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(modelId);
  },

  async isKnownModel(modelId: string): Promise<boolean> {
    try {
      const catalog = await this.getCatalog();
      for (const p of catalog.providers) {
        if (p.models.some((m) => m.id === modelId)) {
          return true;
        }
      }
    } catch {}
    return false;
  },

  async resolveModel(modelId?: string): Promise<{ providerID: string; modelID: string }> {
    const targetId = modelId || (await this.getCurrentModel());
    const slashIdx = targetId.indexOf('/');
    if (slashIdx === -1) {
      throw new UnknownModelError(targetId);
    }

    const providerID = targetId.substring(0, slashIdx);
    const modelID = targetId.substring(slashIdx + 1);

    if (!providerID || !modelID) {
      throw new UnknownModelError(targetId);
    }

    if (!await this.isKnownModel(targetId)) {
      throw new UnknownModelError(targetId);
    }

    return { providerID, modelID };
  },
};

export default modelService;
