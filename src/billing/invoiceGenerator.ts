// src/billing/invoiceGenerator.ts
import { Pool } from 'pg';
import { Invoice } from './domain/invoice';
import { InvoiceRepository } from './invoiceRepository';
import { createArchivalEvidenceBundle } from './archivalEvidence';

export class InvoiceGenerator {
  private readonly repo: InvoiceRepository;

  constructor(pool: Pool) {
    this.repo = new InvoiceRepository(pool);
  }

  /**
   * Generate invoices for a given billing period.
   * billingPeriodStart/billingPeriodEnd should match your billing_cycles table.
   */
  async generateInvoicesForPeriod(
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
    defaultCurrency = 'USD'
  ): Promise<Invoice[]> {
    const results: Invoice[] = [];

    const eventsByTenant = await this.repo.getUninvoicedBillingEvents(
      billingPeriodStart,
      billingPeriodEnd
    );

    for (const [tenantId, events] of eventsByTenant.entries()) {
      if (events.length === 0) continue;

      // 1. Create archival evidence bundle (list of event_hashes + S3 ref)
      const { archivalEvidenceUri } = await createArchivalEvidenceBundle(
        /* invoiceId placeholder; real ID is created in repo */ `pending-${tenantId}`,
        events
      );

      // 2. Create the invoice and line items (repo will generate invoice_id)
      const invoice = await this.repo.createInvoiceWithLines(
        tenantId,
        billingPeriodStart,
        billingPeriodEnd,
        events,
        defaultCurrency,
        archivalEvidenceUri
      );

      results.push(invoice);
    }

    return results;
  }
}
