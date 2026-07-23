import { Router } from 'express';
import { getProvider } from '../providers';
import { logger } from '../config/logger';

const router = Router();

/**
 * Question routes — proxy to MiMo serve's question API.
 *
 *   POST /api/question/:requestID/reply   - reply to a question
 *   POST /api/question/:requestID/reject  - reject a question
 *   GET  /api/question                    - list pending questions
 */

/** POST /api/question/:requestID/reply — reply to a MiMo question. */
router.post('/:requestID/reply', async (req, res) => {
  try {
    const { requestID } = req.params;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      res.status(400).json({ error: { code: 'invalid_input', message: 'answers array is required' } });
      return;
    }

    const provider = getProvider() as any;
    if (typeof provider.replyToQuestion !== 'function') {
      res.status(501).json({ error: { code: 'not_supported', message: 'Question reply not supported by current provider' } });
      return;
    }

    await provider.replyToQuestion(requestID, answers);
    logger.info({ requestID }, 'Question replied');
    res.status(200).json({ data: { success: true } });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed to reply to question');
    res.status(500).json({ error: { code: 'internal_error', message: err.message || 'Failed to reply to question' } });
  }
});

/** POST /api/question/:requestID/reject — reject a MiMo question. */
router.post('/:requestID/reject', async (req, res) => {
  try {
    const { requestID } = req.params;

    const provider = getProvider() as any;
    if (typeof provider.rejectQuestion !== 'function') {
      res.status(501).json({ error: { code: 'not_supported', message: 'Question reject not supported by current provider' } });
      return;
    }

    await provider.rejectQuestion(requestID);
    logger.info({ requestID }, 'Question rejected');
    res.status(200).json({ data: { success: true } });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed to reject question');
    res.status(500).json({ error: { code: 'internal_error', message: err.message || 'Failed to reject question' } });
  }
});

/** GET /api/question — list pending questions. */
router.get('/', async (_req, res) => {
  try {
    const provider = getProvider() as any;
    if (typeof provider.listQuestions !== 'function') {
      res.status(501).json({ error: { code: 'not_supported', message: 'Question listing not supported by current provider' } });
      return;
    }

    const questions = await provider.listQuestions();
    res.status(200).json({ data: questions });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed to list questions');
    res.status(500).json({ error: { code: 'internal_error', message: err.message || 'Failed to list questions' } });
  }
});

export default router;
