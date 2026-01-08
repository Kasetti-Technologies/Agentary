"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceGenerator = void 0;
const invoiceRepository_1 = require("./invoiceRepository");
const archivalEvidence_1 = require("./archivalEvidence");
class InvoiceGenerator {
    repo;
    constructor(pool) {
        this.repo = new invoiceRepository_1.InvoiceRepository(pool);
    }
    /**
     * Generate invoices for a given billing period.
     * billingPeriodStart/billingPeriodEnd should match your billing_cycles table.
     */
    async generateInvoicesForPeriod(billingPeriodStart, billingPeriodEnd, defaultCurrency = 'USD') {
        const results = [];
        const eventsByTenant = await this.repo.getUninvoicedBillingEvents(billingPeriodStart, billingPeriodEnd);
        for (const [tenantId, events] of eventsByTenant.entries()) {
            if (events.length === 0)
                continue;
            // 1. Create archival evidence bundle (list of event_hashes + S3 ref)
            const { archivalEvidenceUri } = await (0, archivalEvidence_1.createArchivalEvidenceBundle)(
            /* invoiceId placeholder; real ID is created in repo */ `pending-${tenantId}`, events);
            // 2. Create the invoice and line items (repo will generate invoice_id)
            const invoice = await this.repo.createInvoiceWithLines(tenantId, billingPeriodStart, billingPeriodEnd, events, defaultCurrency, archivalEvidenceUri);
            results.push(invoice);
        }
        return results;
    }
}
exports.InvoiceGenerator = InvoiceGenerator;
