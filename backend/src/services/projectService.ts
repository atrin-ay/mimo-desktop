import { projectRepository } from '../storage/projectRepository';
import type { Project } from '../types';

/**
 * Business logic for project operations.
 *
 * Projects group sessions together. Each session is auto-assigned to a project
 * on first use. The project's "brain" (context) is shared across all its sessions.
 */
export const projectService = {
  /**
   * Ensure a session is assigned to a project.
   * If the session already has a project, return it.
   * Otherwise, create a NEW unique project for this session.
   *
   * @param sessionId - The session to ensure has a project
   * @param projectName - Optional project name. If omitted, auto-generates from session ID.
   * @returns The project the session is assigned to
   */
  ensureProjectForSession(sessionId: string, projectName?: string): Project {
    // Check if session already has a project
    const existingProjectId = projectRepository.getProjectForSession(sessionId);
    if (existingProjectId) {
      const existing = projectRepository.findById(existingProjectId);
      if (existing) {
        return existing;
      }
    }

    // Create a NEW unique project for this session (no shared default)
    const name = projectName || `Project ${sessionId.substring(0, 8)}`;
    const project = projectRepository.create(name);

    // Assign session to project
    projectRepository.assignSession(sessionId, project.id);

    return project;
  },

  /**
   * Get a project by id.
   */
  getProject(projectId: string): Project | null {
    return projectRepository.findById(projectId);
  },

  /**
   * List all active projects.
   */
  listProjects(): Project[] {
    return projectRepository.listAll();
  },

  /**
   * Rename a project.
   */
  renameProject(projectId: string, name: string): boolean {
    return projectRepository.update(projectId, name);
  },
};

export default projectService;
