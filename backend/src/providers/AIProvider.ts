import type { ProviderHealth, ProviderMessage, ProviderResult } from '../types';

/**
 * Abstraction over an AI backend.
 *
 * Implementations are responsible for turning a conversation history into an
 * assistant reply. Phase 1 ships only {@link MockProvider}; future phases may
 * add real providers (OpenAI, Anthropic, local models, etc.) without changing
 * the consuming services.
 */
export interface AIProvider {
  /** Human-readable provider name (e.g. "mock"). */
  readonly name: string;

  /**
   * Send the conversation history to the provider and return the assistant's
   * reply.
   *
   * @param messages - Full conversation history, ordered chronologically.
   * @returns The provider result containing the assistant reply.
   */
  sendMessage(messages: ProviderMessage[]): Promise<ProviderResult>;

  /** Check whether the provider is reachable / ready to serve requests. */
  healthCheck(): Promise<ProviderHealth>;
}