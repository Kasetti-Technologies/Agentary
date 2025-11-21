"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callPartnerApi = callPartnerApi;
const tenantAwareHttpClient_1 = require("../utils/tenantAwareHttpClient");
/**
 * Calls a downstream partner API while automatically injecting
 * the tenant JWT (X‑Tenant‑Context) and correlation ID via the
 * tenant‑aware Axios client.
 *
 * @param req – the incoming Express request that already carries the
 *              tenant context (populated by `tenantContextMiddleware`).
 */
async function callPartnerApi(req) {
    // -----------------------------------------------------------------
    // Helper functions that expose the JWT and the decoded tenant context
    // -----------------------------------------------------------------
    const getJwt = () => req.header('X‑Tenant‑Context') ?? '';
    // The middleware adds `tenantContext` to the request; we cast to `any`
    // because the property isn’t in the default Express Request type.
    const getContext = () => req.tenantContext;
    // -----------------------------------------------------------------
    // Build a client that injects the required headers on every request
    // -----------------------------------------------------------------
    const httpClient = (0, tenantAwareHttpClient_1.createTenantAwareHttpClient)(getJwt, getContext);
    // -----------------------------------------------------------------
    // Perform the outbound HTTP call
    // -----------------------------------------------------------------
    await httpClient.post('https://example.com/endpoint', { key: 'val' });
}
