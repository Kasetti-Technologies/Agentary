// src/billing/subscriptionService.ts

import { pricingEngine } from '../pricing/pricingEngineInstance';

export interface Subscription {
  id: string;
  tenantId: string;
  serviceType: string;
  driverId?: string | null;
  quantity: number;
  priceId: string;
  unitPriceCents: number;
  currency: string;
  startsAt: Date;
  createdAt: Date;
}

// Whatever you actually persist to DB
export interface CreateSubscriptionInput {
  tenantId: string;
  serviceType: string;
  driverId?: string | null;
  quantity: number;
  priceId: string;
  unitPriceCents: number;
  currency: string;
  startsAt: Date;
}

export interface CreateSubscriptionRequest {
  tenantId: string;      // from TenantContext
  serviceType: string;   // e.g. "NLP"
  driverId?: string;
  quantity: number;
  startsAt?: Date;
}

// TODO: replace with your real DB insert logic
async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<Subscription> {
  // placeholder: implement with pg or your repo layer
  throw new Error('createSubscription() not implemented');
}

function mapServiceTypeToMetric(serviceType: string): string {
  // Adjust to match your pricing.base_prices.metric values
  return `subscription.${serviceType.toLowerCase()}`;
}

export async function createSubscriptionWithPriceSnapshot(
  req: CreateSubscriptionRequest,
): Promise<Subscription> {
  const { tenantId, serviceType, driverId, quantity, startsAt } = req;

  const metric = mapServiceTypeToMetric(serviceType);
  const effectiveTimestamp = startsAt ?? new Date();

  const resolved = await pricingEngine.resolvePrice({
    tenantId,
    metric,
    quantity,
    timestamp: effectiveTimestamp,
  });

  const createInput: CreateSubscriptionInput = {
    tenantId,
    serviceType,
    driverId: driverId ?? null,
    quantity,
    priceId: resolved.priceId,
    unitPriceCents: resolved.unitPriceCents,
    currency: resolved.currency,
    startsAt: effectiveTimestamp,
  };

  const subscription = await createSubscription(createInput);
  return subscription;
}
