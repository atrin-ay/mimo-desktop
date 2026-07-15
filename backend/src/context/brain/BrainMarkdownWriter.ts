import fs from 'fs';
import path from 'path';
import { logger } from '../../config/logger';
import type { ProjectBrain } from '../types';

const BRAIN_DIR = 'project-brain';

/**
 * Mirrors project brain data to human-readable markdown files.
 * Output location: backend/data/project-brain/<projectId>/
 */
export const brainMarkdownWriter = {
  /** Get the brain directory path for a project. */
  getBrainDir(projectId: string): string {
    return path.resolve(process.cwd(), 'data', BRAIN_DIR, projectId);
  },

  /** Mirror the full brain to markdown files. */
  mirror(brain: ProjectBrain): void {
    const dir = this.getBrainDir(brain.projectId);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write project-state.md
    this.writeFile(dir, 'project-state.md', this.buildStateMd(brain));

    // Write project-knowledge.md
    this.writeFile(dir, 'project-knowledge.md', this.buildKnowledgeMd(brain));

    // Write context.json (machine-readable)
    this.writeJson(dir, 'context.json', {
      projectId: brain.projectId,
      version: brain.version,
      updatedAt: brain.updatedAt,
      state: brain.state,
      knowledge: brain.knowledge,
    });

    logger.debug({ projectId: brain.projectId, dir }, 'Brain markdown mirrored');
  },

  /** Write a file, logging errors but not throwing. */
  writeFile(dir: string, filename: string, content: string): void {
    try {
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (err) {
      logger.error({ err, dir, filename }, 'Failed to write brain markdown file');
    }
  },

  /** Write a JSON file. */
  writeJson(dir: string, filename: string, data: unknown): void {
    try {
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      logger.error({ err, dir, filename }, 'Failed to write brain JSON file');
    }
  },

  /** Build project-state.md content. */
  buildStateMd(brain: ProjectBrain): string {
    const { state } = brain;
    const lines: string[] = ['# Project State', ''];

    if (state.currentGoal) {
      lines.push('## Current Goal', state.currentGoal, '');
    }

    if (state.currentTask) {
      lines.push('## Current Task', state.currentTask, '');
    }

    if (state.nextStep) {
      lines.push('## Next Step', state.nextStep, '');
    }

    if (state.activeFeature) {
      lines.push('## Active Feature', state.activeFeature, '');
    }

    if (state.currentFile) {
      lines.push('## Current File', state.currentFile, '');
    }

    if (state.sessionProgress) {
      lines.push('## Session Progress', state.sessionProgress, '');
    }

    if (state.tasks.length > 0) {
      lines.push('## Tasks', '');
      for (const task of state.tasks) {
        const icon = task.status === 'done' ? '[x]' : task.status === 'doing' ? '[~]' : '[ ]';
        lines.push('- ' + icon + ' ' + task.title);
      }
      lines.push('');
    }

    if (state.knownIssues.length > 0) {
      lines.push('## Known Issues', '');
      for (const issue of state.knownIssues) {
        const icon = issue.status === 'resolved' ? '[x]' : '[ ]';
        lines.push('- ' + icon + ' [' + issue.severity + '] ' + issue.title);
      }
      lines.push('');
    }

    lines.push('---', '_Updated: ' + state.updatedAt + '_');

    return lines.join('\n');
  },

  /** Build project-knowledge.md content. */
  buildKnowledgeMd(brain: ProjectBrain): string {
    const { knowledge } = brain;
    const lines: string[] = ['# Project Knowledge', ''];

    if (knowledge.overview) {
      lines.push('## Overview', knowledge.overview, '');
    }

    if (knowledge.architecture.length > 0) {
      lines.push('## Architecture', '');
      for (const item of knowledge.architecture) {
        lines.push('### ' + item.title, item.detail, '');
      }
    }

    if (knowledge.decisions.length > 0) {
      lines.push('## Decisions', '');
      for (const d of knowledge.decisions) {
        lines.push('### ' + d.title, '**Rationale:** ' + d.rationale, '_Date: ' + d.date + '_', '');
      }
    }

    if (knowledge.techChoices.length > 0) {
      lines.push('## Tech Choices', '');
      for (const tc of knowledge.techChoices) {
        lines.push('- **' + tc.area + ':** ' + tc.choice + ' - ' + tc.reason);
      }
      lines.push('');
    }

    if (knowledge.conventions.length > 0) {
      lines.push('## Conventions', '');
      for (const c of knowledge.conventions) {
        lines.push('- ' + c);
      }
      lines.push('');
    }

    if (knowledge.rules.length > 0) {
      lines.push('## Rules', '');
      for (const r of knowledge.rules) {
        lines.push('- ' + r);
      }
      lines.push('');
    }

    if (knowledge.userPreferences.length > 0) {
      lines.push('## User Preferences', '');
      for (const p of knowledge.userPreferences) {
        lines.push('- ' + p);
      }
      lines.push('');
    }

    lines.push('---', '_Updated: ' + knowledge.updatedAt + '_');

    return lines.join('\n');
  },
};

export default brainMarkdownWriter;
