import type { AIProvider } from './AIProvider';
import type {
  ProviderHealth,
  ProviderMessage,
  ProviderResult,
} from '../types';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * MiMo AI provider — calls Xiaomi's MiMo model via OpenAI-compatible API.
 */
export class MiMoProvider implements AIProvider {
  readonly name = 'mimo';

  async sendMessage(messages: ProviderMessage[]): Promise<ProviderResult> {
    if (messages.length === 0) {
      throw new Error('MiMoProvider requires at least one message');
    }

    const apiKey = env.mimoApiKey;
    if (!apiKey) {
      throw new Error('MIMO_API_KEY is not configured');
    }

    const url = `${env.mimoBaseUrl}/chat/completions`;

    const systemMessage: ProviderMessage = {
      role: 'user',
      content:
        'You are MiMo, an intelligent AI assistant created by Xiaomi. You are helpful, concise, and provide accurate answers.',
    };

    const apiMessages = [systemMessage, ...messages].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    logger.debug(
      { messageCount: messages.length, model: env.mimoModel },
      'MiMoProvider sending request',
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: env.mimoModel,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, body: errorText },
        'MiMoProvider API error',
      );
      throw new Error(`MiMo API error: ${response.status} ${errorText}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    if (!content) {
      throw new Error('MiMo API returned empty response');
    }

    logger.info(
      { model: env.mimoModel, tokens: data.usage?.total_tokens },
      'MiMoProvider response received',
    );

    return {
      content,
      metadata: {
        provider: this.name,
        model: env.mimoModel,
        messageCount: messages.length,
        usage: data.usage,
      },
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const hasKey = !!env.mimoApiKey;
    return {
      healthy: hasKey,
      provider: this.name,
      details: {
        model: env.mimoModel,
        baseUrl: env.mimoBaseUrl,
        apiKeyConfigured: hasKey,
      },
    };
  }
}
