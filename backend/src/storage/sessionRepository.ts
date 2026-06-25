import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import type { Session } from '../types';

interface SessionRow {
  id: string;
  createdAt: string;
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