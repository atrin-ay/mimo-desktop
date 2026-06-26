import type { AIProvider } from './AIProvider';
import { MiMoProvider } from './MiMoProvider';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Provider registry.
 *
 * Resolves the active AI provider based on the `AI_PROVIDER` env var.
 */
const providers: Record<string, () => AIProvider> = {
  mimo: () => new MiMoProvider(),
};

let cachedProvider: AIProvider | null = null;

export function getProvider(): AIProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const name = env.aiProvider;
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
