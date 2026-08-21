import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProjectBrain, BrainState, BrainKnowledge } from '../../types';

// ─── Mocks (vi.mock is hoisted, so define mock object via vi.hoisted) ────────

const { mockBrainRepository } = vi.hoisted(() => ({
  mockBrainRepository: {
    getOrCreate: vi.fn(),
    save: vi.fn(),
  },
}));

vi.mock('../BrainRepository', () => ({
  brainRepository: mockBrainRepository,
}));

// Import after mocks
import { ProjectBrainModel, BRAIN_SUMMARY_TOKEN_BUDGET } from '../ProjectBrain';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeBrain(overrides: Partial<ProjectBrain> = {}): ProjectBrain {
  const now = new Date().toISOString();
  const defaultState: BrainState = {
    currentGoal: null,
    currentTask: null,
    currentFile: null,
    nextStep: null,
    activeFeature: null,
    sessionProgress: null,
    tasks: [],
    knownIssues: [],
    updatedAt: now,
  };
  const defaultKnowledge: BrainKnowledge = {
    overview: null,
    architecture: [],
    decisions: [],
    techChoices: [],
    conventions: [],
    rules: [],
    userPreferences: [],
    updatedAt: now,
  };

  return {
    projectId: 'test-project',
    version: 0,
    state: defaultState,
    knowledge: defaultKnowledge,
    updatedAt: now,
    ...overrides,
  };
}

