import type { AIProvider } from './AIProvider';
import type {
  ProviderHealth,
  ProviderMessage,
  ProviderResult,
} from '../types';

export class MockProvider implements AIProvider {
  readonly name = 'mock';

  async sendMessage(messages: ProviderMessage[]): Promise<ProviderResult> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const content = lastUserMessage
      ? `Mock response: ${lastUserMessage.content}`
      : 'Mock response: no user message provided';

    return {
      content,
      metadata: {
        provider: this.name,
        messageCount: messages.length,
      },
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      healthy: true,
      provider: this.name,
      details: {
        messageCount: 0,
      },
    };
  }
}
