import { env } from '../config/env';
import { projectService } from '../services/projectService';
import { ProjectBrainModel } from './brain/ProjectBrain';
import { brainMarkdownWriter } from './brain/BrainMarkdownWriter';
import { memoryObserver } from './observer/MemoryObserver';
import { MemoryQueue } from './queue/MemoryQueue';
import { memoryAgent } from './agent/MemoryAgent';
import type { ProviderMessage } from '../types';
import { logger } from '../config/logger';

/**
 * Context Manager — the ONLY public surface for chat flow.
 *
 * Provides three operations:
 * 1. ensureProjectForSession(sessionId) — ensure session has a project
 * 2. buildInjection(projectId) — read-only, builds context for the AI
 * 3. afterExchange(projectId, sessionId, user, assistant) — fire-and-forget
 */
export const contextManager = {
  /** The memory queue instance (shared across all projects). */
  _queue: null as MemoryQueue | null,

  /** Get or create the memory queue. */
  getQueue(): MemoryQueue {
    if (!this._queue) {
      this._queue = new MemoryQueue(
        async (item) => {
          await memoryAgent.run({
            projectId: item.projectId,
            sessionId: item.sessionId,
            userContent: item.userContent,
            assistantContent: item.assistantContent,
          });
        },
        env.memoryDebounceMs,
      );
    }
    return this._queue;
  },

  /**
   * Ensure a session is assigned to a project.
   * Returns the project ID.
   */
  ensureProjectForSession(sessionId: string): string {
    if (!env.contextManagerEnabled) {
      // Fallback: use default project
      const project = projectService.ensureProjectForSession(sessionId);
      return project.id;
    }

    const project = projectService.ensureProjectForSession(sessionId);
    return project.id;
  },

  /**
   * Build a context injection for the AI provider.
   *
   * This is called before sending messages to the provider.
   * It reads the brain and builds a compact summary.
   *
   * @param projectId - The project to get context for
   * @returns ProviderMessage to prepend, or null if no context
   */
  buildInjection(projectId: string): ProviderMessage | null {
    if (!env.contextManagerEnabled) {
      return null;
    }

    try {
      // Load the brain
      const brain = ProjectBrainModel.load(projectId);

      if (!brain.hasContent) {
        return null;
      }

      // Build the summary
      const content = brain.buildSummary();

      return {
        role: 'context',
        content,
        metadata: { type: 'project_context', projectId },
      };
    } catch (err) {
      logger.error({ err, projectId }, 'Failed to build context injection');
      return null;
    }
  },

  /**
   * Process an exchange after it's been persisted.
   *
   * This is fire-and-forget — it never blocks the HTTP response.
   * It evaluates the exchange and, if worthy, enqueues it for memory processing.
   *
   * @param projectId - The project ID
   * @param sessionId - The session ID
   * @param userContent - The user's message
   * @param assistantContent - The assistant's response
   */
  afterExchange(
    projectId: string,
    sessionId: string,
    userContent: string,
    assistantContent: string,
  ): void {
    if (!env.contextManagerEnabled) {
      return;
    }

    // Fire-and-forget — catch and log any errors
    try {
      // Evaluate the exchange
      const { shouldUpdate, signals } = memoryObserver.evaluate(
        userContent,
        assistantContent,
      );

      if (!shouldUpdate) {
        logger.debug({ sessionId, signals }, 'Exchange not worthy of memory update');
        return;
      }

      // Enqueue for processing
      const queue = this.getQueue();
      queue.enqueue(projectId, sessionId, userContent, assistantContent);
    } catch (err) {
      logger.error({ err, sessionId }, 'Failed to process afterExchange');
    }
  },

  /**
   * Get the brain for a project (for API responses).
   */
  getBrain(projectId: string): ProjectBrainModel | null {
    if (!env.contextManagerEnabled) {
      return null;
    }

    try {
      return ProjectBrainModel.load(projectId);
    } catch {
      return null;
    }
  },

  /**
   * Get queue stats (for debugging/API).
   */
  getQueueStats(projectId: string): { pending: number; isRunning: boolean } {
    return this.getQueue().getStats(projectId);
  },
};

export default contextManager;
