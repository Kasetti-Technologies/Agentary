"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingEngine = void 0;
// src/pricing/pricingEngineInstance.ts
const pg_1 = require("pg");
const PricingEngine_1 = require("./PricingEngine");
// Shared Pool using DATABASE_URL
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
// Singleton instance of PricingEngine
exports.pricingEngine = new PricingEngine_1.PricingEngine(pool);
// Optional: re-export types if you defined them in PricingEngine.ts
// export type { ResolvePriceInput, ResolvePriceResult } from './PricingEngine';
