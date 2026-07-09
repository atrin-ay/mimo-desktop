import { getMemoryProvider } from '../providers';
import { ProjectBrainModel } from '../brain/ProjectBrain';
import { patchApplier } from '../brain/PatchApplier';
import { brainMarkdownWriter } from '../brain/BrainMarkdownWriter';
import { messageRepository } from '../../storage/messageRepository';
import { buildMemoryAgentPrompt } from './prompt';
import { safeValidateMemoryPatch } from '../schemas';
import type { MemoryPatch } from '../types';
import { logger } from '../../config/logger';

const DEFAULT_WINDOW_SIZE = 12;

interface RunContext {
  projectId: string;
  sessionId: string;
  userContent: string;
  assistantContent: string;
}

/**
 * The Memory Agent.
 *
 * Assembles context from (current brain + recent window + task ctx) ONLY,
 * calls the MemoryProvider, parses a validated MemoryPatch, and applies changes.
 * Never sees full history.
 */
export const memoryAgent = {
  /**
   * Run the memory agent for an exchange.
   *
   * @param context - The exchange context (projectId, sessionId, messages)
   * @param windowSize - Number of recent messages to include
   */
  async run(
    context: RunContext,
    windowSize = DEFAULT_WINDOW_SIZE,
  ): Promise<{ applied: boolean; patch?: MemoryPatch }> {
    const { projectId, sessionId } = context;

    try {
      // 1. Load the brain
      const brain = ProjectBrainModel.load(projectId);

      // 2. Load recent messages (excluding the current exchange which is in context)
      const recentMessages = messageRepository
        .findHistoryBySessionId(sessionId)
        .slice(-windowSize)
        .map((m) => ({ role: m.role, content: m.content }));

      // Add the current exchange
      recentMessages.push(
        { role: 'user', content: context.userContent },
        { role: 'assistant', content: context.assistantContent },
      );

      // 3. Build the prompt
      const prompt = buildMemoryAgentPrompt(brain.data, recentMessages);

      // 4. Call the memory provider
      const provider = getMemoryProvider();
      const response = await provider.complete(prompt);

      // 5. Parse and validate the response
      const patch = safeValidateMemoryPatch(response);
      if (!patch) {
        logger.warn({ projectId, response: response.substring(0, 200) }, 'Invalid memory patch');
        return { applied: false };
      }

      // 6. Apply the patch
      const result = patchApplier.apply(brain, patch);

      // 7. Save brain if state was applied
      if (result.stateApplied > 0) {
        brain.save();
        brainMarkdownWriter.mirror(brain.data);
      }

      logger.info(
        {
          projectId,
          stateApplied: result.stateApplied,
          suggestionsCreated: result.suggestionsCreated,
        },
        'Memory agent completed',
      );

      return { applied: result.stateApplied > 0 || result.suggestionsCreated > 0, patch };
    } catch (err) {
      logger.error({ err, projectId }, 'Memory agent failed');
      return { applied: false };
    }
  },
};

export default memoryAgent;
