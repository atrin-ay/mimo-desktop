import type { MemoryProvider } from './MemoryProvider';
import { ChatProviderMemoryAdapter } from './ChatProviderMemoryAdapter';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

/**
 * Memory Provider registry.
 *
 * Resolves the active memory provider based on the `MEMORY_PROVIDER` env var.
 * Falls back to the chat provider when none is configured.
 */

const memoryProviders: Record<string, () => MemoryProvider> = {
  'chat-adapter': () => new ChatProviderMemoryAdapter(),
};

let cachedProvider: MemoryProvider | null = null;

export function getMemoryProvider(): MemoryProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const name = env.memoryProvider || 'chat-adapter';

  const factory = memoryProviders[name];

  if (!factory) {
    logger.warn(
      { requested: name, fallback: 'chat-adapter' },
      'Unknown memory provider, falling back to chat adapter',
    );
    cachedProvider = new ChatProviderMemoryAdapter();
  } else {
    cachedProvider = factory();
  }

  logger.info({ provider: cachedProvider.name }, 'Memory provider selected');
  return cachedProvider;
}

export function resetMemoryProvider(): void {
  cachedProvider = null;
}

export type { MemoryProvider } from './MemoryProvider';
