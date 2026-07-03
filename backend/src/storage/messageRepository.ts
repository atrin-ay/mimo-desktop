import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import type { Message, MessageRole, ProviderMessage } from '../types';

interface MessageRow {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
}

function mapRow(row: MessageRow): Message {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role as MessageRole,
    content: row.content,
    createdAt: row.createdAt,
  };
}

/**
 * Data access for the `messages` table.
 */
export const messageRepository = {
  /** Insert a message. Returns the created message. */
  create(params: {
    sessionId: string;
    role: MessageRole;
    content: string;
  }): Message {
    const db = getDatabase();
    const message: Message = {
      id: uuidv4(),
      sessionId: params.sessionId,
      role: params.role,
      content: params.content,
      createdAt: new Date().toISOString(),
    };

    db.prepare(
      `INSERT INTO messages (id, sessionId, role, content, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      message.id,
      message.sessionId,
      message.role,
      message.content,
      message.createdAt,
    );

    return message;
  },

  /** Find all messages for a session, ordered chronologically. */
  findBySessionId(sessionId: string): Message[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        `SELECT id, sessionId, role, content, createdAt
         FROM messages
         WHERE sessionId = ?
         ORDER BY createdAt ASC`,
      )
      .all(sessionId) as MessageRow[];

    return rows.map(mapRow);
  },

  /** Find all messages for a session as provider messages (role + content only). */
  findHistoryBySessionId(sessionId: string): ProviderMessage[] {
    return this.findBySessionId(sessionId).map((m) => ({
      role: m.role,
      content: m.content,
    }));
  },

  /** Delete a message by id. Used for rollback when provider generation fails. */
  deleteById(messageId: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
  },
};

export default messageRepository;