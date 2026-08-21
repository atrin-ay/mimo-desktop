import { sessionRepository } from '../storage/sessionRepository';
import { messageRepository } from '../storage/messageRepository';
import { getDatabase } from '../storage/database';
import { getProvider } from '../providers';
import { contextManager } from '../context/ContextManager';
import { NotFoundError, HttpError } from '../middleware/errors';
import { logger } from '../config/logger';
import type { ChatResponse, Message, MiMoAgent, ProviderMessage } from '../types';

/**
 * Business logic for the chat endpoint.
 *
 * Flow:
 *   1. Validate that the session exists.
 *   2. Ensure the session is assigned to a project.
 *   3. Build context injection from brain (if available).
 *   4. Persist the incoming user message.
 *   5. Load the full conversation history.
 *   6. Send the history to the active AI provider.
 *   7. Persist the assistant response.
 *   8. Fire-and-forget memory update.
 *   9. Return the assistant message.
 */
export const chatService = {
  async sendMessage(sessionId: string, userContent: string, agent?: MiMoAgent, model?: string): Promise<ChatResponse> {
    // 1. Ensure the session exists.
    const session = sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError(`Session with id "${sessionId}" not found`);
    }

    // 2. Ensure the session is assigned to a project (auto-assign if needed).
    const projectId = contextManager.ensureProjectForSession(sessionId);

    // 3. Build context injection from brain (if available).
    const contextInjection = contextManager.buildInjection(projectId);

    // 4. Build the conversation history including the incoming user message.
    const history = messageRepository.findHistoryBySessionId(sessionId);
    const trimmedHistory = trimHistory([
      ...history,
      { role: 'user', content: userContent },
    ], 40);

    // 5. Prepend context injection AFTER trimming so it's never removed.
    const requestHistory: ProviderMessage[] = [
      ...(contextInjection ? [contextInjection] : []),
      ...trimmedHistory,
    ];

    // 6. Ask the provider for a reply.
    const provider = getProvider();
    let result;
    try {
      result = await provider.sendMessage(sessionId, requestHistory, agent, model);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      logger.error(
        { err, sessionId, provider: provider.name },
        'Provider failed to generate a response',
      );

      // Map known failure types to appropriate HTTP status codes with safe
      // generic messages. Full error detail is logged server-side only.
      const lower = detail.toLowerCase();
      if (/timeout|timed out/i.test(lower)) {
        throw new HttpError(504, 'TIMEOUT', 'The AI provider timed out. Please try again.', { provider: provider.name });
      }
      if (/rate.?limit|429|too many requests/i.test(lower)) {
        throw new HttpError(429, 'RATE_LIMITED', 'Too many requests. Please wait and try again.', { provider: provider.name });
      }
      if (/connection refused|econnrefused|econnreset|fetch failed/i.test(lower)) {
        throw new HttpError(502, 'PROVIDER_UNAVAILABLE', 'The AI provider is temporarily unavailable.', { provider: provider.name });
      }

      throw new HttpError(500, 'PROVIDER_ERROR', 'AI provider failed to generate a response.', { provider: provider.name });
    }

    // 7. Persist both messages atomically.
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

    // 8. Fire-and-forget memory update (never blocks the response).
    contextManager.afterExchange(projectId, sessionId, userContent, result.content);

    // 9. Return the response.
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