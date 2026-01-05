// src/routes/billingSubscriptions.router.ts
import { Router } from 'express';
import { createSubscriptionHandler } from '../controllers/billingSubscriptions.controller';

const router = Router();

// POST /api/v1/billing/subscriptions
router.post('/', createSubscriptionHandler);

export { router as billingSubscriptionsRouter };
