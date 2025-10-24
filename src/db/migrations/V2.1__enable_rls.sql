-- V2.1__enable_rls.sql

-- IMPORTANT: These commands must be run by a superuser role (e.g., 'postgres' or a privileged DBA role).

-- 1. Configuration Check (Optional but recommended)
-- Ensure the privileged role exists for bypass (e.g., Billing Orchestrator, SRE tools)
-- CREATE ROLE kasetti_superuser WITH LOGIN NOSUPERUSER PASSWORD 'secure_password';


-----------------------------------------------------------
-- A. core.tenants (Tenant Profile Table)
-----------------------------------------------------------
-- 1. Enable RLS
ALTER TABLE core.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Define Policy: Tenants can only see/modify their own row.
CREATE POLICY tenant_isolation_policy
    ON core.tenants
    -- Apply to all roles (TO PUBLIC)
    TO PUBLIC
    -- Rule for selecting/reading data (USING)
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    -- Rule for inserting/updating data (WITH CHECK)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);


-----------------------------------------------------------
-- B. events.usage_events (Metering Data Table)
-----------------------------------------------------------
-- 1. Enable RLS
ALTER TABLE events.usage_events ENABLE ROW LEVEL SECURITY;

-- 2. Define Policy: Events must belong to the session tenant.
CREATE POLICY usage_isolation_policy
    ON events.usage_events
    TO PUBLIC
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);


-----------------------------------------------------------
-- C. billing.invoices (Invoice Snapshots Table)
-----------------------------------------------------------
-- 1. Enable RLS
ALTER TABLE billing.invoices ENABLE ROW LEVEL SECURITY;

-- 2. Define Policy: Invoices are only visible to the owning tenant.
CREATE POLICY invoice_isolation_policy
    ON billing.invoices
    TO PUBLIC
    -- Note: We only apply USING because INSERT/UPDATE/DELETE are usually handled by privileged back-end jobs (RLS Bypass).
    USING (tenant_id = current_setting('app.tenant_id')::uuid);


-----------------------------------------------------------
-- D. catalog.drivers (Global Driver Catalog Table - No tenant_id column)
-----------------------------------------------------------
-- 1. Enable RLS
ALTER TABLE catalog.drivers ENABLE ROW LEVEL SECURITY;

-- 2. Define Policy (Read Access): Allow any authenticated user (who has set app.tenant_id) to read the global catalog.
CREATE POLICY driver_catalog_read_policy
    ON catalog.drivers
    FOR SELECT -- Only applies to SELECT statements
    TO PUBLIC
    -- Policy simply checks if the session variable is set (i.e., user is authenticated).
    USING (current_setting('app.tenant_id', TRUE) IS NOT NULL);

-- 3. Define Policy (Write Restriction): Explicitly allow only the privileged role to modify the catalog.
-- If the user is NOT the kasetti_superuser, they will be implicitly denied write access.
-- This ensures clients or regular admins cannot alter global pricing/catalog data.
-- If you need this explicit write policy, ensure 'kasetti_superuser' is the role that owns the table/schema.
