import type { Request, Response, NextFunction } from 'express';
import { providerService } from '../services/providerService';

export const providerController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const providers = await providerService.listProviders();
      res.status(200).json({ data: providers });
    } catch (err) {
      next(err);
    }
  },

  async setCredential(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.id;
      const { key } = req.body;
      if (!key) {
        res.status(400).json({ error: { code: 'invalid_input', message: 'API key is required' } });
        return;
      }
      await providerService.setCredential(providerId, key);
      res.status(200).json({ data: { id: providerId, hasCredential: true } });
    } catch (err: any) {
      if (err.message?.includes('not ready')) {
        res.status(503).json({ error: { code: 'provider_not_ready', message: err.message } });
        return;
      }
      if (err.message?.includes('Invalid') || err.message?.includes('must be')) {
        res.status(400).json({ error: { code: 'invalid_input', message: err.message } });
        return;
      }
      next(err);
    }
  },

  async removeCredential(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.id;
      await providerService.removeCredential(providerId);
      res.status(200).json({ data: { id: providerId, hasCredential: false } });
    } catch (err) {
      next(err);
    }
  },

  async refresh(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await providerService.refreshCatalog();
      res.status(200).json({ data: result });
    } catch (err: any) {
      if (err.message?.includes('not ready')) {
        res.status(503).json({ error: { code: 'provider_not_ready', message: err.message } });
        return;
      }
      next(err);
    }
  },
};

export default providerController;
