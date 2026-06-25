import { z } from 'zod';

/**
 * MIMO Backend - Zod Validation Schemas
 * Phase 1: Core Chat + Sessions
 */

/** UUID v4 format validation. */
const uuidSchema = z
  .string()
  .uuid('Must be a valid UUID v4');

/** Schema for POST /api/session request body. */
export const createSessionSchema = z.object({
  body: z.object({
    id: uuidSchema.optional(),
  }),
});

/** Schema for GET /api/session/:id and DELETE /api/session/:id. */
export const sessionIdParamSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

/** Schema for POST /api/chat request body. */
export const chatSchema = z.object({
  body: z.object({
    sessionId: uuidSchema,
    message: z
      .string()
      .min(1, 'Message must not be empty')
      .max(8000, 'Message must be at most 8000 characters'),
  }),
});

/** Inferred types from schemas. */
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SessionIdParamInput = z.infer<typeof sessionIdParamSchema>;
export type ChatInput = z.infer<typeof chatSchema>;