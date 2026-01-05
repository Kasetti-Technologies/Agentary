"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingAggregator = void 0;
// src/runtime/BillingAggregator.ts
const kafkajs_1 = require("kafkajs");
class BillingAggregator {
    kafka;
    pool;
    pricing;
    options;
    constructor(pool, pricing, options) {
        this.pool = pool;
        this.pricing = pricing;
        this.options = options;
        this.kafka = new kafkajs_1.Kafka({
            clientId: 'billing-aggregator',
            brokers: options.kafkaBrokers,
        });
    }
    async start() {
        const consumer = this.kafka.consumer({ groupId: this.options.groupId });
        await consumer.connect();
        for (const topic of this.options.topics) {
            await consumer.subscribe({ topic, fromBeginning: false });
        }
        await consumer.run({
            eachMessage: async (payload) => {
                const { topic, message } = payload;
                try {
                    if (!message.value)
                        return;
                    const raw = message.value.toString('utf8');
                    console.log(`[BillingAggregator] Received message on ${topic}, raw=`, raw);
                    const event = JSON.parse(raw);
                    // Adjust these field names to match your usage-event schema:
                    const tenantId = event.tenant_id;
                    const serviceType = event.service_type; // e.g. 'NLP'
                    const eventType = event.event_type; // e.g. 'UDF_CALL'
                    const timestampStr = event.timestamp;
                    // FIXED: replaced \vert \vert with ||
                    const usageHash = event.event_hash || event.id || '';
                    const quantity = event.quantity ?? 1;
                    const timestamp = new Date(timestampStr);
                    const { windowStart, windowEnd } = computeMonthlyWindow(timestamp);
                    const { priceId, unitPrice, currency } = this.pricing.resolvePrice({
                        serviceType,
                        eventType,
                    });
                    const amount = unitPrice * quantity;
                    await this.insertBillingEvent({
                        tenantId,
                        serviceType,
                        usageEventId: event.id ?? null,
                        usageHash,
                        priceId,
                        priceAtPurchase: unitPrice,
                        quantity,
                        amount,
                        currency,
                        windowStart,
                        windowEnd,
                    });
                    console.log(`[BillingAggregator] Recorded billing_event for tenant=${tenantId}, service=${serviceType}, price_id=${priceId}, amount=${amount}`);
                }
                catch (err) {
                    console.error('[BillingAggregator] Failed to process message', err);
                }
            },
        });
        console.log('[BillingAggregator] Consumer started');
    }
    async insertBillingEvent(params) {
        const sql = `
      INSERT INTO billing_events (
        tenant_id,
        service_type,
        usage_event_id,
        usage_event_hash,
        price_id,
        price_at_purchase,
        quantity,
        amount,
        currency_code,
        window_start,
        window_end
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `;
        const values = [
            params.tenantId,
            params.serviceType,
            params.usageEventId,
            params.usageHash,
            params.priceId,
            params.priceAtPurchase,
            params.quantity,
            params.amount,
            params.currency,
            params.windowStart.toISOString(),
            params.windowEnd.toISOString(),
        ];
        try {
            await this.pool.query(sql, values);
        }
        catch (err) {
            console.error('[BillingAggregator] DB insert failed', err);
            throw err;
        }
        await this.pool.query(sql, values);
    }
}
exports.BillingAggregator = BillingAggregator;
function computeMonthlyWindow(ts) {
    const start = new Date(Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    return { windowStart: start, windowEnd: end };
}
