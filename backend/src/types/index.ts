/**
 * MIMO Backend - Type Definitions
 */

/** Message author role. */
export type MessageRole = 'user' | 'assistant' | 'context';

/** A single chat message persisted in the database. */
export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string; // ISO 8601 timestamp
}

/** A chat session. */
export interface Session {
  id: string;
  createdAt: string; // ISO 8601 timestamp
}

/** A message as required by an AI provider (no DB metadata). */
export interface ProviderMessage {
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
}

/** Result returned by an AI provider after sending a message. */
export interface ProviderResult {
  content: string;
  /** Provider-specific metadata (e.g. model name, token usage). */
  metadata?: Record<string, unknown>;
}

/** Health status of a provider. */
export interface ProviderHealth {
  healthy: boolean;
  provider: string;
  details?: Record<string, unknown>;
}

/** Standard API error shape. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Standard success envelope for single-resource responses. */
export interface ApiResponse<T> {
  data: T;
}

/** Request body for creating a session. */
export interface CreateSessionRequest {
  /** Optional client-provided id. If omitted, server generates one. */
  id?: string;
}

/** Official MiMo agent names. */
export type MiMoAgent = 'build' | 'plan' | 'compose';

/** Request body for the chat endpoint. */
export interface ChatRequest {
  sessionId: string;
  message: string;
  agent?: MiMoAgent;
}

/** Response body for the chat endpoint. */
export interface ChatResponse {
  sessionId: string;
  message: Message;
}

/** Response body for a session with its messages. */
export interface SessionWithMessages {
  session: Session;
  messages: Message[];
}

/** A project that groups sessions. */
export interface Project {
  id: string;
  name: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}