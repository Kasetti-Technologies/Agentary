CREATE TABLE IF NOT EXISTS billing_events (
    billing_event_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id             text        NOT NULL,
    service_type          text        NOT NULL,   -- e.g. "NLP", "AGENTIC_AI", "SUMMARIZER"

    -- reference to the usage event that generated this billing_event
    usage_event_id        text        NULL,
    usage_event_hash      text        NOT NULL,

    price_id              text        NOT NULL,   -- immutable pricing handle
    price_at_purchase     numeric(18,6) NOT NULL, -- unit price at time of event
    quantity              numeric(18,6) NOT NULL,
    amount                numeric(18,6) NOT NULL, -- quantity * price_at_purchase
    currency_code         text        NOT NULL DEFAULT 'USD',

    window_start          timestamptz NOT NULL,
    window_end            timestamptz NOT NULL,

    created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_events_tenant_window_idx
    ON billing_events (tenant_id, window_start, window_end);
