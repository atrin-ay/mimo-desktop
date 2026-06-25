import { Router } from 'express';
import {
  createSession,
  getSession,
  deleteSession,
} from '../controllers/sessionController';
import { validate } from '../middleware/validate';
import { createSessionSchema, sessionIdParamSchema } from '../schemas';

const router = Router();

/**
 * Session routes.
 *   POST   /api/session      - create a session
 *   GET    /api/session/:id  - get a session with its messages
 *   DELETE /api/session/:id  - delete a session
 */
router.post('/', validate(createSessionSchema), createSession);
router.get('/:id', validate(sessionIdParamSchema), getSession);
router.delete('/:id', validate(sessionIdParamSchema), deleteSession);

export default router;