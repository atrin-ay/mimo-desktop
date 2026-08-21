import { Router } from 'express';
import { providerController } from '../controllers/providerController';
import { requireAdminAuth } from '../middleware/adminAuth';

const router = Router();

router.get('/', providerController.list);
router.post('/:id/credential', requireAdminAuth, providerController.setCredential);
router.delete('/:id/credential', requireAdminAuth, providerController.removeCredential);
router.post('/refresh', requireAdminAuth, providerController.refresh);

export default router;
