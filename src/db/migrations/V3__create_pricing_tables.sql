-- V3__create_pricing_tables.sql
-- Pricing tables for PricingEngine (B-002)
-- Base prices, volume discounts, promotions, and tenant-specific overrides. @9 @18

-- Optional: create schema if you like grouping
CREATE SCHEMA IF NOT EXISTS pricing;

-- 1) Base prices: default list prices per metric (canonical price list)
CREATE TABLE IF NOT EXISTS pricing.base_prices (
  price_id           TEXT PRIMARY KEY,         -- immutable id (e.g. 'NLP_UDF_CALL_V1')
  metric             TEXT NOT NULL,           -- logical metric, e.g. 'nlp.udf_call'
  unit               TEXT NOT NULL,           -- 'call', 'email', 'page', etc.
  unit_price_cents   BIGINT NOT NULL,         -- price per unit in cents
  currency           CHAR(3) NOT NULL DEFAULT 'USD',
  effective_from     TIMESTAMPTZ NOT NULL,
  effective_to       TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_base_prices_metric_window
  ON pricing.base_prices (metric, effective_from, effective_to);

-- 2) Volume discounts: cheaper price for certain quantity ranges
CREATE TABLE IF NOT EXISTS pricing.volume_discounts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric             TEXT NOT NULL,
  min_quantity       NUMERIC(20,6) NOT NULL,
  max_quantity       NUMERIC(20,6) NOT NULL,
  unit_price_cents   BIGINT NOT NULL,
  currency           CHAR(3) NOT NULL DEFAULT 'USD',
  effective_from     TIMESTAMPTZ NOT NULL,
  effective_to       TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_volume_discounts_metric_window
  ON pricing.volume_discounts (metric, effective_from, effective_to);

-- 3) Promotions: temporary global discounts (campaigns)
CREATE TABLE IF NOT EXISTS pricing.promotions (
  promotion_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric             TEXT NOT NULL,
  discount_type      TEXT NOT NULL,           -- 'PERCENT' or 'ABSOLUTE'
  discount_value     NUMERIC(18,6) NOT NULL,  -- 10 => 10% or 10 cents depending on type
  currency           CHAR(3) NOT NULL DEFAULT 'USD',
  effective_from     TIMESTAMPTZ NOT NULL,
  effective_to       TIMESTAMPTZ NOT NULL,
  conditions         JSONB NULL,              -- future: plan/segment filters
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_promotions_metric_window
  ON pricing.promotions (metric, effective_from, effective_to);

-- 4) Tenant-specific overrides: highest precedence in B-002. @9 @18
CREATE TABLE IF NOT EXISTS pricing.overrides (
  override_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL,           -- FK to core.tenants(tenant_id)
  metric             TEXT NOT NULL,
  override_type      TEXT NOT NULL,           -- 'ABSOLUTE' | 'MARKUP_PERCENT' | 'MULTIPLIER'
  override_value     NUMERIC(18,6) NOT NULL,  -- meaning depends on type
  currency           CHAR(3) NOT NULL DEFAULT 'USD',
  effective_from     TIMESTAMPTZ NOT NULL,
  effective_to       TIMESTAMPTZ NOT NULL,
  reason             TEXT,
  created_by         TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_overrides_tenant_metric_window
  ON pricing.overrides (tenant_id, metric, effective_from, effective_to);

-- 5) Bundles / shared quota (optional; hook for later bundle/quota logic). @9 @18
CREATE TABLE IF NOT EXISTS pricing.bundles (
  bundle_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  metric             TEXT NOT NULL,
  included_quantity  NUMERIC(20,6) NOT NULL,
  period             TEXT NOT NULL,          -- e.g. 'MONTHLY', 'ANNUAL'
  overage_price_id   TEXT NULL,              -- references pricing.base_prices.price_id
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
