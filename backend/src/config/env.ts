import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Load admin-overrides.json and merge over .env values
const overridesPath = path.resolve(process.cwd(), 'data', 'admin-overrides.json');
try {
  if (fs.existsSync(overridesPath)) {
    const raw = fs.readFileSync(overridesPath, 'utf-8').trim();
    if (raw && raw !== '{}') {
      const overrides = JSON.parse(raw);
      const keys = Object.keys(overrides).filter((k) => typeof overrides[k] === 'string');
      if (keys.length > 0) {
        console.warn(`WARNING: admin-overrides.json is active and overriding ${keys.length} key(s) from .env: [${keys.join(', ')}]`);
        for (const key of keys) {
          process.env[key] = overrides[key];
        }
      }
    }
  }
} catch { /* ignore — overrides are optional */ }

function parseCorsOrigin(raw: string | undefined): string[] {
  if (!raw) {
    return ['http://localhost:3000', 'http://localhost:5173'];
  }
  if (raw.trim() === '*') {
    return ['*'];
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export interface EnvConfig {
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
  logLevel: string;
  databasePath: string;
  aiProvider: string;
  mimoApiKey: string;
  mimoBaseUrl: string;
  mimoModel: string;
  // Context Manager config
  contextManagerEnabled: boolean;
  memoryProvider: string;
  memoryModel: string;
  memoryDebounceMs: number;
  memoryWindowSize: number;
  mimoDebug: boolean;
  // mimo serve config
  mimoServePort: number;
  mimoServerPassword: string;
}

function loadEnv(): EnvConfig {
  const port = parseInt(process.env.PORT ?? '3001', 10);
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const corsOrigins = parseCorsOrigin(process.env.CORS_ORIGIN);
  const logLevel = process.env.LOG_LEVEL ?? 'info';
  const databasePath = process.env.DATABASE_PATH ?? './data/mimo.db';
  let aiProvider = process.env.AI_PROVIDER ?? 'mimo-serve';
  const mimoApiKey = process.env.MIMO_API_KEY ?? '';

  // Safety: if AI_PROVIDER is explicitly 'mimo' but no API key is configured,
  // fall back to mimo-serve rather than starting in a guaranteed-broken state.
  if (aiProvider === 'mimo' && !mimoApiKey) {
    console.warn('WARNING: AI_PROVIDER is set to "mimo" but no MIMO_API_KEY is configured — falling back to mimo-serve');
    aiProvider = 'mimo-serve';
  }
  const mimoBaseUrl = process.env.MIMO_BASE_URL ?? 'https://api.siliconflow.cn/v1';
  const mimoModel = process.env.MIMO_MODEL ?? 'Qwen/Qwen3-8B';
  // Context Manager config
  const contextManagerEnabled = process.env.CONTEXT_MANAGER_ENABLED !== 'false';
  const memoryProvider = process.env.MEMORY_PROVIDER ?? 'chat-adapter';
  const memoryModel = process.env.MEMORY_MODEL ?? '';
  const memoryDebounceMs = parseInt(process.env.MEMORY_DEBOUNCE_MS ?? '8000', 10);
  const memoryWindowSize = parseInt(process.env.MEMORY_WINDOW_SIZE ?? '12', 10);
  const mimoDebug = process.env.MIMO_DEBUG === 'true';
  const mimoServePort = parseInt(process.env.MIMO_SERVE_PORT ?? '0', 10);
  const mimoServerPassword = process.env.MIMO_SERVER_PASSWORD ?? '';

  return {
    port,
    nodeEnv,
    corsOrigins,
    logLevel,
    databasePath,
    aiProvider,
    mimoApiKey,
    mimoBaseUrl,
    mimoModel,
    contextManagerEnabled,
    memoryProvider,
    memoryModel,
    memoryDebounceMs,
    memoryWindowSize,
    mimoDebug,
    mimoServePort,
    mimoServerPassword,
  };
}

export const env = loadEnv();

export default env;
