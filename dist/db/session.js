"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.acquireRequestClient = acquireRequestClient;
// src/db/session.ts
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    // optional tuning:
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: 30000,
});
exports.pool = pool;
/**
 * Acquire a dedicated client for the request, start a transaction and set session vars.
 * The middleware expects a named export acquireRequestClient(tenantId, isAdmin).
 */
async function acquireRequestClient(tenantId, isAdmin) {
    const client = await pool.connect();
    try {
        // Start a transaction so SET LOCAL applies to this connection only
        await client.query('BEGIN');
        // Parameterized SET LOCAL to avoid injection; these session vars are read by RLS/policies
        await client.query('SET LOCAL app.tenant_id = $1', [tenantId]);
        await client.query('SET LOCAL app.is_kasetti_admin = $1', [isAdmin ? 'true' : 'false']);
        return client;
    }
    catch (err) {
        // release on failure
        client.release();
        throw err;
    }
}
