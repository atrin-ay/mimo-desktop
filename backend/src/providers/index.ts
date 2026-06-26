import type { AIProvider } from './AIProvider';
import { MockProvider } from './MockProvider';
import { MiMoProvider } from './MiMoProvider';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Provider registry.
 *
 * Resolves the active AI provider based on the `AI_PROVIDER` env var. Phase 1
 * only registers the mock provider; later phases can register real providers
 * here without touching the services that consume {@link getProvider}.
 */
const providers: Record<string, () => AIProvider> = {
  mock: () => new MockProvider(),
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

/** Reset the cached provider. Useful for tests. */
export function resetProvider(): void {
  cachedProvider = null;
}

export type { AIProvider } from './AIProvider';
export { MockProvider } from './MockProvider';