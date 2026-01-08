"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/billing-invoice-main.ts
const db_1 = require("./db");
const invoiceGenerator_1 = require("./billing/invoiceGenerator");
async function main() {
    const pool = (0, db_1.getDbPool)();
    const generator = new invoiceGenerator_1.InvoiceGenerator(pool);
    // For now, read billing period from environment or CLI args.
    // Example: BILLING_PERIOD_START=2025-01-01 BILLING_PERIOD_END=2025-01-31
    const startEnv = process.env.BILLING_PERIOD_START;
    const endEnv = process.env.BILLING_PERIOD_END;
    if (!startEnv || !endEnv) {
        console.error('BILLING_PERIOD_START and BILLING_PERIOD_END env vars are required');
        process.exit(1);
    }
    const billingPeriodStart = new Date(startEnv);
    const billingPeriodEnd = new Date(endEnv);
    console.log(`Generating invoices for period ${billingPeriodStart.toISOString()} to ${billingPeriodEnd.toISOString()}`);
    try {
        const invoices = await generator.generateInvoicesForPeriod(billingPeriodStart, billingPeriodEnd, process.env.INVOICE_CURRENCY || 'USD');
        console.log(`Generated ${invoices.length} invoices`);
        for (const inv of invoices) {
            console.log(`Invoice ${inv.invoiceId} tenant=${inv.tenantId} total=${inv.totalAmountCents} cents`);
        }
        process.exit(0);
    }
    catch (err) {
        console.error('Invoice generation failed:', err);
        process.exit(1);
    }
}
main();
