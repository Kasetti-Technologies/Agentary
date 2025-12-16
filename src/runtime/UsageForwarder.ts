import axios from "axios";
import { randomUUID } from "crypto";

export interface RuntimeUsageEvent {
  metric: string;
  quantity: number;
  properties?: Record<string, unknown>;
}

/**
 * Configuration for the UsageForwarder.
 * - endpoint: Metering API ingestion endpoint (e.g. http://localhost:4000/api/v1/usage-events)
 * - tenantId: current tenant UUID (used in payload)
 * - primaryRegion: region tag for events (used in payload)
 * - tenantContextJwt: signed X‑Tenant‑Context JWT (passed in HTTP header)
 * - baseCorrelationId: optional base correlation id to reuse/derive from
 * - flushIntervalMs: how often to flush queued events (ms)
 * - maxBatchSize: max events per flush
 */
export interface UsageForwarderOptions {
  endpoint: string;
  tenantId: string;
  primaryRegion: string;
  tenantContextJwt: string;
  baseCorrelationId?: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
}

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
export class UsageForwarder {
  private readonly http: ReturnType<typeof axios.create>;
  private readonly opts: Required<UsageForwarderOptions>;
  private readonly queue: RuntimeUsageEvent[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(options: UsageForwarderOptions) {
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

    this.http = axios.create({
      timeout: 5_000,
    });
  }

  /**
   * Start periodic flushing.
   */
  start(): void {
    if (this.flushTimer) return;
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
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Record a usage event into the local queue.
   */
  record(metric: string, quantity: number, properties?: Record<string, unknown>): void {
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
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    // Take a snapshot of the current queue and clear it
    const batch: RuntimeUsageEvent[] = this.queue.splice(0, this.queue.length);

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
      } catch (err: any) {
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
  private buildUsagePayload(evt: RuntimeUsageEvent): Record<string, unknown> {
    return {
      schema_version: "usagepilot.v1",
      event_id: randomUUID(),
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
  private buildCorrelationId(): string {
    // Simple: baseCorrelationId + counter or UUID.
    // For now, use UUID to avoid extra state.
    return randomUUID();
  }
}
