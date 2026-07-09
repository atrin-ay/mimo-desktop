import type { Request, Response, NextFunction } from 'express';
import { getProvider } from '../providers';
import { logger } from '../config/logger';

/** GET /api/mimo/version — MiMo CLI version. */
export async function getVersion(
  req: Request,
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

/** GET /api/mimo/config — MiMo CLI configuration. */
export async function getConfig(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const provider = getProvider() as any;
    if (typeof provider.getConfig !== 'function') {
      res.status(501).json({ error: { code: 'not_supported', message: 'MiMo CLI config not available' } });
      return;
    }
    const config = await provider.getConfig();
    res.status(200).json({ data: config });
  } catch (err) {
    next(err);
  }
}

/** POST /api/mimo/run — Run an arbitrary MiMo CLI command. */
export async function runCommand(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { args } = req.body as { args?: string[] };
    if (!args || !Array.isArray(args) || args.length === 0) {
      res.status(400).json({ error: { code: 'invalid_input', message: 'args array is required' } });
      return;
    }

    // Safety: block dangerous commands
    const blocked = ['rm', 'rmdir', 'del', 'format', 'shutdown', 'reboot'];
    if (args.some(a => blocked.includes(a.toLowerCase()))) {
      res.status(403).json({ error: { code: 'forbidden', message: 'Command not allowed' } });
      return;
    }

    const provider = getProvider() as any;
    if (typeof provider.runCommand !== 'function') {
      res.status(501).json({ error: { code: 'not_supported', message: 'MiMo CLI not available' } });
      return;
    }

    logger.info({ args }, 'MiMo CLI command requested');
    const result = await provider.runCommand(args);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

/** GET /api/mimo/health — MiMo CLI health check. */
export async function healthCheck(
  req: Request,
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

export default { getVersion, getConfig, runCommand, healthCheck };
