"use strict";
// src/billing/subscriptionService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubscriptionWithPriceSnapshot = createSubscriptionWithPriceSnapshot;
const pricingEngineInstance_1 = require("../pricing/pricingEngineInstance");
// TODO: replace with your real DB insert logic
async function createSubscription(input) {
    // placeholder: implement with pg or your repo layer
    throw new Error('createSubscription() not implemented');
}
function mapServiceTypeToMetric(serviceType) {
    // Adjust to match your pricing.base_prices.metric values
    return `subscription.${serviceType.toLowerCase()}`;
}
async function createSubscriptionWithPriceSnapshot(req) {
    const { tenantId, serviceType, driverId, quantity, startsAt } = req;
    const metric = mapServiceTypeToMetric(serviceType);
    const effectiveTimestamp = startsAt ?? new Date();
    const resolved = await pricingEngineInstance_1.pricingEngine.resolvePrice({
        tenantId,
        metric,
        quantity,
        timestamp: effectiveTimestamp,
    });
    const createInput = {
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
