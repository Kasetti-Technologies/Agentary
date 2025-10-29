import { createHash } from 'crypto';

// This interface should align with your canonical usagepilot.v1 schema
interface IUsageEvent {
  customer_id: string;
  metric: string;
  timestamp: string;
  quantity: number;
  // Add other fields that are part of the canonical hash
}

/**
 * Computes a deterministic SHA256 hash for a usage event.
 * The canonical string format is critical for reconciliation.
 * RULES:
 * - Fields are in a fixed order.
 * - Strings are trimmed and lowercased.
 * - Timestamp is truncated to the minute to handle minor clock drift.
 * - Quantity is formatted to a fixed precision.
 * @param event The usage event payload.
 * @returns A lowercase hex string representing the SHA256 hash.
 */
export function computeEventHash(event: IUsageEvent): string {
  // 1. Canonicalize timestamp (truncate to the minute)
  const date = new Date(event.timestamp);
  date.setSeconds(0, 0);
  const timestampBucket = date.toISOString();

  // 2. Build the canonical string with a stable separator
  const canonicalString = [
    event.customer_id.trim().toLowerCase(),
    event.metric.trim().toLowerCase(),
    timestampBucket,
    event.quantity.toFixed(4) // Format to 4 decimal places for consistency
  ].join('|');

  // 3. Compute and return the SHA256 hash
  return createHash('sha256').update(canonicalString).digest('hex');
}
