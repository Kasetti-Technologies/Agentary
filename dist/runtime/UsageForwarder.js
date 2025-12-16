"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageForwarder = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
/**
 * UsageForwarder:
 *  - Collects runtime usage events via record()
 *  - Periodically flushes them to the metering API as individual POSTs
 *  - Attaches X‑Tenant‑Context and X‑Correlation‑Id headers
 *
 * NOTE: This is intentionally simple. You can later:
 *  - add smarter batching (bulk payloads),
 *  - add 429 Retry‑After + exponential backoff with jitter, etc. @54
 */
class UsageForwarder {
    http;
    opts;
    queue = [];
    flushTimer;
    constructor(options) {
        if (!options.endpoint) {
            throw new Error("UsageForwarder: endpoint is required");
        }
        if (!options.tenantId) {
            throw new Error("UsageForwarder: tenantId is required");
        }
        if (!options.primaryRegion) {
            throw new Error("UsageForwarder: primaryRegion is required");
        }
        if (!options.tenantContextJwt) {
            throw new Error("UsageForwarder: tenantContextJwt (X‑Tenant‑Context) is required");
        }
        this.opts = {
            flushIntervalMs: 5_000,
            maxBatchSize: 20,
            baseCorrelationId: `runtime-${Date.now()}`,
            ...options,
        };
        this.http = axios_1.default.create({
            timeout: 5_000,
        });
    }
    /**
     * Start periodic flushing.
     */
    start() {
        if (this.flushTimer)
            return;
        this.flushTimer = setInterval(() => {
            this.flush().catch((err) => {
                // Log but do not crash runtime
                console.error("[UsageForwarder] flush error", err);
            });
        }, this.opts.flushIntervalMs);
    }
    /**
     * Stop periodic flushing (does not auto‑flush leftover events).
     */
    stop() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = undefined;
        }
    }
    /**
     * Record a usage event into the local queue.
     */
    record(metric, quantity, properties) {
        this.queue.push({ metric, quantity, properties });
        // Optional: flush immediately if we hit batch size
        if (this.queue.length >= this.opts.maxBatchSize) {
            this.flush().catch((err) => {
                console.error("[UsageForwarder] flush error (immediate)", err);
            });
        }
    }
    /**
     * Flush queued events to the metering API.
     *
     * For simplicity, we POST one event per request to `/api/v1/usage-events`,
     * matching the canonical ingestion contract. @59
     */
    async flush() {
        if (this.queue.length === 0)
            return;
        // Take a snapshot of the current queue and clear it
        const batch = this.queue.splice(0, this.queue.length);
        for (const evt of batch) {
            const body = this.buildUsagePayload(evt);
            try {
                const correlationId = this.buildCorrelationId();
                await this.http.post(this.opts.endpoint, body, {
                    headers: {
                        "X-Tenant-Context": this.opts.tenantContextJwt,
                        "X-Correlation-Id": correlationId,
                        "Content-Type": "application/json",
                    },
                });
                // You could log success with event_id or correlationId if desired
            }
            catch (err) {
                // Basic error handling:
                //  - log
                //  - re‑queue so it can be retried on next flush
                console.error("[UsageForwarder] failed to POST usage event, re‑queueing", {
                    error: err?.message ?? String(err),
                });
                this.queue.unshift(evt);
                // OPTIONAL: If you want to handle 429 Retry‑After specifically later:
                // if (axios.isAxiosError(err) && err.response?.status === 429) {
                //   const retryAfterHeader = err.response.headers["retry-after"];
                //   // parse and delay flush, implement backoff/jitter, etc. @54
                // }
                break; // stop processing batch to avoid hammering endpoint
            }
        }
    }
    /**
     * Build canonical payload aligning with usagepilot.v1 (minimal subset). @59 @95
     */
    buildUsagePayload(evt) {
        return {
            schema_version: "usagepilot.v1",
            event_id: (0, crypto_1.randomUUID)(),
            tenant_id: this.opts.tenantId,
            metric: evt.metric,
            quantity: evt.quantity,
            primary_region: this.opts.primaryRegion,
            timestamp: new Date().toISOString(),
            payload: evt.properties ?? {},
            // estimated_cost_usd, idempotency_key, event_hash, etc. can be added later
        };
    }
    /**
     * Derive a correlation id for each POST.
     */
    buildCorrelationId() {
        // Simple: baseCorrelationId + counter or UUID.
        // For now, use UUID to avoid extra state.
        return (0, crypto_1.randomUUID)();
    }
}
exports.UsageForwarder = UsageForwarder;
