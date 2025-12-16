// src/billing-aggregator-main.ts
import { createPgPool } from './runtime/pgPool';
import { PricingService } from './runtime/PricingService';
import { BillingAggregator } from './runtime/BillingAggregator';

async function main() {
  const pool = createPgPool();
  const pricing = new PricingService();

  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

  const aggregator = new BillingAggregator(pool, pricing, {
    kafkaBrokers: brokers,
    groupId: 'billing-aggregator-v1',
    topics: [
      'usage.nlp',        // adapt to your actual topic names
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
