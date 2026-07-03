import type { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chatService';
import { sessionRepository } from '../storage/sessionRepository';
import { messageRepository } from '../storage/messageRepository';
import { getProvider } from '../providers';
import { getDatabase } from '../storage/database';
import { logger } from '../config/logger';
import type { ApiResponse, ChatResponse, Message, ProviderMessage } from '../types';

/** POST /api/chat — send a message in a session and receive an assistant reply. */
export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessionId = req.body.sessionId as string;
    const message = req.body.message as string;
    const mode = req.body.mode as string | undefined;

    const result = await chatService.sendMessage(sessionId, message, mode);
    const body: ApiResponse<ChatResponse> = { data: result };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

/** POST /api/chat/stream — stream MiMo CLI events in real-time via SSE. */
export async function streamMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessionId = req.body.sessionId as string;
    const userContent = req.body.message as string;
    const mode = req.body.mode as string | undefined;

    if (!sessionId || !userContent) {
      res.status(400).json({ error: { code: 'invalid_input', message: 'sessionId and message are required' } });
      return;
    }

    // Validate session exists
    const session = sessionRepository.findById(sessionId);
    if (!session) {
      res.status(404).json({ error: { code: 'not_found', message: 'Session not found' } });
      return;
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send initial event
    res.write(`data: ${JSON.stringify({ type: 'start', timestamp: Date.now() })}\n\n`);

    // Build conversation history
    const history = messageRepository.findHistoryBySessionId(sessionId);
    const requestHistory: ProviderMessage[] = [
      ...history,
      { role: 'user', content: userContent },
    ];

    // Persist user message
    messageRepository.create({ sessionId, role: 'user', content: userContent });

    // Get provider and check if it supports streaming
    const provider = getProvider() as any;

    if (typeof provider.sendMessageStream === 'function') {
      // Use streaming provider
      try {
        await provider.sendMessageStream(requestHistory, mode, (event: any) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error({ err, sessionId }, 'Streaming provider error');
        res.write(`data: ${JSON.stringify({ type: 'error', message: errorMsg, timestamp: Date.now() })}\n\n`);
      }
    } else {
      // Fallback: use non-streaming provider and emit events manually
      res.write(`data: ${JSON.stringify({ type: 'state', state: 'thinking', label: 'Analyzing...', timestamp: Date.now() })}\n\n`);

      try {
        const result = await provider.sendMessage(requestHistory, mode);

        // Emit text event
        res.write(`data: ${JSON.stringify({ type: 'text', text: result.content, timestamp: Date.now() })}\n\n`);

        // Persist assistant message
        const db = getDatabase();
        const assistantMsg = db.transaction(() => {
          return messageRepository.create({ sessionId, role: 'assistant', content: result.content });
        })();

        // Emit completion
        res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMsg.id, timestamp: Date.now() })}\n\n`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error({ err, sessionId }, 'Provider error');
        res.write(`data: ${JSON.stringify({ type: 'error', message: errorMsg, timestamp: Date.now() })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'end', timestamp: Date.now() })}\n\n`);
    res.end();
  } catch (err) {
    next(err);
  }
}

export default { sendMessage, streamMessage };