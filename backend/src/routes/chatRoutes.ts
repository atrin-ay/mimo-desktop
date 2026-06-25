import { Router } from 'express';
import { sendMessage } from '../controllers/chatController';
import { validate } from '../middleware/validate';
import { chatSchema } from '../schemas';

const router = Router();

/**
 * Chat routes.
 *   POST /api/chat - send a message and receive an assistant reply
 */
router.post('/', validate(chatSchema), sendMessage);

export default router;