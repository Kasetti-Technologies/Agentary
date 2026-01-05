// src/billing/subscriptionRoutes.ts

import { Router, Request, Response, NextFunction } from 'express';
import {
  createSubscriptionWithPriceSnapshot,
  CreateSubscriptionRequest,
} from './subscriptionService';

export const subscriptionRouter = Router();

subscriptionRouter.post(
  '/subscriptions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantContext = (req as any).tenantContext;
      if (!tenantContext || !tenantContext.sub) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Missing or invalid TenantContext',
        });
      }

      const tenantId = tenantContext.sub as string;
      const { serviceType, driverId, quantity, startsAt } = req.body ?? {};

      if (!serviceType || typeof serviceType !== 'string') {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'serviceType is required and must be a string',
        });
      }

      const qtyNumber = Number(quantity);
      if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'quantity is required and must be a positive number',
        });
      }

      let startsAtDate: Date | undefined;
      if (startsAt) {
        const parsed = new Date(startsAt);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'startsAt must be a valid ISO date string if provided',
          });
        }
        startsAtDate = parsed;
      }

      const input: CreateSubscriptionRequest = {
        tenantId,
        serviceType,
        driverId,
        quantity: qtyNumber,
        startsAt: startsAtDate,
      };

      const subscription = await createSubscriptionWithPriceSnapshot(input);

      return res.status(201).json(subscription);
    } catch (err) {
      return next(err);
    }
  },
);
