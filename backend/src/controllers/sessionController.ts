import type { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/sessionService';
import type { ApiResponse, Session, SessionWithMessages } from '../types';

/** POST /api/session — create a new session. */
export function createSession(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const id = req.body?.id as string | undefined;
    const session = sessionService.createSession(id);
    const body: ApiResponse<Session> = { data: session };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
}

/** GET /api/session/:id — get a session with its messages. */
export function getSession(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const id = req.params.id as string;
    const result = sessionService.getSession(id);
    const body: ApiResponse<SessionWithMessages> = { data: result };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/session/:id — delete a session. */
export function deleteSession(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const id = req.params.id as string;
    sessionService.deleteSession(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export default { createSession, getSession, deleteSession };