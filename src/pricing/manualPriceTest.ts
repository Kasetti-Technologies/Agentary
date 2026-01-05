// src/pricing/manualPriceTest.ts

import { Pool } from 'pg';
import { PricingEngine } from './PricingEngine'; // adjust path if needed

async function main(): Promise<void> {
  // 1) Create Postgres connection pool (matches your local dev setup)
  const connectionString: string =
    process.env.DATABASE_URL ?? 'postgres://dev:devpass@localhost:5432/agentary';

  const pool = new Pool({ connectionString });

  // 2) Instantiate PricingEngine with the pool
  const engine = new PricingEngine(pool);

  // 3) Define test input
  // Use a tenant_id that you seeded overrides/promos for; if you used a specific UUID,
  // replace this with that value.
  const tenantId = '00000000-0000-0000-0000-000000000001'; // TODO: replace if needed
  const metric = 'nlp.udf_call';
  const quantity = 100; // e.g., 100 UDF calls
  const effectiveAt = new Date(); // now

  try {
    // 4) Resolve price using the engine
    // IMPORTANT: resolvePrice expects ONE argument (an object), not 4 separate args.
    const result = await engine.resolvePrice({
      tenantId,
      metric,
      quantity,
      effectiveAt,
    } as any); // 'as any' to bypass TS mismatch if your type names differ slightly

    // 5) Pretty‑print the result
    console.log('=== PricingEngine manual test ===');
    console.log(`Tenant ID   : ${tenantId}`);
    console.log(`Metric      : ${metric}`);
    console.log(`Quantity    : ${quantity}`);
    console.log(`Effective At: ${effectiveAt.toISOString()}`);
    console.log('--- Raw resolved price result ---');
    console.log(JSON.stringify(result, null, 2));

    // Optional: human‑readable summary if these fields exist
    if (
      (result as any).unitPriceCents !== undefined &&
      (result as any).amountCents !== undefined &&
      (result as any).priceId
    ) {
      const unit = (result as any).unitPriceCents as number;
      const amount = (result as any).amountCents as number;
      const priceId = (result as any).priceId as string;
      const source = ((result as any).source as string) || 'unknown';

      console.log('');
      console.log(
        `Price ID    : ${priceId} (source: ${source}, e.g. override/promo/volume/base)`
      );
      console.log(`Unit price  : ${(unit / 100).toFixed(4)} USD`);
      console.log(`Total amount: ${(amount / 100).toFixed(4)} USD`);
    }
  } catch (err) {
    console.error('PricingEngine manual test FAILED:', err);
  } finally {
    // 6) Cleanup
    await pool.end();
  }
}

// Run if called directly (ts-node)
main().catch((err) => {
  console.error('Fatal error in manualPriceTest:', err);
  process.exit(1);
});
