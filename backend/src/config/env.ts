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
}

function loadEnv(): EnvConfig {
  const port = parseInt(process.env.PORT ?? '3001', 10);
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const corsOrigins = parseCorsOrigin(process.env.CORS_ORIGIN);
  const logLevel = process.env.LOG_LEVEL ?? 'info';
  const databasePath = process.env.DATABASE_PATH ?? './data/mimo.db';
  const aiProvider = process.env.AI_PROVIDER ?? 'mimo';

  return {
    port,
    nodeEnv,
    corsOrigins,
    logLevel,
    databasePath,
    aiProvider,
  };
}

export const env = loadEnv();

export default env;
