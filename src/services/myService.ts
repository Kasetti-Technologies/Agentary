// src/services/myService.ts
import type { Request } from 'express';
import type { TenantClaims } from '../middleware/tenantContext.middleware';
import { createTenantAwareHttpClient } from '../utils/tenantAwareHttpClient';

/**
 * Calls a downstream partner API while automatically injecting
 * the tenant JWT (X‑Tenant‑Context) and correlation ID via the
 * tenant‑aware Axios client.
 *
 * @param req – the incoming Express request that already carries the
 *              tenant context (populated by `tenantContextMiddleware`).
 */
export async function callPartnerApi(req: Request): Promise<void> {
  // -----------------------------------------------------------------
  // Helper functions that expose the JWT and the decoded tenant context
  // -----------------------------------------------------------------
  const getJwt = (): string => req.header('X‑Tenant‑Context') ?? '';

  // The middleware adds `tenantContext` to the request; we cast to `any`
  // because the property isn’t in the default Express Request type.
  const getContext = (): TenantClaims | undefined =>
    (req as any).tenantContext;

  // -----------------------------------------------------------------
  // Build a client that injects the required headers on every request
  // -----------------------------------------------------------------
  const httpClient = createTenantAwareHttpClient(getJwt, getContext);

  // -----------------------------------------------------------------
  // Perform the outbound HTTP call
  // -----------------------------------------------------------------
  await httpClient.post('https://example.com/endpoint', { key: 'val' });
}
