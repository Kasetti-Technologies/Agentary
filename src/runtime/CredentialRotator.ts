// src/runtime/CredentialRotator.ts
import { CredentialBrokerClient } from "./credentialBrokerClient";
import { globalCredentialStore } from "./credentialStore";

export interface CredentialRotatorOptions {
  tenantId: string;
  correlationId?: string;
  rotationSafetySeconds: number; // seconds before expiry to refresh
  retryDelaySeconds: number;     // seconds between retries on failure
}

type RefreshReason = "startup" | "scheduled" | "retry";

export class CredentialRotator {
  private client: CredentialBrokerClient;
  private opts: CredentialRotatorOptions;
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;

  constructor(client: CredentialBrokerClient, opts: CredentialRotatorOptions) {
    this.client = client;
    this.opts = opts;
  }

  async start(): Promise<void> {
    this.stopped = false;
    await this.refreshOnce("startup");
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async refreshOnce(reason: RefreshReason): Promise<void> {
    if (this.stopped) return;

    try {
      const cred = await this.client.issueCredential(
        this.opts.tenantId,
        this.opts.correlationId
      );

      globalCredentialStore.set(cred);

      console.log(
        `[CredentialRotator] (${reason}) issued credential for tenant=${cred.tenantId}, ` +
          `service=${cred.serviceId}, expires_at=${cred.expiresAt.toISOString()}`
      );

      this.scheduleNext(cred.expiresAt);
    } catch (err) {
      console.error("[CredentialRotator] Error fetching credential:", err);
      this.scheduleRetry();
    }
  }

  private scheduleNext(expiresAt: Date): void {
    if (this.stopped) return;

    const now = Date.now();
    const expiryMs = expiresAt.getTime();
    let delayMs =
      expiryMs - now - this.opts.rotationSafetySeconds * 1000;

    // Ensure we don't schedule insanely short intervals (< 5s)
    if (delayMs < 5000) {
      delayMs = 5000;
    }

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.refreshOnce("scheduled").catch((err) => {
        console.error(
          "[CredentialRotator] Error in scheduled refresh:",
          err
        );
      });
    }, delayMs);

    console.log(
      `[CredentialRotator] next refresh scheduled in ${Math.round(
        delayMs / 1000
      )}s (before expiry)`
    );
  }

  private scheduleRetry(): void {
    if (this.stopped) return;

    const delayMs = this.opts.retryDelaySeconds * 1000;

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.refreshOnce("retry").catch((err) => {
        console.error(
          "[CredentialRotator] Error in retry refresh:",
          err
        );
      });
    }, delayMs);

    console.log(
      `[CredentialRotator] retry scheduled in ${this.opts.retryDelaySeconds}s due to previous failure`
    );
  }
}
