import { sessionRepository } from '../storage/sessionRepository';
import { messageRepository } from '../storage/messageRepository';
import { getDatabase } from '../storage/database';
import { getProvider } from '../providers';
import { NotFoundError, InternalServerError } from '../middleware/errors';
import { logger } from '../config/logger';
import type { ChatResponse, Message, ProviderMessage } from '../types';

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
  async sendMessage(sessionId: string, userContent: string, mode?: string): Promise<ChatResponse> {
    // 1. Ensure the session exists.
    const session = sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError(`Session with id "${sessionId}" not found`);
    }

    // 2. Build the conversation history including the incoming user message.
    const history = messageRepository.findHistoryBySessionId(sessionId);
    const requestHistory: ProviderMessage[] = [
      ...history,
      { role: 'user', content: userContent },
    ];
    const trimmedHistory = trimHistory(requestHistory, 40);

    // 3. Ask the provider for a reply.
    const provider = getProvider();
    let result;
    try {
      result = await provider.sendMessage(trimmedHistory, mode);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      logger.error(
        { err, sessionId, provider: provider.name },
        'Provider failed to generate a response',
      );

      throw new InternalServerError(
        detail || 'AI provider failed to generate a response',
        { provider: provider.name },
      );
    }

    // 4. Persist both messages atomically.
    const db = getDatabase();
    const insertMessages = db.transaction(() => {
      messageRepository.create({
        sessionId,
        role: 'user',
        content: userContent,
      });
      return messageRepository.create({
        sessionId,
        role: 'assistant',
        content: result.content,
      });
    });

    const assistantMessage: Message = insertMessages();

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

function trimHistory(messages: ProviderMessage[], maxMessages: number): ProviderMessage[] {
  if (messages.length <= maxMessages) {
    return messages;
  }

  return messages.slice(messages.length - maxMessages);
}

export default chatService;