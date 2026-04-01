import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireBroker } from '../middleware/requireBroker.js';
import { validatePropertyCreate, validatePropertyUpdate } from '../middleware/validateProperty.js';
import { getAll, getById, create, update, remove } from '../controllers/propertyController.js';

const router = Router();

// Public routes
router.get('/', getAll);
router.get('/:id', getById);

// Protected routes (auth + broker profile loaded once per request)
router.post('/', requireAuth, requireBroker, validatePropertyCreate, create);
router.patch('/:id', requireAuth, requireBroker, validatePropertyUpdate, update);
router.delete('/:id', requireAuth, requireBroker, remove);

export default router;
