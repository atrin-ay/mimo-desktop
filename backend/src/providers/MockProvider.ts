import type { AIProvider } from './AIProvider';
import type {
  ProviderHealth,
  ProviderMessage,
  ProviderResult,
} from '../types';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * A deterministic, offline AI provider used for Phase 1 development.
 *
 * It echoes context about the conversation (message count, last user message)
 * so the frontend can verify the full chat flow end-to-end without a real AI
 * backend. A small artificial delay simulates provider latency.
 */
export class MockProvider implements AIProvider {
  readonly name = 'mock';

  private readonly delayMs: number;

  constructor(delayMs?: number) {
    this.delayMs = delayMs ?? env.mockProviderDelayMs;
  }

  async sendMessage(messages: ProviderMessage[]): Promise<ProviderResult> {
    if (messages.length === 0) {
      throw new Error('MockProvider requires at least one message');
    }

    // Simulate network / inference latency.
    if (this.delayMs > 0) {
      await this.sleep(this.delayMs);
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user');

    const userText = lastUserMessage?.content ?? '';
    const content = this.buildReply(userText, messages.length);

    logger.debug(
      { messageCount: messages.length, provider: this.name },
      'MockProvider generated reply',
    );

    return {
      content,
      metadata: {
        provider: this.name,
        model: 'mock-1',
        messageCount: messages.length,
        latencyMs: this.delayMs,
      },
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      healthy: true,
      provider: this.name,
      details: {
        model: 'mock-1',
        delayMs: this.delayMs,
      },
    };
  }

  private buildReply(userText: string, messageCount: number): string {
    const trimmed = userText.length > 200 ? `${userText.slice(0, 200)}…` : userText;
    return [
      '[Mock Provider — Phase 1]',
      '',
      `I received your message: "${trimmed}"`,
      '',
      `Conversation so far contains ${messageCount} message(s).`,
      'This is a simulated response. Connect a real AI provider in a later phase.',
    ].join('\n');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}