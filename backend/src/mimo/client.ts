import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { getRuntimePaths, assertPathInsideRuntime } from './runtime';

export const MimoModelSchema = z.object({
  id: z.string(),
  providerID: z.string(),
  name: z.string(),
  family: z.string().optional(),
  status: z.string().optional(),
  cost: z.object({
    input: z.number().optional(),
    output: z.number().optional(),
    cache: z.union([
      z.number(),
      z.object({ read: z.number().optional(), write: z.number().optional() }),
    ]).optional(),
  }).optional(),
  limit: z.object({
    context: z.number().optional(),
    output: z.number().optional(),
  }).optional(),
  capabilities: z.object({
    temperature: z.boolean().optional(),
    reasoning: z.boolean().optional(),
    attachment: z.boolean().optional(),
    toolcall: z.boolean().optional(),
  }).optional(),
});

export const MimoProvidersResponseSchema = z.object({
  providers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      env: z.array(z.string()).default([]),
      options: z.record(z.string(), z.unknown()).default({}),
      source: z.string(),
      models: z.record(z.string(), MimoModelSchema),
    })
  ),
  default: z.record(z.string(), z.string()),
});

export type MimoProvidersResponse = z.infer<typeof MimoProvidersResponseSchema>;

export interface MimoCredential {
  type: string;
  key: string;
  metadata?: Record<string, unknown>;
}

export class MimoClientError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'MimoClientError';
  }
}

export class MimoLocalClient {
  constructor(private baseUrl: string, private password: string) {}

  private getAuthHeader(): string {
    const user = process.env.MIMOCODE_SERVER_USERNAME || 'mimocode';
    const token = Buffer.from(`${user}:${this.password}`).toString('base64');
    return `Basic ${token}`;
  }

  private async fetchWithRetry(url: string, init: RequestInit, retries = 1): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const mergedInit: RequestInit = {
      ...init,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: controller.signal,
    };

    try {
      const res = await fetch(url, mergedInit);
      clearTimeout(timeoutId);
      return res;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (retries > 0 && (err.code === 'ECONNREFUSED' || err.name === 'AbortError' || err.message?.includes('fetch failed'))) {
        await new Promise((r) => setTimeout(r, 500));
        return this.fetchWithRetry(url, init, retries - 1);
      }
      throw new MimoClientError(`MimoLocalClient request failed: ${err.message}`);
    }
  }

  async ping(): Promise<boolean> {
    try {
      const res = await this.fetchWithRetry(`${this.baseUrl}/config/providers`, { method: 'GET' }, 0);
      return res.ok;
    } catch {
      return false;
    }
  }

  async getProviders(): Promise<MimoProvidersResponse> {
    const res = await this.fetchWithRetry(`${this.baseUrl}/config/providers`, { method: 'GET' });
    if (!res.ok) {
      throw new MimoClientError(`Failed to fetch providers from local serve: status ${res.status}`, res.status);
    }
    const json = await res.json();
    const parsed = MimoProvidersResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new MimoClientError(`Invalid providers response schema: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  async putAuth(providerId: string, cred: MimoCredential): Promise<boolean> {
    const res = await this.fetchWithRetry(`${this.baseUrl}/auth/${encodeURIComponent(providerId)}`, {
      method: 'PUT',
      body: JSON.stringify(cred),
    });
    if (!res.ok) {
      throw new MimoClientError(`Failed to put credential for ${providerId}: status ${res.status}`, res.status);
    }
    const data = await res.json().catch(() => true);
    return Boolean(data);
  }

  async deleteAuth(providerId: string): Promise<boolean> {
    // Probe DELETE /auth/:id first
    try {
      const res = await this.fetchWithRetry(`${this.baseUrl}/auth/${encodeURIComponent(providerId)}`, {
        method: 'DELETE',
      });
      if (res.ok) return true;
    } catch {
      // Fallback to direct auth.json file rewrite if endpoint not supported
    }

    const paths = getRuntimePaths();
    assertPathInsideRuntime(paths.authFile);

    if (fs.existsSync(paths.authFile)) {
      try {
        const raw = fs.readFileSync(paths.authFile, 'utf-8');
        const authObj = JSON.parse(raw);
        if (authObj[providerId]) {
          delete authObj[providerId];
          fs.writeFileSync(paths.authFile, JSON.stringify(authObj, null, 2), { encoding: 'utf-8', mode: 0o600 });
          return true;
        }
      } catch (err: any) {
        throw new MimoClientError(`Failed to remove auth key from disk for ${providerId}: ${err.message}`);
      }
    }
    return false;
  }
}
