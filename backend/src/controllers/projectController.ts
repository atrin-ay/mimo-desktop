import type { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/projectService';
import type { ApiResponse } from '../types';
import type { Project } from '../types';

/** GET /api/project — List all active projects. */
export async function listProjects(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projects = projectService.listProjects();
    const body: ApiResponse<Project[]> = { data: projects };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

/** GET /api/project/:id — Get a project by id. */
export async function getProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    const project = projectService.getProject(id);
    if (!project) {
      res.status(404).json({ error: { code: 'not_found', message: 'Project not found' } });
      return;
    }

    const body: ApiResponse<Project> = { data: project };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/project/:id — Rename a project. */
export async function renameProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: { code: 'invalid_input', message: 'name is required' } });
      return;
    }

    const success = projectService.renameProject(id, name);
    if (!success) {
      res.status(404).json({ error: { code: 'not_found', message: 'Project not found' } });
      return;
    }

    res.status(200).json({ data: { renamed: true } });
  } catch (err) {
    next(err);
  }
}

export default { listProjects, getProject, renameProject };
