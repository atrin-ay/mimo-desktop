import { Router } from 'express';
import {
  getBrain,
  getSuggestions,
  approveSuggestion,
  ignoreSuggestion,
  getQueueStats,
} from '../controllers/contextController';

const router = Router();

// Brain endpoints
router.get('/brain', getBrain);

// Suggestions endpoints
router.get('/suggestions', getSuggestions);
router.post('/suggestions/:id/approve', approveSuggestion);
router.post('/suggestions/:id/ignore', ignoreSuggestion);

// Queue stats (debugging)
router.get('/queue-stats', getQueueStats);

export default router;
