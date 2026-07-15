import type { MemoryProvider } from './MemoryProvider';
import { getProvider } from '../../providers';
import type { ProviderMessage } from '../../types';
import { logger } from '../../config/logger';

const MEMORY_TIMEOUT_MS = 30000; // 30 seconds timeout for memory operations

/**
 * Adapts the existing chat AI provider for memory operations.
 *
 * This is the default memory provider — it uses whatever chat provider
 * is configured (MiMo, MiMo CLI, Mock, etc.) to generate memory patches.
 *
 * Key design:
 * - Uses the same provider as chat (auto-fallback to MiMo CLI if no API key)
 * - Adds a timeout to prevent long-running memory operations from blocking
 * - Returns a no-update patch on timeout/failure (graceful degradation)
 */
export class ChatProviderMemoryAdapter implements MemoryProvider {
  readonly name = 'chat-provider-adapter';

  async complete(prompt: string): Promise<string> {
    const provider = getProvider();

    // Send the prompt as a single user message with timeout
    const messages: ProviderMessage[] = [
      { role: 'user', content: prompt },
    ];

    try {
      const result = await Promise.race([
        provider.sendMessage(messages),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Memory provider timeout')), MEMORY_TIMEOUT_MS)
        ),
      ]);
      return result.content;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn({ error: errorMsg }, 'Memory provider failed, returning no-update patch');

      // Return a valid no-update patch so the system continues working
      return JSON.stringify({
        update: false,
        reason: `Memory provider error: ${errorMsg}`,
        changes: [],
      });
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const provider = getProvider();
      const health = await provider.healthCheck();
      return health.healthy;
    } catch {
      return false;
    }
  }
}

export default ChatProviderMemoryAdapter;
