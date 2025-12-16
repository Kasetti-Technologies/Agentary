// src/services/SelectionService.js

// Reuse your existing DB helper, same as DriverService.js
const { Pool } = require('pg');

// Create a connection pool to Postgres.
// Uses DATABASE_URL if set, otherwise falls back to local dev DB.
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://dev:devpass@localhost:5432/agentary',
});

/**
 * A single table selection from the UI.
 * Example shape:
 * {
 *   schema: "public",
 *   table: "orders",
 *   columns: ["id", "amount"]
 * }
 */
function TableSelection(schema, table, columns) {
  this.schema = schema;
  this.table = table;
  this.columns = columns;
}

/**
 * Count unique tables and total fields and compare with plan limits.
 * Enforces subscription quotas for selected tables and fields.
 *
 * @param {Object} selectionRequest
 * @param {string} selectionRequest.driverId
 * @param {Array<TableSelection>} selectionRequest.selections
 * @param {Object} limits
 * @param {number} limits.maxTables
 * @param {number} limits.maxFields
 * @returns {{ok: boolean, reason?: string, usedTables?: number, usedFields?: number, maxTables?: number, maxFields?: number}}
 */
function checkSelectionAgainstPlan(selectionRequest, limits) {
  const tableKeys = new Set();
  let fieldCount = 0;

  for (const sel of selectionRequest.selections) {
    const key = `${sel.schema}.${sel.table}`;
    tableKeys.add(key);
    fieldCount += (sel.columns || []).length;
  }

  const usedTables = tableKeys.size;
  const usedFields = fieldCount;

  if (usedTables > limits.maxTables) {
    return {
      ok: false,
      reason: 'TABLE_LIMIT',
      usedTables,
      usedFields,
      maxTables: limits.maxTables,
      maxFields: limits.maxFields,
    };
  }

  if (usedFields > limits.maxFields) {
    return {
      ok: false,
      reason: 'FIELD_LIMIT',
      usedTables,
      usedFields,
      maxTables: limits.maxTables,
      maxFields: limits.maxFields,
    };
  }

  return {
    ok: true,
    usedTables,
    usedFields,
    maxTables: limits.maxTables,
    maxFields: limits.maxFields,
  };
}

/**
 * For now, return hard‑coded plan limits based on subscription tier.
 * Later, replace this with a real lookup from subscriptions/billing.
 */
async function getPlanLimitsForTenant(tenantId, driverId) {
  // TODO: read from subscription system; for now use Pro-like defaults
  return {
    maxTables: 15,
    maxFields: 150,
  };
}

/**
 * Save or update the tenant's table/field selection for a driver.
 *
 * Writes into your existing table:
 *   tenant_driver_selections (tenant_id, driver_id, selected_by, selected_tables)
 */
async function saveSelection(tenantId, selectedBy, selectionRequest) {
  const selectedTables = selectionRequest.selections.map((s) => ({
    schema: s.schema,
    table: s.table,
    columns: s.columns || [],
  }));

  // NOTE: using ON CONFLICT on (tenant_id, driver_id) as defined in your DDL
  const sql = `
    INSERT INTO tenant_driver_selections (
      tenant_id,
      driver_id,
      selected_by,
      selected_tables
    )
    VALUES ($1, $2, $3, $4::jsonb)
    ON CONFLICT (tenant_id, driver_id)
    DO UPDATE SET
      selected_by      = EXCLUDED.selected_by,
      selected_tables  = EXCLUDED.selected_tables,
      created_at       = NOW()
  `;

  const params = [
    tenantId,
    selectionRequest.driverId,
    selectedBy,
    JSON.stringify(selectedTables),
  ];

await pool.query(sql, params);

}

module.exports = {
  checkSelectionAgainstPlan,
  getPlanLimitsForTenant,
  saveSelection,
};
