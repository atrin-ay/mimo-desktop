import type { Request, Response, NextFunction } from 'express';
import { contextManager } from '../context/ContextManager';
import { suggestionRepository } from '../context/suggestions/SuggestionRepository';
import { suggestionService } from '../context/suggestions/SuggestionService';
import { logger } from '../config/logger';
import type { ApiResponse } from '../types';
import type { ProjectBrain, Suggestion } from '../context/types';

/** GET /api/context/brain — get the brain for a project. */
export async function getBrain(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) {
      res.status(400).json({ error: { code: 'invalid_input', message: 'projectId is required' } });
      return;
    }

    const brain = contextManager.getBrain(projectId);
    if (!brain) {
      res.status(404).json({ error: { code: 'not_found', message: 'Brain not found' } });
      return;
    }

    const body: ApiResponse<ProjectBrain> = { data: brain.data };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

/** GET /api/context/suggestions — list suggestions for a project. */
export async function getSuggestions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.query.projectId as string;
    const status = req.query.status as string | undefined;

    if (!projectId) {
      res.status(400).json({ error: { code: 'invalid_input', message: 'projectId is required' } });
      return;
    }

    const suggestions = suggestionRepository.listByProject(
      projectId,
      status as any,
    );

    const body: ApiResponse<Suggestion[]> = { data: suggestions };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

/** POST /api/context/suggestions/:id/approve — approve a suggestion. */
export async function approveSuggestion(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    const success = suggestionService.approve(id);
    if (!success) {
      res.status(404).json({ error: { code: 'not_found', message: 'Suggestion not found or already resolved' } });
      return;
    }

    const body: ApiResponse<{ success: boolean }> = { data: { success: true } };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

/** POST /api/context/suggestions/:id/ignore — ignore a suggestion. */
export async function ignoreSuggestion(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    const success = suggestionService.ignore(id);
    if (!success) {
      res.status(404).json({ error: { code: 'not_found', message: 'Suggestion not found or already resolved' } });
      return;
    }

    const body: ApiResponse<{ success: boolean }> = { data: { success: true } };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

/** GET /api/context/queue-stats — get queue stats for a project. */
export async function getQueueStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) {
      res.status(400).json({ error: { code: 'invalid_input', message: 'projectId is required' } });
      return;
    }

    const stats = contextManager.getQueueStats(projectId);
    const body: ApiResponse<typeof stats> = { data: stats };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

export default {
  getBrain,
  getSuggestions,
  approveSuggestion,
  ignoreSuggestion,
  getQueueStats,
};