function loadBrain(brain: ProjectBrain): ProjectBrainModel {
  mockBrainRepository.getOrCreate.mockReturnValue(brain);
  return ProjectBrainModel.load(brain.projectId);
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ProjectBrainModel.buildSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 4a: All knowledge categories populated ──────────────────────────
  it('includes content from every populated category (no hardcoded exclusions)', () => {
    const brain = makeBrain({
      state: {
        currentGoal: 'Ship Phase 3',
        currentTask: 'Rewrite buildSummary',
        currentFile: 'ProjectBrain.ts',
        nextStep: 'Write tests',
        activeFeature: 'Brain injection',
        sessionProgress: 'Halfway done',
        tasks: [
          { id: '1', title: 'Task A', status: 'doing' },
          { id: '2', title: 'Task B', status: 'todo' },
        ],
        knownIssues: [
          { id: 'i1', title: 'Memory leak in orb', severity: 'high', status: 'open' },
        ],
        updatedAt: new Date().toISOString(),
      },
      knowledge: {
        overview: 'A desktop AI assistant',
        architecture: [
          { title: 'Provider pattern', detail: 'Strategy pattern for AI backends' },
        ],
        decisions: [
          { title: 'Use SQLite', rationale: 'Single-user desktop app', date: '2026-07-20' },
          { title: 'SSE streaming', rationale: 'Real-time updates', date: '2026-07-21' },
        ],
        techChoices: [
          { area: 'Database', choice: 'better-sqlite3', reason: 'Sync API, no server needed' },
        ],
        conventions: ['No comments unless WHY is non-obvious'],
        rules: ['All Brain changes require Suggestion approval'],
        userPreferences: ['Dark theme preferred'],
        updatedAt: new Date().toISOString(),
      },
    });

    const model = loadBrain(brain);
    const summary = model.buildSummary();

    // State fields (always included)
    expect(summary).toContain('Current goal: Ship Phase 3');
    expect(summary).toContain('Working on: Rewrite buildSummary');
    expect(summary).toContain('Current file: ProjectBrain.ts');
    expect(summary).toContain('Next step: Write tests');
    expect(summary).toContain('Active feature: Brain injection');
    expect(summary).toContain('Progress: Halfway done');

    // Knowledge categories (all should be present)
    expect(summary).toContain('Project: A desktop AI assistant');
    expect(summary).toContain('Recent decisions:');
    expect(summary).toContain('Use SQLite');
    expect(summary).toContain('SSE streaming');
    expect(summary).toContain('Known issues:');
    expect(summary).toContain('Memory leak in orb');
    expect(summary).toContain('Tech choices:');
    expect(summary).toContain('better-sqlite3');
    expect(summary).toContain('Rules:');
    expect(summary).toContain('All Brain changes require Suggestion approval');
    expect(summary).toContain('Conventions:');
    expect(summary).toContain('No comments unless WHY is non-obvious');
    expect(summary).toContain('Architecture:');
    expect(summary).toContain('Provider pattern');
    expect(summary).toContain('User preferences:');
    expect(summary).toContain('Dark theme preferred');
    expect(summary).toContain('Open tasks:');
    expect(summary).toContain('Task A');
    expect(summary).toContain('Task B');
  });

  // ── Test 4b: Budget enforcement ──────────────────────────────────────────
  it('stays under budget when content is deliberately large', () => {
    // State fields are exempt from budget, so keep them short.
    // The budget pressure comes from knowledge categories.
    const longString = 'A'.repeat(800); // ~200 tokens per line
    const brain = makeBrain({
      state: {
        currentGoal: 'Short goal',
        currentTask: 'Short task',
        currentFile: null,
        nextStep: 'Short step',
        activeFeature: null,
        sessionProgress: null,
        tasks: Array.from({ length: 20 }, (_, i) => ({
          id: String(i),
          title: `Task ${i}: ${'B'.repeat(200)}`,
          status: 'todo' as const,
        })),
        knownIssues: [],
        updatedAt: new Date().toISOString(),
      },
      knowledge: {
        overview: longString,
        architecture: Array.from({ length: 10 }, (_, i) => ({
          title: `Arch ${i}`,
          detail: 'C'.repeat(500),
        })),
        decisions: Array.from({ length: 10 }, (_, i) => ({
          title: `Decision ${i}`,
          rationale: 'D'.repeat(400),
          date: '2026-07-20',
        })),
        techChoices: Array.from({ length: 10 }, (_, i) => ({
          area: `Area ${i}`,
          choice: `Choice ${i}`,
          reason: 'E'.repeat(300),
        })),
        conventions: Array.from({ length: 10 }, (_, i) => `Convention ${i}: ${'F'.repeat(200)}`),
        rules: Array.from({ length: 10 }, (_, i) => `Rule ${i}: ${'G'.repeat(200)}`),
        userPreferences: Array.from({ length: 10 }, (_, i) => `Pref ${i}: ${'H'.repeat(200)}`),
        updatedAt: new Date().toISOString(),
      },
    });

    const model = loadBrain(brain);
    const summary = model.buildSummary();

    // (i) All state fields still included in full (exempt from budget)
    expect(summary).toContain('Current goal: Short goal');
    expect(summary).toContain('Working on: Short task');
    expect(summary).toContain('Next step: Short step');

    // (ii) Summary stays under the configured budget
    const actualTokens = estimateTokens(summary);
    expect(actualTokens).toBeLessThanOrEqual(BRAIN_SUMMARY_TOKEN_BUDGET);

    // (iii) At least some content from lower-priority categories is included
    // (decisions come before architecture in priority, so decisions should appear)
    expect(summary).toContain('Recent decisions:');
  });

  it('includes all state fields even when budget is very tight', () => {
    const brain = makeBrain({
      state: {
        currentGoal: 'Goal',
        currentTask: 'Task',
        currentFile: 'file.ts',
        nextStep: 'Step',
        activeFeature: 'Feature',
        sessionProgress: 'Progress',
        tasks: [],
        knownIssues: [],
        updatedAt: new Date().toISOString(),
      },
    });

    const model = loadBrain(brain);
    // Use a budget that would be tight for knowledge but state is exempt
    const summary = model.buildSummary(50);

    expect(summary).toContain('Current goal: Goal');
    expect(summary).toContain('Working on: Task');
    expect(summary).toContain('Current file: file.ts');
    expect(summary).toContain('Next step: Step');
    expect(summary).toContain('Active feature: Feature');
    expect(summary).toContain('Progress: Progress');
  });

  it('returns empty string for a brain with no content', () => {
    const brain = makeBrain();
    const model = loadBrain(brain);
    const summary = model.buildSummary();
    expect(summary).toBe('');
  });

  it('respects custom budget parameter', () => {
    const brain = makeBrain({
      knowledge: {
        overview: 'Test project',
        architecture: [],
        decisions: [
          { title: 'D1', rationale: 'R1', date: '2026-01-01' },
          { title: 'D2', rationale: 'R2', date: '2026-01-02' },
        ],
        techChoices: [],
        conventions: [],
        rules: [],
        userPreferences: [],
        updatedAt: new Date().toISOString(),
      },
    });

    const model = loadBrain(brain);

    // Very small budget — should include overview but may cut decisions
    const summarySmall = model.buildSummary(20);
    expect(summarySmall).toContain('Project: Test project');

    // Larger budget — should include both decisions
    const summaryLarge = model.buildSummary(200);
    expect(summaryLarge).toContain('D1');
    expect(summaryLarge).toContain('D2');
  });
});

describe('BRAIN_SUMMARY_TOKEN_BUDGET', () => {
  it('is a defined numeric constant', () => {
    expect(typeof BRAIN_SUMMARY_TOKEN_BUDGET).toBe('number');
    expect(BRAIN_SUMMARY_TOKEN_BUDGET).toBeGreaterThan(0);
  });
});
