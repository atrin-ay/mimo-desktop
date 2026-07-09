import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import type { Project } from '../types';

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    status: row.status as 'active' | 'archived',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Data access for the `projects` table.
 */
export const projectRepository = {
  /** Create a new project. Returns the created project. */
  create(name: string): Project {
    const db = getDatabase();
    const now = new Date().toISOString();
    const project: Project = {
      id: uuidv4(),
      name,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    db.prepare(
      'INSERT INTO projects (id, name, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
    ).run(project.id, project.name, project.status, project.createdAt, project.updatedAt);

    return project;
  },

  /** Find a project by id. Returns null when not found. */
  findById(id: string): Project | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT id, name, status, createdAt, updatedAt FROM projects WHERE id = ?')
      .get(id) as ProjectRow | undefined;

    return row ? mapRow(row) : null;
  },

  /** Find or create a project by name. Used for auto-assigning sessions. */
  findOrCreate(name: string): Project {
    const db = getDatabase();
    const row = db
      .prepare('SELECT id, name, status, createdAt, updatedAt FROM projects WHERE name = ?')
      .get(name) as ProjectRow | undefined;

    if (row) {
      return mapRow(row);
    }

    return this.create(name);
  },

  /** Update a project's name. Returns true if a row was updated. */
  update(id: string, name: string): boolean {
    const db = getDatabase();
    const result = db.prepare(
      'UPDATE projects SET name = ?, updatedAt = ? WHERE id = ?',
    ).run(name, new Date().toISOString(), id);
    return result.changes > 0;
  },

  /** List all active projects. */
  listAll(): Project[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT id, name, status, createdAt, updatedAt FROM projects WHERE status = ? ORDER BY updatedAt DESC')
      .all('active') as ProjectRow[];

    return rows.map(mapRow);
  },

  /** Get the project id for a session. Returns null if session has no project. */
  getProjectForSession(sessionId: string): string | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT projectId FROM sessions WHERE id = ?')
      .get(sessionId) as { projectId: string | null } | undefined;

    return row?.projectId ?? null;
  },

  /** Assign a session to a project. */
  assignSession(sessionId: string, projectId: string): void {
    const db = getDatabase();
    db.prepare('UPDATE sessions SET projectId = ? WHERE id = ?').run(projectId, sessionId);
  },
};

export default projectRepository;
