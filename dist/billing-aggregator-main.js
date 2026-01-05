"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/billing-aggregator-main.ts
const pgPool_1 = require("./runtime/pgPool");
const PricingService_1 = require("./runtime/PricingService");
const BillingAggregator_1 = require("./runtime/BillingAggregator");
async function main() {
    const pool = (0, pgPool_1.createPgPool)();
    const pricing = new PricingService_1.PricingService();
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const aggregator = new BillingAggregator_1.BillingAggregator(pool, pricing, {
        kafkaBrokers: brokers,
        groupId: 'billing-aggregator-v1',
        topics: [
            'usage.nlp', // adapt to your actual topic names
            'usage.agentic',
            'usage.summarizer',
        ],
    });
    await aggregator.start();
}
main().catch((err) => {
    console.error('[billing-aggregator-main] Fatal error', err);
    process.exit(1);
});
