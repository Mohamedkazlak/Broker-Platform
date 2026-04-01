import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireBroker } from '../middleware/requireBroker.js';
import { recordView, getViews, getSummary, getTopProperties } from '../controllers/analyticsController.js';

const router = Router();

// Public route
router.post('/pageview', recordView);

// Protected routes
router.get('/views', requireAuth, requireBroker, getViews);
router.get('/summary', requireAuth, requireBroker, getSummary);
router.get('/top-properties', requireAuth, requireBroker, getTopProperties);

export default router;
