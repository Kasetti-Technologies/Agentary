// src/billing/prorationService.ts

export interface ProrationParams {
  oldUnitPriceCents: number;    // price for old plan, per unit (e.g., per seat)
  newUnitPriceCents: number;    // price for new plan, per unit
  quantity: number;             // number of units (e.g., seats)
  changeDate: Date;             // when the plan change takes effect
  billingPeriodStart: Date;     // start of current billing cycle
  billingPeriodEnd: Date;       // end of current billing cycle
}

/**
 * Computes a prorated delta using:
 *   (newRate - oldRate) * (remainingDays / totalCycleDays) * quantity
 *
 * Positive result = extra charge (upgrade)
 * Negative result = credit (downgrade)
 *
 * Assumes all dates are in UTC or normalized consistently.
 */
export function computeProratedDeltaCents(params: ProrationParams): number {
  const {
    oldUnitPriceCents,
    newUnitPriceCents,
    quantity,
    changeDate,
    billingPeriodStart,
    billingPeriodEnd,
  } = params;

  if (quantity <= 0) {
    return 0;
  }

  // Clamp changeDate to the billing period, so we don't get negative days
  const clampedChange = clampToRange(changeDate, billingPeriodStart, billingPeriodEnd);

  const totalDays = diffInDaysUtc(billingPeriodStart, billingPeriodEnd);
  if (totalDays <= 0) {
    return 0;
  }

  // Remaining days from the change date (inclusive) until period end
  const remainingDays = diffInDaysUtc(clampedChange, billingPeriodEnd);
  if (remainingDays <= 0) {
    // Change at or after period end → no proration within this cycle
    return 0;
  }

  const rateDeltaCents = newUnitPriceCents - oldUnitPriceCents;
  const fraction = remainingDays / totalDays;

  const proratedPerUnitCents = rateDeltaCents * fraction;
  const totalProratedCents = proratedPerUnitCents * quantity;

  // Round to nearest cent
  return Math.round(totalProratedCents);
}

/**
 * Difference in whole days between two dates using UTC, inclusive of start day by design.
 */
function diffInDaysUtc(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());

  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = (endUtc - startUtc) / msPerDay;

  // +1 so a same-day start/end counts as 1 day
  return diff + 1;
}

function clampToRange(d: Date, min: Date, max: Date): Date {
  if (d < min) return new Date(min.getTime());
  if (d > max) return new Date(max.getTime());
  return d;
}
