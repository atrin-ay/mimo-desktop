import { Router } from 'express';
import {
  createSession,
  listSessions,
  getSession,
  deleteSession,
  listCliSessions,
  exportCliSession,
  deleteCliSession,
} from '../controllers/sessionController';
import { validate } from '../middleware/validate';
import { createSessionSchema, sessionIdParamSchema } from '../schemas';

const router = Router();

/**
 * Session routes.
 *   POST   /api/session      - create a session
 *   GET    /api/session      - list all sessions with metadata
 *   GET    /api/session/:id  - get a session with its messages
 *   DELETE /api/session/:id  - delete a session
 */
router.post('/', validate(createSessionSchema), createSession);
router.get('/', listSessions);
router.get('/:id', validate(sessionIdParamSchema), getSession);
router.delete('/:id', validate(sessionIdParamSchema), deleteSession);

/**
 * CLI Session routes.
 *   GET    /api/cli/sessions              - list sessions from MiMo CLI
 *   GET    /api/cli/sessions/:id/export   - export a session from MiMo CLI
 *   DELETE /api/cli/sessions/:id          - delete a session from MiMo CLI
 */
router.get('/cli/sessions', listCliSessions);
router.get('/cli/sessions/:id/export', exportCliSession);
router.delete('/cli/sessions/:id', deleteCliSession);

export default router;