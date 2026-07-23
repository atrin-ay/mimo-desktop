import type { AIProvider } from './AIProvider';
import { MockProvider } from './MockProvider';
import { MiMoProvider } from './MiMoProvider';
import { MimoCliProvider } from './MimoCliProvider';
import { MimoServeProvider } from './MimoServeProvider';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Provider registry.
 *
 * Resolves the active AI provider based on the `AI_PROVIDER` env var.
 */
const providers: Record<string, () => AIProvider> = {
  mock: () => new MockProvider(),
  mimo: () => new MiMoProvider(),
  'mimo-cli': () => new MimoCliProvider(),
  'mimo-serve': () => new MimoServeProvider(),
};

let cachedProvider: AIProvider | null = null;

export function getProvider(): AIProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  let name = env.aiProvider;

  // Auto-detect: prefer mimo-serve (supports questions), then mimo-cli, then mimo with API key, else mock
  if (name === 'mock') {
    if (env.mimoApiKey) {
      name = 'mimo';
    } else {
      name = 'mimo-serve';
    }
  }

  const factory = providers[name];

  if (!factory) {
    const available = Object.keys(providers).join(', ');
    throw new Error(
      `Unknown AI_PROVIDER "${name}". Available providers: ${available}`,
    );
  }

  cachedProvider = factory();
  logger.info({ provider: cachedProvider.name }, 'Active AI provider selected');
  return cachedProvider;
}

export function resetProvider(): void {
  cachedProvider = null;
}

export type { AIProvider } from './AIProvider';
