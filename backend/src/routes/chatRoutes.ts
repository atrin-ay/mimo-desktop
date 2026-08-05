import { Router } from 'express';
import { sendMessage, streamMessage } from '../controllers/chatController';
import { validate } from '../middleware/validate';
import { chatSchema } from '../schemas';

const router = Router();

/**
 * Chat routes.
 *   POST /api/chat        - send a message and receive an assistant reply
 *   POST /api/chat/stream - stream MiMo CLI events in real-time (SSE)
 */
router.post('/', validate(chatSchema), sendMessage);
router.post('/stream', validate(chatSchema), streamMessage);

export default router;