"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceRepository = void 0;
// src/billing/invoiceRepository.ts
const crypto_1 = require("crypto");
class InvoiceRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async getUninvoicedBillingEvents(billingPeriodStart, billingPeriodEnd) {
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
        const byTenant = new Map();
        for (const row of res.rows) {
            const event = {
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
    async createInvoiceWithLines(tenantId, periodStart, periodEnd, events, currency, archivalEvidenceUri) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const invoiceId = (0, crypto_1.randomUUID)();
            const totalAmountCents = events.reduce((sum, ev) => sum + ev.amountCents, 0);
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
            const createdAt = invoiceRes.rows[0].created_at;
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
                const lineItemId = (0, crypto_1.randomUUID)();
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
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
}
exports.InvoiceRepository = InvoiceRepository;
