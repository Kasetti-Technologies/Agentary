// src/pricing/PricingEngine.ts

import { Pool } from 'pg';

export type DerivedFrom = 'BASE' | 'VOLUME' | 'PROMOTION' | 'OVERRIDE';

export interface ResolvePriceInput {
  tenantId: string;
  metric: string;             // e.g. 'nlp.udf_call'
  quantity: number;           // usage quantity
  timestamp?: Date;           // when the usage is effective
  bundleId?: string | null;   // reserved for shared‑quota/bundles later
}

export interface ResolvePriceResult {
  priceId: string;            // immutable price_id snapshot
  unitPriceCents: number;     // integer cents
  unitPriceUsd: number;
  currency: string;
  derivedFrom: DerivedFrom;
}

/**
 * PricingEngine:
 * - Reads from pricing.base_prices, pricing.volume_discounts,
 *   pricing.promotions, pricing.overrides.
 * - Precedence: override → promotion → volume discount → base.
 */
export class PricingEngine {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Resolve the unit price for a given tenant / metric / quantity / timestamp.
   */
  async resolvePrice(input: ResolvePriceInput): Promise<ResolvePriceResult> {
    const ts = input.timestamp ?? new Date();

    // 1) Base price (required)
    const base = await this.loadBasePrice(input.metric, ts);
    if (!base) {
      throw new Error(`No base price configured for metric=${input.metric}`);
    }

    let unitPriceCents = Number(base.unit_price_cents);
    let derivedFrom: DerivedFrom = 'BASE';

    // 2) Volume discount (if any)
    const volume = await this.loadVolumeDiscount(input.metric, input.quantity, ts);
    if (volume) {
      unitPriceCents = Number(volume.unit_price_cents);
      derivedFrom = 'VOLUME';
    }

    // 3) Promotion (if any)
    const promo = await this.loadPromotion(input.metric, ts);
    if (promo) {
      unitPriceCents = this.applyPromotion(
        unitPriceCents,
        promo.discount_type,
        promo.discount_value,
      );
      derivedFrom = 'PROMOTION';
    }

    // 4) Tenant override (highest precedence)
    const override = await this.loadOverride(input.tenantId, input.metric, ts);
    if (override) {
      unitPriceCents = this.applyOverride(
        unitPriceCents,
        override.override_type,
        override.override_value,
      );
      derivedFrom = 'OVERRIDE';
    }

    const unitPriceUsd = unitPriceCents / 100;

    return {
      priceId: base.price_id,
      unitPriceCents,
      unitPriceUsd,
      currency: base.currency ?? 'USD',
      derivedFrom,
    };
  }

  /**
   * Convenience: compute estimated_cost_usd for a given quantity using the
   * resolved unit price.
   */
  async estimateCostUsd(
    input: ResolvePriceInput,
  ): Promise<{
    priceId: string;
    unitPriceCents: number;
    unitPriceUsd: number;
    currency: string;
    derivedFrom: DerivedFrom;
    estimatedCostUsd: number;
  }> {
    const resolved = await this.resolvePrice(input);
    const estimatedCostUsd = resolved.unitPriceUsd * input.quantity;
    return { ...resolved, estimatedCostUsd };
  }

  // ─────────────────────────────
  // Internal DB helpers
  // ─────────────────────────────

  private async loadBasePrice(metric: string, ts: Date) {
    const sql = `
      SELECT price_id, metric, unit, unit_price_cents, currency
      FROM pricing.base_prices
      WHERE metric = $1
        AND effective_from <= $2
        AND effective_to   > $2
      ORDER BY effective_from DESC
      LIMIT 1;
    `;
    const result = await this.pool.query(sql, [metric, ts]);
    return result.rows[0] ?? null;
  }

  private async loadVolumeDiscount(metric: string, quantity: number, ts: Date) {
    const sql = `
      SELECT id, metric, min_quantity, max_quantity, unit_price_cents, currency
      FROM pricing.volume_discounts
      WHERE metric = $1
        AND effective_from <= $2
        AND effective_to   > $2
        AND min_quantity   <= $3
        AND max_quantity   >= $3
      ORDER BY min_quantity DESC
      LIMIT 1;
    `;
    const result = await this.pool.query(sql, [metric, ts, quantity]);
    return result.rows[0] ?? null;
  }

  private async loadPromotion(metric: string, ts: Date) {
    const sql = `
      SELECT promotion_id, metric, discount_type, discount_value, currency
      FROM pricing.promotions
      WHERE metric = $1
        AND effective_from <= $2
        AND effective_to   > $2
      ORDER BY effective_from DESC
      LIMIT 1;
    `;
    const result = await this.pool.query(sql, [metric, ts]);
    return result.rows[0] ?? null;
  }

  private async loadOverride(tenantId: string, metric: string, ts: Date) {
    const sql = `
      SELECT override_id, tenant_id, metric, override_type, override_value, currency
      FROM pricing.overrides
      WHERE tenant_id      = $1
        AND metric         = $2
        AND effective_from <= $3
        AND effective_to   > $3
      ORDER BY effective_from DESC
      LIMIT 1;
    `;
    const result = await this.pool.query(sql, [tenantId, metric, ts]);
    return result.rows[0] ?? null;
  }

  // ─────────────────────────────
  // Calculation helpers
  // ─────────────────────────────

  private applyPromotion(
    baseCents: number,
    discountTypeRaw: string,
    discountValueRaw: any,
  ): number {
    const type = (discountTypeRaw || '').toUpperCase();
    const value = Number(discountValueRaw);

    if (type === 'PERCENT') {
      const discount = Math.round((baseCents * value) / 100); // 10 => 10% off
      return Math.max(baseCents - discount, 0);
    }

    if (type === 'ABSOLUTE') {
      const discount = Math.round(value); // 50 => 50 cents off
      return Math.max(baseCents - discount, 0);
    }

    // Unknown type – no change
    return baseCents;
  }

  private applyOverride(
    baseCents: number,
    overrideTypeRaw: string,
    overrideValueRaw: any,
  ): number {
    const type = (overrideTypeRaw || '').toUpperCase();
    const value = Number(overrideValueRaw);

    if (type === 'ABSOLUTE') {
      // Force to this absolute price (cents)
      return Math.max(Math.round(value), 0);
    }

    if (type === 'MARKUP_PERCENT') {
      // 10 => add 10% markup
      const delta = Math.round((baseCents * value) / 100);
      return Math.max(baseCents + delta, 0);
    }

    if (type === 'MULTIPLIER') {
      // 1.2 => 20% increase
      return Math.max(Math.round(baseCents * value), 0);
    }

    // Unknown type – fallback to base
    return baseCents;
  }
}
