"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialRotator = void 0;
const credentialStore_1 = require("./credentialStore");
class CredentialRotator {
    client;
    opts;
    timer = null;
    stopped = false;
    constructor(client, opts) {
        this.client = client;
        this.opts = opts;
    }
    async start() {
        this.stopped = false;
        await this.refreshOnce("startup");
    }
    stop() {
        this.stopped = true;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    async refreshOnce(reason) {
        if (this.stopped)
            return;
        try {
            const cred = await this.client.issueCredential(this.opts.tenantId, this.opts.correlationId);
            credentialStore_1.globalCredentialStore.set(cred);
            console.log(`[CredentialRotator] (${reason}) issued credential for tenant=${cred.tenantId}, ` +
                `service=${cred.serviceId}, expires_at=${cred.expiresAt.toISOString()}`);
            this.scheduleNext(cred.expiresAt);
        }
        catch (err) {
            console.error("[CredentialRotator] Error fetching credential:", err);
            this.scheduleRetry();
        }
    }
    scheduleNext(expiresAt) {
        if (this.stopped)
            return;
        const now = Date.now();
        const expiryMs = expiresAt.getTime();
        let delayMs = expiryMs - now - this.opts.rotationSafetySeconds * 1000;
        // Ensure we don't schedule insanely short intervals (< 5s)
        if (delayMs < 5000) {
            delayMs = 5000;
        }
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => {
            this.refreshOnce("scheduled").catch((err) => {
                console.error("[CredentialRotator] Error in scheduled refresh:", err);
            });
        }, delayMs);
        console.log(`[CredentialRotator] next refresh scheduled in ${Math.round(delayMs / 1000)}s (before expiry)`);
    }
    scheduleRetry() {
        if (this.stopped)
            return;
        const delayMs = this.opts.retryDelaySeconds * 1000;
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => {
            this.refreshOnce("retry").catch((err) => {
                console.error("[CredentialRotator] Error in retry refresh:", err);
            });
        }, delayMs);
        console.log(`[CredentialRotator] retry scheduled in ${this.opts.retryDelaySeconds}s due to previous failure`);
    }
}
exports.CredentialRotator = CredentialRotator;
