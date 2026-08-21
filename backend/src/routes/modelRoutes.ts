import { Router, Request, Response, NextFunction } from 'express';
import { modelService } from '../services/modelService';
import { providerService } from '../services/providerService';
import { logger } from '../config/logger';
import { requireAdminAuth } from '../middleware/adminAuth';

const router = Router();

/** GET /api/models — list grouped catalog. */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const catalog = await modelService.getCatalog();
    res.json({ data: catalog });
  } catch (err: any) {
    if (err.code === 'provider_not_ready' || err.name === 'ProviderNotReadyError') {
      res.status(503).json({ error: { code: 'provider_not_ready', message: err.message } });
      return;
    }
    logger.error({ err }, 'Failed to fetch models catalog');
    res.status(500).json({ error: { code: 'internal_error', message: err.message || 'Failed to fetch models' } });
  }
});

/** GET /api/models/current — get the currently selected model. */
router.get('/current', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const model = await modelService.getCurrentModel();
    res.json({ data: { model } });
  } catch (err) {
    next(err);
  }
});

/** POST /api/models/current — set the current model. */
router.post('/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { model } = req.body;
    if (!model || typeof model !== 'string') {
      res.status(400).json({ error: { code: 'invalid_input', message: 'model is required' } });
      return;
    }

    const isKnown = await modelService.isKnownModel(model);
    if (!isKnown) {
      res.status(400).json({ error: { code: 'unknown_model', message: `Unknown or invalid model ID: "${model}"` } });
      return;
    }

    await modelService.setCurrentModel(model);
    res.json({ data: { model } });
  } catch (err) {
    next(err);
  }
});

/** POST /api/models/refresh — refresh models catalog. */
router.post('/refresh', requireAdminAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await providerService.refreshCatalog();
    res.json({ data: result });
  } catch (err: any) {
    if (err.code === 'provider_not_ready') {
      res.status(503).json({ error: { code: 'provider_not_ready', message: err.message } });
      return;
    }
    next(err);
  }
});

export default router;
