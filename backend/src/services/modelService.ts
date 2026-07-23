import { getProvider } from '../providers';
import { logger } from '../config/logger';
import { env } from '../config/env';

/** A model that can be used with MiMo CLI. */
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  provider?: string;
}

/** Default model when none is selected. */
const DEFAULT_MODEL = 'mimo/mimo-auto';

/** Cache for models list (refreshed every 5 minutes). */
let cachedModels: ModelInfo[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch available models from the MiMo CLI.
 * Uses `mimo models` command which returns one model ID per line.
 */
async function fetchModelsFromCli(): Promise<ModelInfo[]> {
  const provider = getProvider() as any;

  try {
    const result = await provider.runCommand(['models']);
    const output = result.stdout.trim();

    if (!output) {
      logger.warn('No models returned from MiMo CLI');
      return getDefaultModels();
    }

    const modelIds = output
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line && !line.startsWith(' '));

    return modelIds.map((modelId: string) => ({
      id: modelId,
      name: formatModelName(modelId),
      description: getModelDescription(modelId),
      provider: modelId.split('/')[0],
    }));
  } catch (err) {
    logger.error({ err }, 'Failed to fetch models from MiMo CLI');
    return getDefaultModels();
  }
}

/** Format model ID to a readable name. */
function formatModelName(modelId: string): string {
  const parts = modelId.split('/');
  const name = parts[parts.length - 1];
  return name
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Get optional description for known models. */
function getModelDescription(modelId: string): string {
  const descriptions: Record<string, string> = {
    'mimo/mimo-auto': 'Automatically select the best model',
    'xiaomi/mimo-v2.5': 'Standard MiMo v2.5 model',
    'xiaomi/mimo-v2.5-pro': 'Advanced MiMo v2.5 Pro model',
    'xiaomi/mimo-v2.5-pro-ultraspeed': 'Ultra-fast MiMo v2.5 Pro model',
  };
  return descriptions[modelId] || '';
}

/** Fallback models if CLI is unavailable. */
function getDefaultModels(): ModelInfo[] {
  return [
    { id: 'mimo/mimo-auto', name: 'Auto', description: 'Automatically select the best model', provider: 'mimo' },
    { id: 'xiaomi/mimo-v2.5', name: 'MiMo v2.5', description: 'Standard MiMo v2.5 model', provider: 'xiaomi' },
    { id: 'xiaomi/mimo-v2.5-pro', name: 'MiMo v2.5 Pro', description: 'Advanced MiMo v2.5 Pro model', provider: 'xiaomi' },
    { id: 'xiaomi/mimo-v2.5-pro-ultraspeed', name: 'MiMo v2.5 Pro UltraSpeed', description: 'Ultra-fast MiMo v2.5 Pro model', provider: 'xiaomi' },
  ];
}

/** Current session model (in-memory, resets on server restart). */
let currentModel: string = DEFAULT_MODEL;

export const modelService = {
  /** Get all available models. */
  async getModels(): Promise<ModelInfo[]> {
    const now = Date.now();
    if (cachedModels.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedModels;
    }

    cachedModels = await fetchModelsFromCli();
    cacheTimestamp = now;
    logger.info({ count: cachedModels.length }, 'Models loaded');
    return cachedModels;
  },

  /** Get the currently selected model. */
  getCurrentModel(): string {
    return currentModel;
  },

  /** Set the current model. */
  setCurrentModel(modelId: string): void {
    currentModel = modelId;
  },

  /** Validate a model ID exists in the available models. */
  async validateModel(modelId: string): Promise<boolean> {
    const models = await this.getModels();
    return models.some((m) => m.id === modelId);
  },

  /** Get default model ID. */
  getDefaultModel(): string {
    return DEFAULT_MODEL;
  },

  /** Resolve model ID with fallback to default. */
  async resolveModel(modelId?: string): Promise<string> {
    if (!modelId) return currentModel;

    if (await this.validateModel(modelId)) {
      return modelId;
    }

    logger.warn({ modelId }, 'Invalid model, falling back to default');
    return currentModel;
  },
};

export default modelService;
