// src/controllers/billingSubscriptions.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PoolClient } from 'pg';
import { pricingEngine } from '../pricing/pricingEngineInstance';

function mapServiceTypeToMetric(serviceType: string): string {
  // Adjust this mapping to match pricing.base_prices.metric values
  // Example: "NLP" -> "subscription.nlp"
  return `subscription.${serviceType.toLowerCase()}`;
}

export async function createSubscriptionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const anyReq = req as any;

    // Ensure middleware attached tenantContext + dbClient
    if (!anyReq.tenantContext || !anyReq.dbClient) {
      throw new Error('Tenant context or DB client not available on request.');
    }

    const tenantContext = anyReq.tenantContext;
    const dbClient: PoolClient = anyReq.dbClient;

    const tenantId: string = tenantContext.sub;

    const { serviceType, driverId, quantity, startsAt } = req.body ?? {};

    // Basic validation
    if (!serviceType || typeof serviceType !== 'string') {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'serviceType is required and must be a string.',
      });
      return;
    }

    const qtyNumber = Number(quantity);
    if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'quantity is required and must be a positive number.',
      });
      return;
    }

    let startsAtDate: Date;
    if (startsAt) {
      const parsed = new Date(startsAt);
      if (isNaN(parsed.getTime())) {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'startsAt must be a valid ISO date string if provided.',
        });
        return;
      }
      startsAtDate = parsed;
    } else {
      startsAtDate = new Date();
    }

    const metric = mapServiceTypeToMetric(serviceType);

    // Resolve price via PricingEngine (override → promo → volume → base)
    const resolved = await pricingEngine.resolvePrice({
      tenantId,
      metric,
      quantity: qtyNumber,
      timestamp: startsAtDate,
    });

    // Insert subscription row with price snapshot
    const insertSql = `
      INSERT INTO billing.subscriptions (
        tenant_id,
        service_type,
        driver_id,
        quantity,
        price_id,
        unit_price_cents,
        currency,
        starts_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        subscription_id,
        tenant_id,
        service_type,
        driver_id,
        quantity,
        price_id,
        unit_price_cents,
        currency,
        starts_at,
        created_at;
    `;

    const result = await dbClient.query(insertSql, [
      tenantId,
      serviceType,
      driverId ?? null,
      qtyNumber,
      resolved.priceId,
      resolved.unitPriceCents,
      resolved.currency,
      startsAtDate,
    ]);

    const row = result.rows[0];

    res.status(201).json({
      subscription_id: row.subscription_id,
      tenant_id: row.tenant_id,
      service_type: row.service_type,
      driver_id: row.driver_id,
      quantity: row.quantity,
      price_id: row.price_id,
      unit_price_cents: row.unit_price_cents,
      currency: row.currency,
      starts_at: row.starts_at,
      created_at: row.created_at,
    });
  } catch (err) {
    next(err);
  }
}
