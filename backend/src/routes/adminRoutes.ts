import { Router } from 'express';
import { requireAdminAuth } from '../middleware/adminAuth';
import { adminController } from '../controllers/adminController';

const router = Router();

router.get('/token', adminController.getToken);

// All other admin routes require authentication
router.use(requireAdminAuth);

export default router;
