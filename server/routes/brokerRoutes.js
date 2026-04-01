import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireBroker } from '../middleware/requireBroker.js';
import { getBySubdomain, getById, update } from '../controllers/brokerController.js';

const router = Router();

// Public route
router.get('/subdomain/:subdomain', getBySubdomain);

// Protected routes
router.get('/:id', requireAuth, requireBroker, getById);
router.patch('/:id', requireAuth, requireBroker, update);

export default router;
