/**
 * Context Manager (Project Brain) Type Definitions
 *
 * The brain has two layers:
 * - State: Auto-updated, ephemeral (current goal, tasks, progress)
 * - Knowledge: Confirmation-gated, permanent (decisions, architecture, conventions)
 */

// ============================================================
// Brain State (auto-updated, ephemeral)
// ============================================================

export interface BrainTask {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
}

export interface BrainKnownIssue {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'resolved';
}

export interface BrainState {
  currentGoal: string | null;
  currentTask: string | null;
  currentFile: string | null;
  nextStep: string | null;
  activeFeature: string | null;
  sessionProgress: string | null;
  tasks: BrainTask[];
  knownIssues: BrainKnownIssue[];
  updatedAt: string;
}

// ============================================================
// Brain Knowledge (confirmation-gated, permanent)
// ============================================================

export interface BrainArchitecture {
  title: string;
  detail: string;
}

export interface BrainDecision {
  title: string;
  rationale: string;
  date: string;
}

export interface BrainTechChoice {
  area: string;
  choice: string;
  reason: string;
}

export interface BrainKnowledge {
  overview: string | null;
  architecture: BrainArchitecture[];
  decisions: BrainDecision[];
  techChoices: BrainTechChoice[];
  conventions: string[];
  rules: string[];
  userPreferences: string[];
  updatedAt: string;
}

// ============================================================
// Full Brain (state + knowledge)
// ============================================================

export interface ProjectBrain {
  projectId: string;
  version: number;
  state: BrainState;
  knowledge: BrainKnowledge;
  updatedAt: string;
}

// ============================================================
// Memory Patch (incremental updates from Memory Agent)
// ============================================================

export type PatchTarget = 'state' | 'knowledge';
export type PatchOperation = 'replace' | 'append' | 'add' | 'update' | 'remove' | 'complete';

export interface PatchChange {
  target: PatchTarget;
  section: string;
  operation: PatchOperation;
  value?: any;
  match?: Record<string, any>;
}

export interface MemoryPatch {
  update: boolean;
  reason: string;
  changes: PatchChange[];
}

// ============================================================
// Suggestions (knowledge changes pending approval)
// ============================================================

export type SuggestionStatus = 'pending' | 'approved' | 'ignored';

export interface Suggestion {
  id: string;
  projectId: string;
  target: PatchTarget;
  section: string;
  operation: PatchOperation;
  value: string;
  reason: string | null;
  status: SuggestionStatus;
  createdAt: string;
  resolvedAt: string | null;
}

// ============================================================
// Observer Result
// ============================================================

export interface ObserverResult {
  shouldUpdate: boolean;
  signals: string[];
}

// ============================================================
// Memory Provider Interface
// ============================================================

export interface MemoryProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MemoryProviderResult {
  content: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryProviderHealth {
  healthy: boolean;
  provider: string;
  details?: Record<string, unknown>;
}

export interface MemoryProvider {
  readonly name: string;
  complete(messages: MemoryProviderMessage[]): Promise<MemoryProviderResult>;
  healthCheck(): Promise<MemoryProviderHealth>;
}
