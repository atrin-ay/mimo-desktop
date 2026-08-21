import { Router } from 'express';
import { requireAdminAuth } from '../middleware/adminAuth';

const router = Router();

// All admin routes require authentication
router.use(requireAdminAuth);

export default router;
