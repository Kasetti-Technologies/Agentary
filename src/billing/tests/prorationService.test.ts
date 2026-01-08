// src/billing/__tests__/prorationService.test.ts

import { computeProratedDeltaCents, ProrationParams } from '../prorationService';

function makeDate(iso: string): Date {
  return new Date(iso);
}

describe('computeProratedDeltaCents', () => {
  it('returns 0 when quantity <= 0', () => {
    const params: ProrationParams = {
      oldUnitPriceCents: 1000,
      newUnitPriceCents: 2000,
      quantity: 0,
      changeDate: makeDate('2025-01-10T00:00:00Z'),
      billingPeriodStart: makeDate('2025-01-01T00:00:00Z'),
      billingPeriodEnd: makeDate('2025-01-31T00:00:00Z'),
    };
    expect(computeProratedDeltaCents(params)).toBe(0);
  });

  it('charges extra for mid-cycle upgrade', () => {
    const params: ProrationParams = {
      oldUnitPriceCents: 1000, // \$10
      newUnitPriceCents: 2000, // \$20
      quantity: 1,
      billingPeriodStart: makeDate('2025-01-01T00:00:00Z'),
      billingPeriodEnd: makeDate('2025-01-31T00:00:00Z'),
      changeDate: makeDate('2025-01-16T00:00:00Z'), // halfway
    };
    const delta = computeProratedDeltaCents(params);
    expect(delta).toBe(516); // around \$5.16
  });

  it('creates a credit for mid-cycle downgrade', () => {
    const params: ProrationParams = {
      oldUnitPriceCents: 2000, // \$20
      newUnitPriceCents: 1000, // \$10
      quantity: 1,
      billingPeriodStart: makeDate('2025-01-01T00:00:00Z'),
      billingPeriodEnd: makeDate('2025-01-31T00:00:00Z'),
      changeDate: makeDate('2025-01-16T00:00:00Z'),
    };
    const delta = computeProratedDeltaCents(params);
    expect(delta).toBe(-516);
  });

  it('handles change on last day of period as no proration', () => {
    const params: ProrationParams = {
      oldUnitPriceCents: 1000,
      newUnitPriceCents: 2000,
      quantity: 1,
      billingPeriodStart: makeDate('2025-01-01T00:00:00Z'),
      billingPeriodEnd: makeDate('2025-01-31T00:00:00Z'),
      changeDate: makeDate('2025-01-31T12:00:00Z'),
    };
    const delta = computeProratedDeltaCents(params);
    expect(delta).toBe(0);
  });

  it('clamps changeDate outside of billing range', () => {
    const params: ProrationParams = {
      oldUnitPriceCents: 1000,
      newUnitPriceCents: 2000,
      quantity: 1,
      billingPeriodStart: makeDate('2025-01-01T00:00:00Z'),
      billingPeriodEnd: makeDate('2025-01-31T00:00:00Z'),
      changeDate: makeDate('2024-12-15T00:00:00Z'), // before start
    };
    const delta = computeProratedDeltaCents(params);
    expect(delta).toBeGreaterThan(0);
  });
});
