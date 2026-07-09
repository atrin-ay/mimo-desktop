import { sessionRepository } from '../storage/sessionRepository';
import { messageRepository } from '../storage/messageRepository';
import { ConflictError, NotFoundError } from '../middleware/errors';
import { logger } from '../config/logger';
import { getRequestContext } from '../middleware/requestContext';
import type { Session, SessionWithMessages } from '../types';
import type { SessionSummary } from '../storage/sessionRepository';

/**
 * Business logic for chat sessions.
 */
export const sessionService = {
  /** List all sessions with metadata, most recent activity first. */
  listSessions(): SessionSummary[] {
    return sessionRepository.listAll();
  },

  /** Create a new session. */
  createSession(id?: string): Session {
    if (id) {
      const existing = sessionRepository.findById(id);
      if (existing) {
        throw new ConflictError(`Session with id "${id}" already exists`);
      }
    }

    const session = sessionRepository.create(id);
    const requestContext = getRequestContext();
    logger.info(
      {
        sessionId: session.id,
        requestId: requestContext?.requestId,
      },
      'Session created',
    );
    return session;
  },

  /** Get a session by id, including its messages. */
  getSession(id: string): SessionWithMessages {
    const session = sessionRepository.findById(id);
    if (!session) {
      throw new NotFoundError(`Session with id "${id}" not found`);
    }

    const messages = messageRepository.findBySessionId(id);
    return { session, messages };
  },

  /** Delete a session by id (cascades to its messages). */
  deleteSession(id: string): void {
    const exists = sessionRepository.findById(id);
    if (!exists) {
      throw new NotFoundError(`Session with id "${id}" not found`);
    }

    sessionRepository.delete(id);
    logger.info({ sessionId: id }, 'Session deleted');
  },
};

export default sessionService;