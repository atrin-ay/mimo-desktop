import type { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/sessionService';
import { getProvider } from '../providers';
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

/** GET /api/cli/sessions — list sessions from MiMo CLI. */
export async function listCliSessions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const provider = getProvider() as any;
    if (typeof provider.listSessions !== 'function') {
      res.status(501).json({ error: { code: 'not_supported', message: 'CLI session listing not available' } });
      return;
    }
    const sessions = await provider.listSessions();
    res.status(200).json({ data: sessions });
  } catch (err) {
    next(err);
  }
}

/** GET /api/cli/sessions/:id/export — export a session from MiMo CLI. */
export async function exportCliSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const provider = getProvider() as any;
    if (typeof provider.exportSession !== 'function') {
      res.status(501).json({ error: { code: 'not_supported', message: 'CLI session export not available' } });
      return;
    }
    const data = await provider.exportSession(id);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/cli/sessions/:id — delete a session from MiMo CLI. */
export async function deleteCliSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const provider = getProvider() as any;
    if (typeof provider.deleteSession !== 'function') {
      res.status(501).json({ error: { code: 'not_supported', message: 'CLI session deletion not available' } });
      return;
    }
    await provider.deleteSession(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export default { createSession, getSession, deleteSession, listCliSessions, exportCliSession, deleteCliSession };