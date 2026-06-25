import { sessionRepository } from '../storage/sessionRepository';
import { messageRepository } from '../storage/messageRepository';
import { getProvider } from '../providers';
import { NotFoundError, InternalServerError } from '../middleware/errors';
import { logger } from '../config/logger';
import type { ChatResponse, Message } from '../types';

/**
 * Business logic for the chat endpoint.
 *
 * Flow:
 *   1. Validate that the session exists.
 *   2. Persist the incoming user message.
 *   3. Load the full conversation history.
 *   4. Send the history to the active AI provider.
 *   5. Persist the assistant response.
 *   6. Return the assistant message.
 */
export const chatService = {
  async sendMessage(sessionId: string, userContent: string): Promise<ChatResponse> {
    // 1. Ensure the session exists.
    const session = sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError(`Session with id "${sessionId}" not found`);
    }

    // 2. Persist the user message.
    messageRepository.create({
      sessionId,
      role: 'user',
      content: userContent,
    });

    // 3. Load full history (now includes the user message just stored).
    const history = messageRepository.findHistoryBySessionId(sessionId);

    // 4. Ask the provider for a reply.
    const provider = getProvider();
    let result;
    try {
      result = await provider.sendMessage(history);
    } catch (err) {
      logger.error(
        { err, sessionId, provider: provider.name },
        'Provider failed to generate a response',
      );
      throw new InternalServerError(
        'AI provider failed to generate a response',
        { provider: provider.name },
      );
    }

    // 5. Persist the assistant response.
    const assistantMessage: Message = messageRepository.create({
      sessionId,
      role: 'assistant',
      content: result.content,
    });

    logger.info(
      { sessionId, messageId: assistantMessage.id, provider: provider.name },
      'Assistant response stored',
    );

    // 6. Return the response.
    return {
      sessionId,
      message: assistantMessage,
    };
  },
};

export default chatService;