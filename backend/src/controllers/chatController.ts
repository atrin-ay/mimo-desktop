import type { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chatService';
import { sessionRepository } from '../storage/sessionRepository';
import { messageRepository } from '../storage/messageRepository';
import { getProvider } from '../providers';
import { getDatabase } from '../storage/database';
import { contextManager } from '../context/ContextManager';
import { logger } from '../config/logger';
import { env } from '../config/env';
import type { ApiResponse, ChatResponse, Message, MiMoAgent, ProviderMessage } from '../types';

/** POST /api/chat — send a message in a session and receive an assistant reply. */
export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessionId = req.body.sessionId as string;
    const message = req.body.message as string;
    const agent = req.body.agent as MiMoAgent | undefined;
    const model = req.body.model as string | undefined;

    const result = await chatService.sendMessage(sessionId, message, agent, model);
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
    const agent = req.body.agent as MiMoAgent | undefined;
    const model = req.body.model as string | undefined;

    logger.info({ sessionId, agent, messageLength: userContent.length }, 'Chat stream request received');

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

    // Ensure session is assigned to a project (auto-assign if needed)
    const projectId = contextManager.ensureProjectForSession(sessionId);

    // Build context injection from brain (if available)
    const contextInjection = contextManager.buildInjection(projectId);

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send initial event
    res.write(`data: ${JSON.stringify({ type: 'start', timestamp: Date.now() })}\n\n`);

    // Emit mode status so the frontend knows what mode is active
    res.write(`data: ${JSON.stringify({ type: 'status', agent: agent || 'chat', timestamp: Date.now() })}\n\n`);

    // Build conversation history (trim first, then prepend context injection)
    const history = messageRepository.findHistoryBySessionId(sessionId);
    const trimmedHistory = history.slice(-40);
    const requestHistory: ProviderMessage[] = [
      ...(contextInjection ? [contextInjection] : []),
      ...trimmedHistory,
      { role: 'user', content: userContent },
    ];

    // Persist the user message ONLY if the frontend hasn't already stored it.
    // The frontend appends the user message to its local state immediately on
    // send, and that copy is what we read back via findHistoryBySessionId
    // above. Re-persisting here duplicated every user turn in the DB.
    const lastStored = trimmedHistory[trimmedHistory.length - 1];
    if (!lastStored || lastStored.role !== 'user' || lastStored.content !== userContent) {
      messageRepository.create({ sessionId, role: 'user', content: userContent });
    }

    // Get provider and check if it supports streaming
    const provider = getProvider() as any;

    if (typeof provider.sendMessageStream === 'function') {
      // Use streaming provider
      let assistantText = '';
      try {
        await provider.sendMessageStream(requestHistory, agent, (event: any) => {
          // Debug log all events
          if (env.mimoDebug) {
            logger.debug({ type: event.type, sessionID: event.sessionID }, '[MiMo Event]');
          }

          // Log question events specifically
          if (event?.type === 'question.asked') {
            logger.info({ questionID: event.properties?.id, sessionID: event.sessionID }, 'Question asked by MiMo');
          }

          // Accumulate the assistant reply as it streams so we can persist it
          // once the stream ends — mirroring how the frontend builds the
          // visible message (text parts, plus any raw passthrough output).
          //
          // MiMo serve echoes the user prompt at the start of its response
          // text (e.g. user sends "hi", response starts with "hiHi! ...").
          // Strip the echoed prefix so it doesn't appear in the UI or DB.
          if (event?.type === 'text' && event.part?.text) {
            let text = event.part.text;
            if (text.startsWith(userContent)) {
              text = text.slice(userContent.length).replace(/^\n+/, '');
              if (text) event = { ...event, part: { ...event.part, text } };
              else return;
            }
            assistantText += text;
          } else if (event?.type === 'raw' && typeof event.text === 'string') {
            let text = event.text;
            if (text.startsWith(userContent)) {
              text = text.slice(userContent.length).replace(/^\n+/, '');
              if (text) event = { ...event, text };
              else return;
            }
            assistantText += text;
          }
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }, model);

        // Persist the assistant reply so it survives a page reload. Without
        // this, only user messages were stored and history looked one-sided.
        if (assistantText.trim()) {
          const assistantMsg = messageRepository.create({
            sessionId,
            role: 'assistant',
            content: assistantText,
          });

          // Fire-and-forget memory update
          contextManager.afterExchange(projectId, sessionId, userContent, assistantText);

          res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMsg.id, timestamp: Date.now() })}\n\n`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error({ err, sessionId }, 'Streaming provider error');
        res.write(`data: ${JSON.stringify({ type: 'error', message: errorMsg, timestamp: Date.now() })}\n\n`);
      }
    } else {
      // Fallback: use non-streaming provider and emit events manually
      res.write(`data: ${JSON.stringify({ type: 'state', state: 'thinking', label: 'Analyzing...', timestamp: Date.now() })}\n\n`);

      try {
        const result = await provider.sendMessage(requestHistory, agent, model);

        // Emit text event
        res.write(`data: ${JSON.stringify({ type: 'text', text: result.content, timestamp: Date.now() })}\n\n`);

        // Persist assistant message
        const db = getDatabase();
        const assistantMsg = db.transaction(() => {
          return messageRepository.create({ sessionId, role: 'assistant', content: result.content });
        })();

        // Fire-and-forget memory update
        contextManager.afterExchange(projectId, sessionId, userContent, result.content);

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