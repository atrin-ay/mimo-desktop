import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
}

function loadEnv(): EnvConfig {
  const port = parseInt(process.env.PORT ?? '3001', 10);
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const corsOrigins = parseCorsOrigin(process.env.CORS_ORIGIN);
  const logLevel = process.env.LOG_LEVEL ?? 'info';
  const databasePath = process.env.DATABASE_PATH ?? './data/mimo.db';
  const aiProvider = process.env.AI_PROVIDER ?? (process.env.MIMO_API_KEY ? 'mimo' : 'mock');
  const mimoApiKey = process.env.MIMO_API_KEY ?? '';
  const mimoBaseUrl = process.env.MIMO_BASE_URL ?? 'https://api.siliconflow.cn/v1';
  const mimoModel = process.env.MIMO_MODEL ?? 'Qwen/Qwen3-8B';
  // Context Manager config
  const contextManagerEnabled = process.env.CONTEXT_MANAGER_ENABLED !== 'false';
  const memoryProvider = process.env.MEMORY_PROVIDER ?? 'chat-adapter';
  const memoryModel = process.env.MEMORY_MODEL ?? '';
  const memoryDebounceMs = parseInt(process.env.MEMORY_DEBOUNCE_MS ?? '8000', 10);
  const memoryWindowSize = parseInt(process.env.MEMORY_WINDOW_SIZE ?? '12', 10);

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
  };
}

export const env = loadEnv();

export default env;
