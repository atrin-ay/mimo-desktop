import type { ProviderHealth, ProviderMessage, ProviderResult, MiMoAgent } from '../types';

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
   * @param agent - Official MiMo agent name (build, plan, compose). Provider decides how to use it.
   * @param model - Model ID to use (e.g., 'mimo/mimo-auto', 'xiaomi/mimo-v2.5').
   */
  sendMessage(messages: ProviderMessage[], agent?: MiMoAgent, model?: string): Promise<ProviderResult>;

  /** Check whether the provider is reachable / ready to serve requests. */
  healthCheck(): Promise<ProviderHealth>;
}
