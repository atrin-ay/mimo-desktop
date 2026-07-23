import type { AIProvider } from './AIProvider';
import type {
  ProviderHealth,
  ProviderMessage,
  ProviderResult,
} from '../types';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';

const SYSTEM_PROMPT = `You are MiMo, a helpful and accurate AI assistant. Keep answers concise and relevant. Always return valid JSON-safe text.`;

function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<{ status: number; bodyText: string; json: unknown }> {
  const parsedUrl = new URL(url);
  const requestFn = parsedUrl.protocol === 'https:' ? httpsRequest : httpRequest;
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = requestFn(
      {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80'),
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data || '{}');
            resolve({ status: res.statusCode ?? 0, bodyText: data, json });
          } catch (error) {
            reject(new Error(`Failed to parse response JSON: ${error instanceof Error ? error.message : String(error)}`));
          }
        });
      },
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

export class MiMoProvider implements AIProvider {
  readonly name = 'mimo';

  async sendMessage(messages: ProviderMessage[], agent?: string): Promise<ProviderResult> {
    if (messages.length === 0) {
      throw new Error('MiMoProvider requires at least one message');
    }

    const apiKey = env.mimoApiKey;
    if (!apiKey) {
      throw new Error('MIMO_API_KEY is not configured');
    }

    const url = `${env.mimoBaseUrl.replace(/\/$/, '')}/chat/completions`;
    const keyPrefix = apiKey.substring(0, 8) + '...';

    logger.info({ url, model: env.mimoModel, keyPrefix, agent }, 'MiMoProvider connecting');

    const payload = {
      model: env.mimoModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 2048,
    } as const;

    logger.debug({ messageCount: messages.length, agent, model: env.mimoModel }, 'MiMoProvider sending request');

    let response;
    try {
      response = await postJson(url, {
        Authorization: `Bearer ${apiKey}`,
      }, payload);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      logger.error({ detail, url }, 'MiMoProvider connection failed');
      throw new Error(`Cannot reach AI provider at ${url}: ${detail}`);
    }

    if (response.status < 200 || response.status >= 300) {
      logger.error({ status: response.status, bodyText: response.bodyText }, 'MiMoProvider API error');
      throw new Error(`AI provider returned HTTP ${response.status}: ${response.bodyText}`);
    }

    const data = response.json as Record<string, unknown>;
    const choices = Array.isArray(data.choices) ? data.choices as Array<unknown> : undefined;
    const firstChoice = choices?.[0];
    const message =
      firstChoice && typeof firstChoice === 'object' && firstChoice !== null
        ? (firstChoice as Record<string, unknown>).message
        : undefined;
    const content = message && typeof message === 'object' && message !== null
      ? (message as Record<string, unknown>).content
      : undefined;

    if (!content || typeof content !== 'string') {
      throw new Error('MiMo API returned empty response');
    }

    logger.info({ model: env.mimoModel, provider: this.name }, 'MiMoProvider response received');

    return {
      content,
      metadata: {
        provider: this.name,
        model: env.mimoModel,
        usage: (data.usage as Record<string, unknown>) ?? undefined,
      },
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const healthy = Boolean(env.mimoApiKey);
    return {
      healthy,
      provider: this.name,
      details: {
        baseUrl: env.mimoBaseUrl,
        model: env.mimoModel,
        apiKeyConfigured: healthy,
      },
    };
  }
}
