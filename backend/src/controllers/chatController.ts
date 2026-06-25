import type { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chatService';
import type { ApiResponse, ChatResponse } from '../types';

/** POST /api/chat — send a message in a session and receive an assistant reply. */
export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessionId = req.body.sessionId as string;
    const message = req.body.message as string;

    const result = await chatService.sendMessage(sessionId, message);
    const body: ApiResponse<ChatResponse> = { data: result };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

export default { sendMessage };