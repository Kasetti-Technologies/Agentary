// services/TenantDriverSelectionService.js

// Re‑use your existing DB helper
const db = require('../database');

class TenantDriverSelectionService {
  /**
   * Insert a selection row for a tenant/driver.
   * Columns assume:
   *   tenant_driver_selections(
   *     selection_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   *     tenant_id     UUID NOT NULL,
   *     driver_id     UUID NOT NULL,
   *     selected_by   TEXT,
   *     created_at    TIMESTAMPTZ DEFAULT now(),
   *     selected_tables JSONB NULL
   *   )
   */
  async selectDriver({ tenantId, driverId, selectedBy }) {
    const result = await db.query(
      `
      INSERT INTO tenant_driver_selections (tenant_id, driver_id, selected_by)
      VALUES ($1, $2, $3)
      RETURNING *;
      `,
[tenantId, driverId, selectedBy | null]

    );

    return result.rows[0];
  }

  /**
   * (Optional) Get all selections for a tenant, useful for future UI.
   */
  async listSelectionsForTenant(tenantId) {
    const result = await db.query(
      `
      SELECT *
      FROM tenant_driver_selections
      WHERE tenant_id = $1
      ORDER BY created_at DESC;
      `,
      [tenantId]
    );
    return result.rows;
  }
}

module.exports = new TenantDriverSelectionService();
