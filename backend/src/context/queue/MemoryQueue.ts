import { logger } from '../../config/logger';

const DEFAULT_DEBOUNCE_MS = 8000;

interface QueuedItem {
  projectId: string;
  sessionId: string;
  userContent: string;
  assistantContent: string;
  enqueuedAt: number;
}

interface ProjectQueue {
  items: QueuedItem[];
  timer: ReturnType<typeof setTimeout> | null;
  isRunning: boolean;
  isDirty: boolean;
}

/**
 * Per-project debounce + coalescing queue for memory updates.
 *
 * Bursts within MEMORY_DEBOUNCE_MS collapse into one run.
 * Single in-flight run per project (mutex).
 * Re-runs if marked dirty mid-flight.
 */
export class MemoryQueue {
  private queues: Map<string, ProjectQueue> = new Map();
  private debounceMs: number;
  private processor: (item: QueuedItem) => Promise<void>;

  constructor(
    processor: (item: QueuedItem) => Promise<void>,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  ) {
    this.processor = processor;
    this.debounceMs = debounceMs;
  }

  /**
   * Enqueue an exchange for processing.
   * Collapses multiple items within the debounce window.
   */
  enqueue(
    projectId: string,
    sessionId: string,
    userContent: string,
    assistantContent: string,
  ): void {
    let queue = this.queues.get(projectId);

    if (!queue) {
      queue = { items: [], timer: null, isRunning: false, isDirty: false };
      this.queues.set(projectId, queue);
    }

    // Add item to queue
    queue.items.push({
      projectId,
      sessionId,
      userContent,
      assistantContent,
      enqueuedAt: Date.now(),
    });

    // Mark as dirty if we're currently running
    if (queue.isRunning) {
      queue.isDirty = true;
    }

    // Reset debounce timer
    if (queue.timer) {
      clearTimeout(queue.timer);
    }

    queue.timer = setTimeout(() => {
      this.processQueue(projectId);
    }, this.debounceMs);

    logger.debug(
      { projectId, queueLength: queue.items.length },
      'Exchange enqueued for memory processing',
    );
  }

  /** Process the queue for a project with safe loop. */
  private async processQueue(projectId: string): Promise<void> {
    const queue = this.queues.get(projectId);
    if (!queue || queue.isRunning || queue.items.length === 0) {
      return;
    }

    queue.isRunning = true;

    try {
      // Process in a loop to handle items added during processing
      while (queue.items.length > 0) {
        queue.isDirty = false;

        // Take all items (coalesced)
        const items = queue.items.splice(0);
        const lastItem = items[items.length - 1];

        logger.info(
          { projectId, itemCount: items.length },
          'Processing memory queue (coalesced)',
        );

        await this.processor(lastItem);
      }
    } catch (err) {
      logger.error({ err, projectId }, 'Memory queue processing failed');
    } finally {
      queue.isRunning = false;

      // If items were added while we were finishing, schedule a new run
      if (queue.items.length > 0) {
        queue.timer = setTimeout(() => {
          this.processQueue(projectId);
        }, this.debounceMs);
      }
    }
  }

  /** Get queue stats for a project. */
  getStats(projectId: string): { pending: number; isRunning: boolean } {
    const queue = this.queues.get(projectId);
    return {
      pending: queue?.items.length ?? 0,
      isRunning: queue?.isRunning ?? false,
    };
  }

  /** Clear the queue for a project. */
  clear(projectId: string): void {
    const queue = this.queues.get(projectId);
    if (queue?.timer) {
      clearTimeout(queue.timer);
    }
    this.queues.delete(projectId);
  }

  /** Clear all queues. */
  clearAll(): void {
    for (const queue of this.queues.values()) {
      if (queue.timer) {
        clearTimeout(queue.timer);
      }
    }
    this.queues.clear();
  }
}

export default MemoryQueue;
