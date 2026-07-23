import { Router, Request, Response } from 'express';
import { modelService } from '../services/modelService';
import { logger } from '../config/logger';

const router = Router();

/** GET /api/models — list all available models. */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const models = await modelService.getModels();
    res.json({ data: models });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch models');
    res.status(500).json({ error: { code: 'internal_error', message: 'Failed to fetch models' } });
  }
});

/** GET /api/models/current — get the currently selected model. */
router.get('/current', (_req: Request, res: Response) => {
  const model = modelService.getCurrentModel();
  res.json({ data: { model } });
});

/** POST /api/models/current — set the current model. */
router.post('/current', (req: Request, res: Response) => {
  const { model } = req.body;
  if (!model || typeof model !== 'string') {
    res.status(400).json({ error: { code: 'invalid_input', message: 'model is required' } });
    return;
  }

  modelService.setCurrentModel(model);
  res.json({ data: { model } });
});

export default router;
