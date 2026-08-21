import type { Request, Response, NextFunction } from 'express';
import { getProvider } from '../providers';

/** GET /api/mimo/version — MiMo CLI version. */
export async function getVersion(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const provider = getProvider() as any;
    if (typeof provider.getVersion !== 'function') {
      res.status(501).json({ error: { code: 'not_supported', message: 'MiMo CLI not available' } });
      return;
    }
    const version = await provider.getVersion();
    res.status(200).json({ data: { version } });
  } catch (err) {
    next(err);
  }
}

/** GET /api/mimo/health — MiMo CLI health check. */
export async function healthCheck(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const provider = getProvider() as any;
    const health = await provider.healthCheck();
    res.status(health.healthy ? 200 : 503).json({ data: health });
  } catch (err) {
    next(err);
  }
}

export default { getVersion, healthCheck };
