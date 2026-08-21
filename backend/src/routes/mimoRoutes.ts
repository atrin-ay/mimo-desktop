import { Router } from 'express';
import { getVersion, healthCheck } from '../controllers/mimoController';
import { requireAdminAuth } from '../middleware/adminAuth';

const router = Router();

router.use(requireAdminAuth);

router.get('/version', getVersion);
router.get('/health', healthCheck);

export default router;
