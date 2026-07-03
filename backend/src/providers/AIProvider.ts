import type { ProviderHealth, ProviderMessage, ProviderResult } from '../types';

/**
 * Abstraction over an AI backend.
 *
 * Implementations are responsible for turning a conversation history into an
 * assistant reply.
 */
export interface AIProvider {
  /** Human-readable provider name. */
  readonly name: string;

  /**
   * Send the conversation history to the provider and return the assistant's
   * reply.
   */
  sendMessage(messages: ProviderMessage[], mode?: string): Promise<ProviderResult>;

  /** Check whether the provider is reachable / ready to serve requests. */
  healthCheck(): Promise<ProviderHealth>;
}
