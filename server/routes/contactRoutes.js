import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireBroker } from '../middleware/requireBroker.js';
import { create, getAll, markAsRead, remove } from '../controllers/contactController.js';

const router = Router();

// Public route
router.post('/', create);

// Protected routes
router.get('/', requireAuth, requireBroker, getAll);
router.patch('/:id', requireAuth, requireBroker, markAsRead);
router.delete('/:id', requireAuth, requireBroker, remove);

export default router;
