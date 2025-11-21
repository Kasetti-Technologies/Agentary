"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEventHash = computeEventHash;
const crypto_1 = require("crypto");
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
function computeEventHash(event) {
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
    return (0, crypto_1.createHash)('sha256').update(canonicalString).digest('hex');
}
