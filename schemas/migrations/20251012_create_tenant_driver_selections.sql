CREATE TABLE IF NOT EXISTS tenant_driver_selections (
    selection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL,
    driver_id    UUID NOT NULL,
    selected_by  UUID NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    selected_tables JSONB NULL, -- reserved for later steps

    CONSTRAINT tenant_driver_unique UNIQUE (tenant_id, driver_id)
    -- optionally add FKs if tenants/drivers are in this DB:
    -- ,FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
    -- ,FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
);
