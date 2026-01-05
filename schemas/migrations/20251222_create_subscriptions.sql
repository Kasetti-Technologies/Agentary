-- db/migrations/20251222_create_subscriptions.sql

CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            text        NOT NULL,
  service_type         text        NOT NULL,   -- e.g. "NLP", "AGENTIC_AI", "SUMMARIZER"
  driver_id            uuid        NULL,       -- optional link to a driver
  status               text        NOT NULL DEFAULT 'active',  -- active / canceled / trial
  quantity             numeric(18,6) NOT NULL DEFAULT 1,       -- seats / units

  -- price snapshot at time of purchase (for B-002 PricingEngine work)
  price_id             text        NOT NULL,   -- immutable pricing handle
  unit_price_cents     bigint      NOT NULL,   -- unit price at purchase in cents
  currency             char(3)     NOT NULL DEFAULT 'USD',

  starts_at            timestamptz NOT NULL DEFAULT now(),
  ends_at              timestamptz NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_tenant_idx
  ON subscriptions (tenant_id, status);
