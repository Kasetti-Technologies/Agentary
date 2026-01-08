// src/billing/invoiceRepository.ts
import { randomUUID } from 'crypto';
import { Pool, PoolClient } from 'pg';
import { BillingEvent, Invoice, InvoiceLineItem } from './domain/invoice';

export class InvoiceRepository {
  constructor(private readonly pool: Pool) {}

  async getUninvoicedBillingEvents(
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ): Promise<Map<string, BillingEvent[]>> {
    const sql = `
      SELECT
        id,
        tenant_id,
        billing_period_start,
        billing_period_end,
        price_id,
        quantity,
        amount_cents,
        event_hash
      FROM billing_events
      WHERE invoice_id IS NULL
        AND billing_period_start >= $1
        AND billing_period_end   <= $2
    `;
    const res = await this.pool.query(sql, [billingPeriodStart, billingPeriodEnd]);

    const byTenant = new Map<string, BillingEvent[]>();

    for (const row of res.rows) {
      const event: BillingEvent = {
        id: row.id,
        tenantId: row.tenant_id,
        billingPeriodStart: row.billing_period_start,
        billingPeriodEnd: row.billing_period_end,
        priceId: row.price_id,
        quantity: Number(row.quantity),
        amountCents: Number(row.amount_cents),
        eventHash: row.event_hash,
      };

      const list = byTenant.get(event.tenantId) ?? [];
      list.push(event);
      byTenant.set(event.tenantId, list);
    }

    return byTenant;
  }

  async createInvoiceWithLines(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    events: BillingEvent[],
    currency: string,
    archivalEvidenceUri: string | null
  ): Promise<Invoice> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const invoiceId = randomUUID();

      const totalAmountCents = events.reduce(
        (sum, ev) => sum + ev.amountCents,
        0
      );

      const insertInvoiceSql = `
        INSERT INTO invoices (
          invoice_id,
          tenant_id,
          billing_period_start,
          billing_period_end,
          currency,
          total_amount_cents,
          status,
          archival_evidence_uri
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7)
        RETURNING created_at
      `;

      const invoiceRes = await client.query(insertInvoiceSql, [
        invoiceId,
        tenantId,
        periodStart,
        periodEnd,
        currency,
        totalAmountCents,
        archivalEvidenceUri,
      ]);

      const createdAt: Date = invoiceRes.rows[0].created_at;

      const insertLineSql = `
        INSERT INTO invoice_line_items (
          invoice_line_item_id,
          invoice_id,
          billing_event_id,
          price_id,
          quantity,
          amount_cents,
          description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      for (const ev of events) {
        const lineItemId = randomUUID();
        const description = `Billing event ${ev.id} (price_id=${ev.priceId})`;
        await client.query(insertLineSql, [
          lineItemId,
          invoiceId,
          ev.id,
          ev.priceId,
          ev.quantity,
          ev.amountCents,
          description,
        ]);
      }

      const updateEventsSql = `
        UPDATE billing_events
        SET invoice_id = $1
        WHERE id = ANY($2::uuid[])
      `;
      const eventIds = events.map((ev) => ev.id);
      await client.query(updateEventsSql, [invoiceId, eventIds]);

      await client.query('COMMIT');

      return {
        invoiceId,
        tenantId,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        currency,
        totalAmountCents,
        status: 'draft',
        archivalEvidenceUri: archivalEvidenceUri ?? undefined,
        createdAt,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
