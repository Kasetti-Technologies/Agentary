// src/db/session.ts
import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // optional tuning:
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30000,
});

/**
 * Acquire a dedicated client for the request, start a transaction and set session vars.
 * The middleware expects a named export acquireRequestClient(tenantId, isAdmin).
 */
export async function acquireRequestClient(tenantId: string, isAdmin: boolean): Promise<PoolClient> {
  const client = await pool.connect();
  try {
    // Start a transaction so SET LOCAL applies to this connection only
    await client.query('BEGIN');

    // Parameterized SET LOCAL to avoid injection; these session vars are read by RLS/policies
    await client.query('SET LOCAL app.tenant_id = $1', [tenantId]);
    await client.query('SET LOCAL app.is_kasetti_admin = $1', [isAdmin ? 'true' : 'false']);

    return client;
  } catch (err) {
    // release on failure
    client.release();
    throw err;
  }
}

export { pool };
