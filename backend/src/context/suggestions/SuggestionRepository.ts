import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../storage/database';
import type { Suggestion, SuggestionStatus } from '../types';

interface SuggestionRow {
  id: string;
  projectId: string;
  target: string;
  section: string;
  operation: string;
  value: string;
  reason: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

function mapRow(row: SuggestionRow): Suggestion {
  return {
    id: row.id,
    projectId: row.projectId,
    target: row.target as Suggestion['target'],
    section: row.section,
    operation: row.operation as Suggestion['operation'],
    value: row.value,
    reason: row.reason,
    status: row.status as SuggestionStatus,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
  };
}

interface CreateSuggestionInput {
  projectId: string;
  target: string;
  section: string;
  operation: string;
  value: string;
  reason?: string;
}

/**
 * Data access for the `brain_suggestions` table.
 */
export const suggestionRepository = {
  /** Create a new suggestion. */
  create(input: CreateSuggestionInput): Suggestion {
    const db = getDatabase();
    const now = new Date().toISOString();
    const suggestion: Suggestion = {
      id: uuidv4(),
      projectId: input.projectId,
      target: input.target as Suggestion['target'],
      section: input.section,
      operation: input.operation as Suggestion['operation'],
      value: input.value,
      reason: input.reason ?? null,
      status: 'pending',
      createdAt: now,
      resolvedAt: null,
    };

    db.prepare(
      `INSERT INTO brain_suggestions (id, projectId, target, section, operation, value, reason, status, createdAt, resolvedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      suggestion.id,
      suggestion.projectId,
      suggestion.target,
      suggestion.section,
      suggestion.operation,
      suggestion.value,
      suggestion.reason,
      suggestion.status,
      suggestion.createdAt,
      suggestion.resolvedAt,
    );

    return suggestion;
  },

  /** Find a suggestion by id. */
  findById(id: string): Suggestion | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM brain_suggestions WHERE id = ?')
      .get(id) as SuggestionRow | undefined;

    return row ? mapRow(row) : null;
  },

  /** List suggestions for a project, optionally filtered by status. */
  listByProject(projectId: string, status?: SuggestionStatus): Suggestion[] {
    const db = getDatabase();
    let query = 'SELECT * FROM brain_suggestions WHERE projectId = ?';
    const params: unknown[] = [projectId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY createdAt DESC';

    const rows = db.prepare(query).all(...params) as SuggestionRow[];
    return rows.map(mapRow);
  },

  /** List all pending suggestions across all projects. */
  listPending(): Suggestion[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM brain_suggestions WHERE status = ? ORDER BY createdAt DESC')
      .all('pending') as SuggestionRow[];

    return rows.map(mapRow);
  },

  /** Update a suggestion's status. */
  updateStatus(id: string, status: SuggestionStatus): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();
    const result = db
      .prepare('UPDATE brain_suggestions SET status = ?, resolvedAt = ? WHERE id = ?')
      .run(status, status === 'pending' ? null : now, id);

    return result.changes > 0;
  },

  /** Delete a suggestion. */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM brain_suggestions WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

export default suggestionRepository;
