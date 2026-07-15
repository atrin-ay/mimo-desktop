import { brainRepository } from './BrainRepository';
import type { ProjectBrain as ProjectBrainType, BrainState, BrainKnowledge } from '../types';

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

  /** Build a compact summary for context injection. */
  buildSummary(): string {
    const lines: string[] = [];
    const { state, knowledge } = this.brain;

    if (knowledge.overview) {
      lines.push(`Project: ${knowledge.overview}`);
    }

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

    if (knowledge.decisions.length > 0) {
      const recentDecisions = knowledge.decisions.slice(-3);
      lines.push('Recent decisions:');
      for (const d of recentDecisions) {
        lines.push(`  - ${d.title}: ${d.rationale}`);
      }
    }

    if (state.tasks.length > 0) {
      const activeTasks = state.tasks.filter(t => t.status !== 'done');
      if (activeTasks.length > 0) {
        lines.push('Open tasks:');
        for (const t of activeTasks.slice(0, 5)) {
          lines.push(`  - [${t.status}] ${t.title}`);
        }
      }
    }

    return lines.join('\n');
  }
}

export default ProjectBrainModel;
