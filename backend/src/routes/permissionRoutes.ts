import { Router } from 'express';
import { getProvider } from '../providers';
import { logger } from '../config/logger';

const router = Router();

/**
 * Permission routes — proxy to MiMo serve's native permission API.
 *
 *   POST /api/permission/:requestID/reply - answer a permission request
 *
 * Body: { reply: "once" | "always" | "reject", message?: string }
 */

const VALID_REPLIES = new Set(['once', 'always', 'reject']);

/** POST /api/permission/:requestID/reply — resolve a MiMo permission request. */
router.post('/:requestID/reply', async (req, res) => {
  try {
    const { requestID } = req.params;
    const { reply, message } = req.body ?? {};
    logger.info({ requestID, reply }, 'Backend received permission reply');

    if (!requestID || typeof reply !== 'string' || !VALID_REPLIES.has(reply)) {
      res.status(400).json({ error: { code: 'invalid_input', message: 'reply must be one of: once, always, reject' } });
      return;
    }

    const provider = getProvider() as any;
    if (typeof provider.replyToPermission !== 'function') {
      res.status(501).json({ error: { code: 'not_supported', message: 'Permission reply not supported by current provider' } });
      return;
    }

    await provider.replyToPermission(requestID, reply, message);
    res.status(200).json({ data: { success: true } });
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack }, 'Failed to reply to permission');
    res.status(500).json({ error: { code: 'internal_error', message: err.message || 'Failed to reply to permission' } });
  }
});

export default router;
