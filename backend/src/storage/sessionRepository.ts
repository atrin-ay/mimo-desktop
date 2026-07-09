import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import type { Session } from '../types';

interface SessionRow {
  id: string;
  createdAt: string;
}

/** A session enriched with metadata for the sidebar list. */
export interface SessionSummary {
  id: string;
  createdAt: string;
  /** First user message, used as the conversation title. Null when empty. */
  title: string | null;
  messageCount: number;
  /** Timestamp of the most recent message, or createdAt when empty. */
  lastActivityAt: string;
}

interface SessionSummaryRow {
  id: string;
  createdAt: string;
  title: string | null;
  messageCount: number;
  lastActivityAt: string;
}

function mapRow(row: SessionRow): Session {
  return {
    id: row.id,
    createdAt: row.createdAt,
  };
}

/**
 * Data access for the `sessions` table.
 */
export const sessionRepository = {
  /** Create a new session. Returns the created session. */
  create(id?: string): Session {
    const db = getDatabase();
    const session: Session = {
      id: id ?? uuidv4(),
      createdAt: new Date().toISOString(),
    };

    db.prepare(
      'INSERT INTO sessions (id, createdAt) VALUES (?, ?)',
    ).run(session.id, session.createdAt);

    return session;
  },

  /**
   * List all sessions with metadata (title, message count, last activity),
   * ordered by most recent activity first.
   */
  listAll(): SessionSummary[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        `SELECT
           s.id                                       AS id,
           s.createdAt                                AS createdAt,
           COUNT(m.id)                                AS messageCount,
           COALESCE(MAX(m.createdAt), s.createdAt)    AS lastActivityAt,
           (
             SELECT content FROM messages
             WHERE sessionId = s.id AND role = 'user'
             ORDER BY createdAt ASC
             LIMIT 1
           )                                          AS title
         FROM sessions s
         LEFT JOIN messages m ON m.sessionId = s.id
         GROUP BY s.id
         ORDER BY lastActivityAt DESC`,
      )
      .all() as SessionSummaryRow[];

    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      title: r.title ?? null,
      messageCount: Number(r.messageCount),
      lastActivityAt: r.lastActivityAt,
    }));
  },

  /** Find a session by id. Returns null when not found. */
  findById(id: string): Session | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT id, createdAt FROM sessions WHERE id = ?')
      .get(id) as SessionRow | undefined;

    return row ? mapRow(row) : null;
  },

  /** Delete a session by id. Returns true if a row was deleted. */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

export default sessionRepository;