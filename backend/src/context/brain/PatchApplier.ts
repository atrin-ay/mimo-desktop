import { v4 as uuidv4 } from 'uuid';
import { ProjectBrainModel } from './ProjectBrain';
import { suggestionRepository } from '../suggestions/SuggestionRepository';
import type { MemoryPatch, PatchChange, BrainState, BrainKnowledge } from '../types';
import { logger } from '../../config/logger';

/**
 * Applies a MemoryPatch to a project brain.
 *
 * - target: state → applied immediately
 * - target: knowledge → creates a pending Suggestion (needs approval)
 */
export const patchApplier = {
  /**
   * Apply a validated memory patch to a brain.
   * Returns the number of state changes applied and suggestions created.
   */
  apply(
    brain: ProjectBrainModel,
    patch: MemoryPatch,
  ): { stateApplied: number; suggestionsCreated: number } {
    if (!patch.update) {
      return { stateApplied: 0, suggestionsCreated: 0 };
    }

    let stateApplied = 0;
    let suggestionsCreated = 0;

    for (const change of patch.changes) {
      try {
        if (change.target === 'state') {
          this.applyStateChange(brain, change);
          stateApplied++;
        } else if (change.target === 'knowledge') {
          this.createSuggestion(brain, change, patch.reason);
          suggestionsCreated++;
        }
      } catch (err) {
        logger.error({ err, change }, 'Failed to apply patch change');
      }
    }

    return { stateApplied, suggestionsCreated };
  },

  /** Apply a state change directly to the brain. */
  applyStateChange(brain: ProjectBrainModel, change: PatchChange): void {
    brain.updateState((state) => {
      const { section, operation, value, match } = change;

      switch (section) {
        case 'currentGoal':
        case 'currentTask':
        case 'currentFile':
        case 'nextStep':
        case 'activeFeature':
        case 'sessionProgress':
          if (operation === 'replace' || operation === 'update') {
            (state as unknown as Record<string, unknown>)[section] = value ?? null;
          }
          break;

        case 'tasks':
          this.applyTasksChange(state, operation, value, match);
          break;

        case 'knownIssues':
          this.applyKnownIssuesChange(state, operation, value, match);
          break;

        default:
          logger.warn({ section }, 'Unknown state section');
      }
    });
  },

  /** Apply changes to the tasks array. */
  applyTasksChange(
    state: BrainState,
    operation: string,
    value: unknown,
    match?: Record<string, unknown>,
  ): void {
    switch (operation) {
      case 'append':
        if (typeof value === 'object' && value !== null && 'title' in value) {
          const task = value as { title: string; status?: string };
          state.tasks.push({
            id: uuidv4(),
            title: task.title,
            status: (task.status as BrainState['tasks'][0]['status']) || 'todo',
          });
        }
        break;

      case 'complete':
        if (match && typeof match === 'object') {
          const idx = state.tasks.findIndex((t) => {
            for (const [key, val] of Object.entries(match)) {
              if (t[key as keyof typeof t] !== val) return false;
            }
            return true;
          });
          if (idx !== -1) {
            state.tasks[idx].status = 'done';
          }
        }
        break;

      case 'remove':
        if (match && typeof match === 'object') {
          state.tasks = state.tasks.filter((t) => {
            for (const [key, val] of Object.entries(match)) {
              if (t[key as keyof typeof t] === val) return false;
            }
            return true;
          });
        }
        break;
    }
  },

  /** Apply changes to the knownIssues array. */
  applyKnownIssuesChange(
    state: BrainState,
    operation: string,
    value: unknown,
    match?: Record<string, unknown>,
  ): void {
    switch (operation) {
      case 'append':
        if (typeof value === 'object' && value !== null && 'title' in value) {
          const issue = value as { title: string; severity?: string; status?: string };
          state.knownIssues.push({
            id: uuidv4(),
            title: issue.title,
            severity: (issue.severity as BrainState['knownIssues'][0]['severity']) || 'medium',
            status: (issue.status as BrainState['knownIssues'][0]['status']) || 'open',
          });
        }
        break;

      case 'remove':
        if (match && typeof match === 'object') {
          state.knownIssues = state.knownIssues.filter((i) => {
            for (const [key, val] of Object.entries(match)) {
              if (i[key as keyof typeof i] === val) return false;
            }
            return true;
          });
        }
        break;
    }
  },

  /** Create a suggestion for knowledge changes (needs approval). */
  createSuggestion(brain: ProjectBrainModel, change: PatchChange, reason: string): void {
    suggestionRepository.create({
      projectId: brain.projectId,
      target: change.target,
      section: change.section,
      operation: change.operation,
      value: JSON.stringify(change.value),
      reason,
    });
  },
};

export default patchApplier;
