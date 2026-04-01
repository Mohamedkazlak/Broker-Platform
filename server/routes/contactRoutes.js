import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { create, getAll, markAsRead, remove } from '../controllers/contactController.js';

const router = Router();

// Public route
router.post('/', create);

// Protected routes
router.get('/', requireAuth, getAll);
router.patch('/:id', requireAuth, markAsRead);
router.delete('/:id', requireAuth, remove);

export default router;
