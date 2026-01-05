import { Pool } from 'pg';
import { Subscription } from '../models/subscription';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface CreateSubscriptionInput {
  tenantId: string;
  serviceType: string;
  driverId?: string;
  quantity: number;
  priceId: string;
  unitPriceCents: number;
  currency: string;
  startsAt?: Date;
}

export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<Subscription> {
  const {
    tenantId,
    serviceType,
    driverId,
    quantity,
    priceId,
    unitPriceCents,
    currency,
    startsAt,
  } = input;

  const client = await pool.connect();
  try {
    const result = await client.query<Subscription>(
      `
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
      `,
      [
        tenantId,
        serviceType,
        driverId ?? null,
        quantity,
        priceId,
        unitPriceCents,
        currency,
        startsAt ?? new Date(),
      ],
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}
