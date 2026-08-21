import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * SQLite database connection (better-sqlite3, synchronous).
 * The database file is created lazily inside its parent directory.
 */
let dbInstance: Database.Database | null = null;

function resolveDbPath(): string {
  const dbPath = path.resolve(process.cwd(), env.databasePath);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info({ dir }, 'Created database directory');
  }
  return dbPath;
}

export function getDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = resolveDbPath();
  logger.info({ dbPath }, 'Opening SQLite database');

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  dbInstance = db;
  return db;
}

/** Initialize schema. Safe to call multiple times. */
export function initSchema(): void {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      projectId TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      sessionId TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_brain (
      projectId TEXT PRIMARY KEY NOT NULL,
      version INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL,
      knowledge TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS brain_suggestions (
      id TEXT PRIMARY KEY NOT NULL,
      projectId TEXT NOT NULL,
      target TEXT NOT NULL,
      section TEXT NOT NULL,
      operation TEXT NOT NULL,
      value TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL,
      resolvedAt TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Guarded ALTER: add projectId to sessions if missing (for existing databases)
  const sessionsInfo = db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
  const hasProjectId = sessionsInfo.some(col => col.name === 'projectId');
  if (!hasProjectId) {
    db.exec("ALTER TABLE sessions ADD COLUMN projectId TEXT");
    logger.info('Added projectId column to sessions table');
  }

  // Create indexes after ensuring all columns exist
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_sessionId
      ON messages(sessionId);

    CREATE INDEX IF NOT EXISTS idx_sessions_projectId
      ON sessions(projectId);

    CREATE INDEX IF NOT EXISTS idx_suggestions_projectId
      ON brain_suggestions(projectId);

    CREATE INDEX IF NOT EXISTS idx_suggestions_status
      ON brain_suggestions(status);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  logger.info('Database schema initialized');
}

/** Close the database connection. Intended for graceful shutdown. */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database connection closed');
  }
}

export default getDatabase;