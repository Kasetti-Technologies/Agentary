// src/billing/domain/invoice.ts

export interface Invoice {
  invoiceId: string;
  tenantId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  currency: string;
  totalAmountCents: number;
  status: 'draft' | 'issued' | 'paid' | 'voided';
  archivalEvidenceUri?: string;
  createdAt: Date;
}

export interface InvoiceLineItem {
  invoiceLineItemId: string;
  invoiceId: string;
  billingEventId: string;
  priceId: string;
  quantity: number;
  amountCents: number;
  description?: string;
  createdAt: Date;
}

export interface BillingEvent {
  id: string;              // billing_events.id
  tenantId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  priceId: string;         // immutable price_id at purchase
  quantity: number;
  amountCents: number;
  eventHash: string;       // used for archival evidence bundle
}
