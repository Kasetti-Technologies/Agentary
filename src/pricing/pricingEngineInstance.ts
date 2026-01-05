// src/pricing/pricingEngineInstance.ts
import { Pool } from 'pg';
import { PricingEngine } from './PricingEngine';

// Shared Pool using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Singleton instance of PricingEngine
export const pricingEngine = new PricingEngine(pool);

// Optional: re-export types if you defined them in PricingEngine.ts
// export type { ResolvePriceInput, ResolvePriceResult } from './PricingEngine';
