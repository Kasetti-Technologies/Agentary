// src/middleware/tenantContext.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { JwtHeader } from 'jsonwebtoken';
import jwksClient, { SigningKey } from 'jwks-rsa';
import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Configure these via env / config
const JWKS_URI = process.env.JWKS_URI || 'https://auth.example.local/.well-known/jwks.json';
const JWKS_CACHE_MS = Number(process.env.JWKS_CACHE_MS || 5 * 60 * 1000); // 5 minutes

// Typed shape of expected tenant claims (extend as needed)
export interface TenantClaims {
  sub: string; // tenant_id (UUID)
  tenant_name: string;
  primary_region: string;
  allowed_regions: string[];
  roles: string[];
  org_id: string;
  correlation_id: string; // UUID preferred
  iat: number;
  exp: number;
  jti?: string;
  [k: string]: any;
}

const jwks = jwksClient({
  jwksUri: JWKS_URI,
  cache: true,
  cacheMaxEntries: 50,
  cacheMaxAge: JWKS_CACHE_MS,
});

// pg pool used by middleware; import or instantiate per your app pattern
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// helper to get public key from JWKS (typed)
function getKey(header: JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    const kid = header.kid;
    if (!kid) return reject(new Error('Missing kid in token header'));
    jwks.getSigningKey(kid, (err: Error | null, key?: SigningKey) => {
      if (err) return reject(err);
      try {
        // SigningKey has getPublicKey()
        const pub = key?.getPublicKey();
        if (!pub) return reject(new Error('Unable to obtain public key'));
        resolve(pub);
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Validate required claims (throws on invalid)
function validateTenantClaims(claims: TenantClaims): void {
  if (!claims.sub) throw new Error('missing sub (tenant_id)');
  if (!claims.tenant_name) throw new Error('missing tenant_name');
  if (!claims.primary_region) throw new Error('missing primary_region');
  if (!Array.isArray(claims.allowed_regions)) throw new Error('missing allowed_regions');
  if (!Array.isArray(claims.roles)) throw new Error('missing roles');
  if (!claims.org_id) throw new Error('missing org_id');
  if (!claims.correlation_id) throw new Error('missing correlation_id');
  if (!claims.iat || !claims.exp) throw new Error('missing iat/exp');
  // (Optional) add UUID format checks for sub and correlation_id if desired
}

// Attach types to Request for downstream usage
declare module 'express-serve-static-core' {
  interface Request {
    tenantContext?: TenantClaims;
    dbClient?: PoolClient; // request-scoped client (SET LOCAL applied)
  }
}

/**
 * tenantContextMiddleware:
 * - Validates X-Tenant-Context compact JWT using JWKS
 * - Ensures required claims exist
 * - Attaches tenantContext to req
 * - Acquires a DB client and runs SET LOCAL app.tenant_id = '<tenant_uuid>' on that connection
 */
export async function tenantContextMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  let client: PoolClient | undefined;
  try {
    const raw = req.header('X-Tenant-Context');
    if (!raw) {
      res.status(401).json({ code: 'MISSING_TOKEN', message: 'X-Tenant-Context required' });
      return;
    }

    const token = raw.trim();

    // decode header to get kid
    const decodedHeader = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString('utf8')) as JwtHeader;
    const pubKey = await getKey(decodedHeader);

    // verify token (synchronous throws if invalid)
    // allow algorithms configured for your env; ES384 is recommended for ECDSA P-384 signatures @25
    const verified = jwt.verify(token, pubKey, { algorithms: ['ES384', 'RS512'] }) as TenantClaims;

    // validate claim presence & shape
    validateTenantClaims(verified);

    // attach normalized tenantContext
    req.tenantContext = {
      ...verified,
    };

    // ensure correlation id header present
    if (!req.header('X-Correlation-Id')) {
      req.headers['x-correlation-id'] = verified.correlation_id || uuidv4();
    }

    // Acquire DB client and set session var (RLS depends on connection-scoped setting) @25 @26
    client = await pool.connect();
    await client.query('SET LOCAL app.tenant_id = $1', [verified.sub]);
    // attach client to req so downstream handlers reuse it
    req.dbClient = client;

    return next();
  } catch (errUnknown) {
    // narrow unknown to Error for safe usage (TS: errUnknown is 'unknown')
    const err = errUnknown instanceof Error ? errUnknown : new Error(String(errUnknown));
    // log minimal, non-sensitive audit info (do not log token contents)
    console.error('TenantContext validation failed:', err.message);
    // release client if acquired
    if (client) {
      try { client.release(); } catch (_) { /* ignore */ }
      req.dbClient = undefined;
    }
    res.status(401).json({ code: 'INVALID_TOKEN', message: 'Invalid X-Tenant-Context' });
    return;
  }
}

/**
 * releaseDbClientMiddleware:
 * - Releases the request-scoped DB client after response finishes
 * - Register this after tenantContextMiddleware (early in middleware chain)
 */
export function releaseDbClientMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    if (req.dbClient) {
      try {
        req.dbClient.release();
      } catch (e) {
        console.error('Error releasing db client:', e);
      }
      req.dbClient = undefined;
    }
  });
  next();
}
