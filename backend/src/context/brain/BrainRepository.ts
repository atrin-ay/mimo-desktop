import { getDatabase } from '../../storage/database';
import type { ProjectBrain, BrainState, BrainKnowledge } from '../types';

interface BrainRow {
  projectId: string;
  version: number;
  state: string;
  knowledge: string;
  updatedAt: string;
}

function defaultBrainState(): BrainState {
  return {
    currentGoal: null,
    currentTask: null,
    currentFile: null,
    nextStep: null,
    activeFeature: null,
    sessionProgress: null,
    tasks: [],
    knownIssues: [],
    updatedAt: new Date().toISOString(),
  };
}

function defaultBrainKnowledge(): BrainKnowledge {
  return {
    overview: null,
    architecture: [],
    decisions: [],
    techChoices: [],
    conventions: [],
    rules: [],
    userPreferences: [],
    updatedAt: new Date().toISOString(),
  };
}

function mapRow(row: BrainRow): ProjectBrain {
  return {
    projectId: row.projectId,
    version: row.version,
    state: JSON.parse(row.state) as BrainState,
    knowledge: JSON.parse(row.knowledge) as BrainKnowledge,
    updatedAt: row.updatedAt,
  };
}

/**
 * Data access for the `project_brain` table.
 */
export const brainRepository = {
  /** Get the brain for a project. Returns null if no brain exists yet. */
  findByProjectId(projectId: string): ProjectBrain | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT projectId, version, state, knowledge, updatedAt FROM project_brain WHERE projectId = ?')
      .get(projectId) as BrainRow | undefined;

    return row ? mapRow(row) : null;
  },

  /** Get or create a brain for a project. Always returns a brain. */
  getOrCreate(projectId: string): ProjectBrain {
    const existing = this.findByProjectId(projectId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const brain: ProjectBrain = {
      projectId,
      version: 0,
      state: defaultBrainState(),
      knowledge: defaultBrainKnowledge(),
      updatedAt: now,
    };

    const db = getDatabase();
    db.prepare(
      'INSERT INTO project_brain (projectId, version, state, knowledge, updatedAt) VALUES (?, ?, ?, ?, ?)',
    ).run(
      brain.projectId,
      brain.version,
      JSON.stringify(brain.state),
      JSON.stringify(brain.knowledge),
      brain.updatedAt,
    );

    return brain;
  },

  /** Save a brain (upsert). Increments version. */
  save(brain: ProjectBrain): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const newVersion = brain.version + 1;

    db.prepare(
      `INSERT INTO project_brain (projectId, version, state, knowledge, updatedAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(projectId) DO UPDATE SET
         version = excluded.version,
         state = excluded.state,
         knowledge = excluded.knowledge,
         updatedAt = excluded.updatedAt`,
    ).run(
      brain.projectId,
      newVersion,
      JSON.stringify(brain.state),
      JSON.stringify(brain.knowledge),
      now,
    );
  },

  /** Delete a brain for a project. */
  delete(projectId: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM project_brain WHERE projectId = ?').run(projectId);
  },
};

export default brainRepository;
