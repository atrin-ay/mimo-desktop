import { Router } from 'express';
import { setApiKey } from '../controllers/adminController';

const router = Router();

/**
 * Admin routes (development convenience)
 *   POST /api/admin/api-key - set MIMO API key at runtime and persist to .env
 */
router.post('/api-key', setApiKey);

export default router;
