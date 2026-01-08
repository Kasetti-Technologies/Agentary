-- invoices: one row per invoice (immutable once issued)
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id           UUID PRIMARY KEY,
  tenant_id            UUID NOT NULL,
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end   TIMESTAMPTZ NOT NULL,
  currency             TEXT NOT NULL DEFAULT 'USD',
  total_amount_cents   BIGINT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'draft', -- draft | issued | paid | voided
  archival_evidence_uri TEXT,                         -- S3 or archive location
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- invoice_line_items: link invoice to billing_events and prices
CREATE TABLE IF NOT EXISTS invoice_line_items (
  invoice_line_item_id UUID PRIMARY KEY,
  invoice_id           UUID NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  billing_event_id     UUID NOT NULL,        -- FK to billing_events.id (if you have that table)
  price_id             TEXT NOT NULL,        -- immutable price_id-at-purchase @1824
  quantity             NUMERIC NOT NULL,
  amount_cents         BIGINT NOT NULL,      -- billed amount for this line
  description          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OPTIONAL: mark which billing_events have been invoiced
ALTER TABLE billing_events
  ADD COLUMN IF NOT EXISTS invoice_id UUID NULL REFERENCES invoices(invoice_id);

CREATE INDEX IF NOT EXISTS idx_billing_events_uninvoiced
  ON billing_events(tenant_id, billing_period_start, billing_period_end)
  WHERE invoice_id IS NULL;
