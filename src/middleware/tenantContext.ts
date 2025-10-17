import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { randomUUID } from 'crypto';

export interface TenantMiddlewareOptions {
  jwksUri?: string; // e.g. "https://auth.example.com/.well-known/jwks.json"
  expectedAudience?: string;
  expectedIssuer?: string;
  requireCorrelationId?: boolean;
  leewaySeconds?: number;
}

export interface TenantContext {
  sub: string; // tenant id
  org?: string;
  primary_region?: string;
  roles?: string[];
  raw?: JWTPayload;
}

/**
 * Creates Express middleware that resolves tenant context from a signed JWT (Authorization: Bearer...)
 * or from X-Tenant-Context header (compact JWT). If jwksUri is provided it will be used for verification.
 */
export function tenantContextMiddlewareFactory(
  opts: TenantMiddlewareOptions = {}
): RequestHandler {
  const {
    jwksUri,
    expectedAudience,
    expectedIssuer,
    requireCorrelationId = false,
    leewaySeconds = 60,
  } = opts;

  // Only create JWKS fetcher if jwksUri is a defined, non-empty string
  const jwks =
    typeof jwksUri === 'string' && jwksUri.length > 0
      ? createRemoteJWKSet(new URL(jwksUri))
      : undefined;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // === Correlation ID handling ===
      const hdrCorr = (req.header('x-correlation-id') ||
        req.header('X-Correlation-Id')) as string | undefined;
      let correlationId: string | undefined =
        typeof hdrCorr === 'string' ? hdrCorr : undefined;
      if (!correlationId) {
        correlationId = randomUUID();
      }

      // Propagate correlation id downstream and to response
      res.setHeader('x-correlation-id', correlationId);
      (res.locals as any).correlationId = correlationId;

      if (requireCorrelationId && !correlationId) {
        return res.status(400).json({ error: 'missing_correlation_id' });
      }

      // === Tenant token retrieval ===
      const authHeader = (req.headers.authorization ||
        (req.headers.Authorization as unknown)) as string | undefined;
      const headerToken = (req.header('x-tenant-context') ||
        req.header('X-Tenant-Context')) as string | undefined;

      const tenantToken =
        authHeader && authHeader.startsWith('Bearer ')
          ? authHeader.slice('Bearer '.length).trim()
          : headerToken;

      if (!tenantToken) {
        return res.status(401).json({ error: 'missing_tenant_token' });
      }

      // === Verify or decode token ===
      let payload: JWTPayload | undefined;

      if (jwks) {
        const verifyOpts: any = {};
        if (expectedAudience) verifyOpts.audience = expectedAudience;
        if (expectedIssuer) verifyOpts.issuer = expectedIssuer;
        if (leewaySeconds) verifyOpts.clockTolerance = leewaySeconds;

        const verified = await jwtVerify(tenantToken, jwks, verifyOpts);
        payload = verified.payload;
      } else {
        // Insecure decode for local/dev only (no signature verification)
        try {
          const parts = tenantToken.split('.');
          if (parts.length < 2) throw new Error('invalid token format');
          const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const json = Buffer.from(b64, 'base64').toString('utf8');
          payload = JSON.parse(json) as JWTPayload;
        } catch (e) {
          return res.status(401).json({ error: 'invalid_token_format' });
        }
      }

      // === Strongly-typed claim extraction ===
      const tenantId =
        typeof payload?.sub === 'string'
          ? payload.sub
          : typeof (payload as any)?.tenant_id === 'string'
          ? (payload as any).tenant_id
          : undefined;

      if (!tenantId) {
        return res.status(401).json({ error: 'tenant_id_missing_in_token' });
      }

      const orgClaim =
        typeof payload?.org === 'string'
          ? payload.org
          : typeof (payload as any)?.org_id === 'string'
          ? (payload as any).org_id
          : undefined;

      const regionClaim =
        typeof (payload as any)?.region === 'string'
          ? (payload as any).region
          : typeof (payload as any)?.primary_region === 'string'
          ? (payload as any).primary_region
          : undefined;

      const rolesClaim = Array.isArray(payload?.roles)
        ? (payload.roles as unknown[]).filter((r) => typeof r === 'string') as string[]
        : undefined;

      const tenantContext: TenantContext = {
        sub: tenantId,
        org: orgClaim,
        primary_region: regionClaim,
        roles: rolesClaim,
        raw: payload,
      };

      // Attach tenantContext to res.locals and req for downstream usage
      (res.locals as any).tenantContext = tenantContext;
      (req as any).tenantContext = tenantContext;

      return next();
    } catch (err: any) {
      // log verification failure with correlation id for observability
      console.error({
        correlationId: (res.locals as any).correlationId,
        error: err?.message ?? String(err),
      });

      return res.status(401).json({
        error: 'invalid_tenant_token',
        message: err?.message ?? String(err),
      });
    }
  };
}
