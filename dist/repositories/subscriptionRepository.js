"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubscription = createSubscription;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
async function createSubscription(input) {
    const { tenantId, serviceType, driverId, quantity, priceId, unitPriceCents, currency, startsAt, } = input;
    const client = await pool.connect();
    try {
        const result = await client.query(`
      INSERT INTO subscriptions (
        tenant_id,
        service_type,
        driver_id,
        status,
        quantity,
        price_id,
        unit_price_cents,
        currency,
        starts_at
      )
      VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8)
      RETURNING
        subscription_id,
        tenant_id,
        service_type,
        driver_id,
        status,
        quantity,
        price_id,
        unit_price_cents,
        currency,
        starts_at,
        ends_at,
        created_at
      `, [
            tenantId,
            serviceType,
            driverId ?? null,
            quantity,
            priceId,
            unitPriceCents,
            currency,
            startsAt ?? new Date(),
        ]);
        return result.rows[0];
    }
    finally {
        client.release();
    }
}
