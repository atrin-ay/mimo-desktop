import { Router } from 'express';
import { setApiKey } from '../controllers/adminController';
import { requireAdminAuth } from '../middleware/adminAuth';

const router = Router();

// All admin routes require authentication — works in every NODE_ENV
router.use(requireAdminAuth);

/**
 * Admin routes
 *   POST /api/admin/api-key - set MIMO API key at runtime and persist to admin-overrides.json
 */
router.post('/api-key', setApiKey);

export default router;
