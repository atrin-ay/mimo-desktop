import { suggestionRepository } from './SuggestionRepository';
import { ProjectBrainModel } from '../brain/ProjectBrain';
import { brainMarkdownWriter } from '../brain/BrainMarkdownWriter';
import type { Suggestion, SuggestionStatus } from '../types';
import { logger } from '../../config/logger';

/**
 * Business logic for managing memory suggestions.
 *
 * Suggestions represent knowledge changes proposed by the Memory Agent
 * that need user approval before being applied to permanent knowledge.
 */
export const suggestionService = {
  /** List pending suggestions for a project. */
  listPending(projectId: string): Suggestion[] {
    return suggestionRepository.listByProject(projectId, 'pending');
  },

  /** List all suggestions for a project. */
  listAll(projectId: string): Suggestion[] {
    return suggestionRepository.listByProject(projectId);
  },

  /** Get a suggestion by id. */
  getSuggestion(id: string): Suggestion | null {
    return suggestionRepository.findById(id);
  },

  /** Approve a suggestion — apply it to the brain's state or knowledge. */
  approve(id: string): boolean {
    const suggestion = suggestionRepository.findById(id);
    if (!suggestion || suggestion.status !== 'pending') {
      return false;
    }

    const brain = ProjectBrainModel.load(suggestion.projectId);

    if (suggestion.target === 'state') {
      brain.updateState((state) => {
        this.applyStateChange(state, suggestion);
      });
    } else {
      brain.updateKnowledge((knowledge) => {
        this.applyKnowledgeChange(knowledge, suggestion);
      });
    }

    // Save brain and mirror
    brain.save();
    brainMarkdownWriter.mirror(brain.data);

    // Mark suggestion as approved
    suggestionRepository.updateStatus(id, 'approved');

    logger.info({ suggestionId: id, projectId: suggestion.projectId, target: suggestion.target }, 'Suggestion approved');
    return true;
  },

  /** Ignore a suggestion — discard it without applying. */
  ignore(id: string): boolean {
    const suggestion = suggestionRepository.findById(id);
    if (!suggestion || suggestion.status !== 'pending') {
      return false;
    }

    suggestionRepository.updateStatus(id, 'ignored');
    logger.info({ suggestionId: id }, 'Suggestion ignored');
    return true;
  },

  /** Apply a state change from a suggestion to the brain's state. */
  applyStateChange(
    state: import('../types').BrainState,
    suggestion: Suggestion,
  ): void {
    const { section, operation, value } = suggestion;
    let parsedValue: unknown;

    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value;
    }

    switch (section) {
      case 'currentGoal':
      case 'currentTask':
      case 'currentFile':
      case 'nextStep':
      case 'activeFeature':
      case 'sessionProgress':
        if (operation === 'replace' || operation === 'update') {
          (state as unknown as Record<string, unknown>)[section] = parsedValue ?? null;
        }
        break;

      case 'tasks':
        this.applyTasksChange(state, operation, parsedValue, suggestion);
        break;

      case 'knownIssues':
        this.applyKnownIssuesChange(state, operation, parsedValue, suggestion);
        break;

      default:
        logger.warn({ section }, 'Unknown state section in suggestion');
    }
  },

  /** Apply changes to the tasks array from a suggestion. */
  applyTasksChange(
    state: import('../types').BrainState,
    operation: string,
    value: unknown,
    suggestion: Suggestion,
  ): void {
    switch (operation) {
      case 'append':
        if (typeof value === 'object' && value !== null && 'title' in value) {
          const task = value as { title: string; status?: string };
          state.tasks.push({
            id: `sug_${suggestion.id}`,
            title: task.title,
            status: (task.status as 'todo' | 'doing' | 'done') || 'todo',
          });
        }
        break;

      case 'complete':
        try {
          const match = JSON.parse(suggestion.value);
          if (match && typeof match === 'object') {
            const idx = state.tasks.findIndex((t) => {
              for (const [key, val] of Object.entries(match)) {
                if ((t as any)[key] !== val) return false;
              }
              return true;
            });
            if (idx !== -1) {
              state.tasks[idx].status = 'done';
            }
          }
        } catch { /* ignore parse errors */ }
        break;

      case 'remove':
        try {
          const match = JSON.parse(suggestion.value);
          if (match && typeof match === 'object') {
            state.tasks = state.tasks.filter((t) => {
              for (const [key, val] of Object.entries(match)) {
                if ((t as any)[key] === val) return false;
              }
              return true;
            });
          }
        } catch { /* ignore parse errors */ }
        break;
    }
  },

  /** Apply changes to the knownIssues array from a suggestion. */
  applyKnownIssuesChange(
    state: import('../types').BrainState,
    operation: string,
    value: unknown,
    suggestion: Suggestion,
  ): void {
    switch (operation) {
      case 'append':
        if (typeof value === 'object' && value !== null && 'title' in value) {
          const issue = value as { title: string; severity?: string; status?: string };
          state.knownIssues.push({
            id: `sug_${suggestion.id}`,
            title: issue.title,
            severity: (issue.severity as 'low' | 'medium' | 'high' | 'critical') || 'medium',
            status: (issue.status as 'open' | 'resolved') || 'open',
          });
        }
        break;

      case 'remove':
        try {
          const match = JSON.parse(suggestion.value);
          if (match && typeof match === 'object') {
            state.knownIssues = state.knownIssues.filter((i) => {
              for (const [key, val] of Object.entries(match)) {
                if ((i as any)[key] === val) return false;
              }
              return true;
            });
          }
        } catch { /* ignore parse errors */ }
        break;
    }
  },

  /** Apply a knowledge change from a suggestion to the brain's knowledge. */
  applyKnowledgeChange(
    knowledge: import('../types').BrainKnowledge,
    suggestion: Suggestion,
  ): void {
    const { section, operation, value } = suggestion;
    let parsedValue: unknown;

    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value;
    }

    switch (section) {
      case 'overview':
        if (operation === 'replace' || operation === 'update') {
          knowledge.overview = parsedValue as string;
        }
        break;

      case 'architecture':
        if (operation === 'add' || operation === 'append') {
          knowledge.architecture.push(parsedValue as import('../types').BrainArchitecture);
        }
        break;

      case 'decisions':
        if (operation === 'add' || operation === 'append') {
          const decision = parsedValue as import('../types').BrainDecision;
          if (!decision.date) {
            decision.date = new Date().toISOString();
          }
          knowledge.decisions.push(decision);
        }
        break;

      case 'techChoices':
        if (operation === 'add' || operation === 'append') {
          knowledge.techChoices.push(parsedValue as import('../types').BrainTechChoice);
        }
        break;

      case 'conventions':
        if (operation === 'add' || operation === 'append') {
          knowledge.conventions.push(parsedValue as string);
        }
        break;

      case 'rules':
        if (operation === 'add' || operation === 'append') {
          knowledge.rules.push(parsedValue as string);
        }
        break;

      case 'userPreferences':
        if (operation === 'add' || operation === 'append') {
          knowledge.userPreferences.push(parsedValue as string);
        }
        break;

      default:
        logger.warn({ section }, 'Unknown knowledge section in suggestion');
    }
  },
};

export default suggestionService;
