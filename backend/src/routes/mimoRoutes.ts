import { Router } from 'express';
import {
  getVersion,
  getConfig,
  runCommand,
  healthCheck,
} from '../controllers/mimoController';

const router = Router();

/**
 * MiMo CLI native routes.
 *   GET  /api/mimo/version  - MiMo CLI version
 *   GET  /api/mimo/config   - MiMo CLI configuration
 *   POST /api/mimo/run      - Run an arbitrary CLI command
 *   GET  /api/mimo/health   - MiMo CLI health check
 */
router.get('/version', getVersion);
router.get('/config', getConfig);
router.post('/run', runCommand);
router.get('/health', healthCheck);

export default router;
