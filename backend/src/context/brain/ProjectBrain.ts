import { brainRepository } from './BrainRepository';
import type { ProjectBrain as ProjectBrainType, BrainState, BrainKnowledge } from '../types';

/**
 * Token budget for the brain summary injected into the AI context.
 * Estimated via characters / 4 (standard rough heuristic).
 * Tunable — this is the single source of truth for summary size.
 */
export const BRAIN_SUMMARY_TOKEN_BUDGET = 1500;

/**
 * Estimate token count from text using the characters/4 heuristic.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * High-level model for working with a project's brain.
 * Wraps BrainRepository with convenience methods.
 */
export class ProjectBrainModel {
  private brain: ProjectBrainType;

  private constructor(brain: ProjectBrainType) {
    this.brain = brain;
  }

  /** Load or create a brain for a project. */
  static load(projectId: string): ProjectBrainModel {
    const brain = brainRepository.getOrCreate(projectId);
    return new ProjectBrainModel(brain);
  }

  /** Get the raw brain data. */
  get data(): ProjectBrainType {
    return this.brain;
  }

  /** Get the brain state. */
  get state(): BrainState {
    return this.brain.state;
  }

  /** Get the brain knowledge. */
  get knowledge(): BrainKnowledge {
    return this.brain.knowledge;
  }

  /** Get the project ID. */
  get projectId(): string {
    return this.brain.projectId;
  }

  /** Get the current version. */
  get version(): number {
    return this.brain.version;
  }

  /** Check if the brain has any meaningful content. */
  get hasContent(): boolean {
    const { state, knowledge } = this.brain;
    return !!(
      state.currentGoal ||
      state.currentTask ||
      state.nextStep ||
      state.tasks.length > 0 ||
      knowledge.overview ||
      knowledge.decisions.length > 0 ||
      knowledge.architecture.length > 0
    );
  }

  /** Update the state. */
  updateState(updater: (state: BrainState) => void): void {
    updater(this.brain.state);
    this.brain.state.updatedAt = new Date().toISOString();
    this.brain.updatedAt = new Date().toISOString();
  }

  /** Update the knowledge. */
  updateKnowledge(updater: (knowledge: BrainKnowledge) => void): void {
    updater(this.brain.knowledge);
    this.brain.knowledge.updatedAt = new Date().toISOString();
    this.brain.updatedAt = new Date().toISOString();
  }

  /** Save the brain to the database. */
  save(): void {
    brainRepository.save(this.brain);
  }

  /**
   * Build a compact summary for context injection.
   *
   * Uses a token-budget-aware priority loop: always-free state fields first,
   * then knowledge.overview, then remaining categories in priority order
   * until the budget is exhausted. Every category is eligible — absence
   * from output means budget ran out, not hardcoded exclusion.
   *
   * Priority order (tunable — flag in summary for later adjustment):
   *   1. State fields (always included in full, exempt from budget)
   *   2. knowledge.overview
   *   3. decisions
   *   4. knownIssues
   *   5. techChoices
   *   6. rules
   *   7. conventions
   *   8. architecture
   *   9. userPreferences
   *  10. tasks (active only)
   */
  buildSummary(budget: number = BRAIN_SUMMARY_TOKEN_BUDGET): string {
    const lines: string[] = [];
    const { state, knowledge } = this.brain;
    let tokensUsed = 0;

    const addLine = (line: string): boolean => {
      // Count the line plus its trailing newline separator
      const tokens = estimateTokens(line + '\n');
      if (tokensUsed + tokens > budget) {
        return false;
      }
      lines.push(line);
      tokensUsed += tokens;
      return true;
    };

    // ── Always-free state fields (exempt from budget) ────────────────────
    // These are small, highest-value, lowest-cost — always included in full.
    if (state.currentGoal) {
      lines.push(`Current goal: ${state.currentGoal}`);
    }
    if (state.currentTask) {
      lines.push(`Working on: ${state.currentTask}`);
    }
    if (state.nextStep) {
      lines.push(`Next step: ${state.nextStep}`);
    }
    if (state.activeFeature) {
      lines.push(`Active feature: ${state.activeFeature}`);
    }
    if (state.currentFile) {
      lines.push(`Current file: ${state.currentFile}`);
    }
    if (state.sessionProgress) {
      lines.push(`Progress: ${state.sessionProgress}`);
    }

    // ── Budget-gated categories ──────────────────────────────────────────
    // Helper: add a category with header + items, deferring header until
    // at least one item fits (avoids orphan headers consuming budget).
    const addCategoryLoop = (header: string, items: string[]): void => {
      const headerTokens = estimateTokens(header + '\n');
      let headerAdded = false;
      for (const item of items) {
        if (!headerAdded) {
          if (tokensUsed + headerTokens + estimateTokens(item + '\n') > budget) {
            return; // Can't fit header + first item
          }
          lines.push(header);
          tokensUsed += headerTokens;
          headerAdded = true;
        }
        if (!addLine(item)) break;
      }
    };

    // Category 1: overview (high-value, usually short)
    if (knowledge.overview) {
      addLine(`Project: ${knowledge.overview}`);
    }

    // Category 2: decisions (recent first)
    if (knowledge.decisions.length > 0) {
      const recentDecisions = knowledge.decisions.slice(-3);
      addCategoryLoop('Recent decisions:', recentDecisions.map(d => `  - ${d.title}: ${d.rationale}`));
    }

    // Category 3: knownIssues (open only) — lives on state, not knowledge
    const openIssues = state.knownIssues.filter(i => i.status === 'open');
    if (openIssues.length > 0) {
      addCategoryLoop('Known issues:', openIssues.map(i => `  - [${i.severity}] ${i.title}`));
    }

    // Category 4: techChoices
    if (knowledge.techChoices.length > 0) {
      addCategoryLoop('Tech choices:', knowledge.techChoices.map(tc => `  - ${tc.area}: ${tc.choice} (${tc.reason})`));
    }

    // Category 5: rules
    if (knowledge.rules.length > 0) {
      addCategoryLoop('Rules:', knowledge.rules.map(r => `  - ${r}`));
    }

    // Category 6: conventions
    if (knowledge.conventions.length > 0) {
      addCategoryLoop('Conventions:', knowledge.conventions.map(c => `  - ${c}`));
    }

    // Category 7: architecture
    if (knowledge.architecture.length > 0) {
      addCategoryLoop('Architecture:', knowledge.architecture.map(a => `  - ${a.title}: ${a.detail}`));
    }

    // Category 8: userPreferences
    if (knowledge.userPreferences.length > 0) {
      addCategoryLoop('User preferences:', knowledge.userPreferences.map(p => `  - ${p}`));
    }

    // Category 9: tasks (active only)
    const activeTasks = state.tasks.filter(t => t.status !== 'done');
    if (activeTasks.length > 0) {
      addCategoryLoop('Open tasks:', activeTasks.slice(0, 5).map(t => `  - [${t.status}] ${t.title}`));
    }

    return lines.join('\n');
  }
}

export default ProjectBrainModel;
