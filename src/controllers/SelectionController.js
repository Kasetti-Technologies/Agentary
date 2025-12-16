// src/controllers/SelectionController.js

const {
  checkSelectionAgainstPlan,
  getPlanLimitsForTenant,
  saveSelection,
} = require('../services/SelectionService');

/**
 * POST /tenant/:tenant_id/selections
 *
 * Body example:
 * {
 *   "driverId": "d2b4f1c0-....",
 *   "selections": [
 *     { "schema": "public", "table": "orders", "columns": ["id", "amount"] },
 *     { "schema": "public", "table": "customers", "columns": ["id", "email"] }
 *   ]
 * }
 */
async function postSelections(req, res) {
  const tenantId = req.params.tenant_id;

  // Pull "selected_by" from your auth / TenantContext middleware.
  // Adjust this to match what you actually put on req.user.
  const user = req.user | (req.auth && req.auth.user) | {};
  const selectedBy =
    user.id |
    user.user_id ||
    user.sub || // common JWT claim
    '00000000-0000-0000-0000-000000000000'; // fallback; you can tighten this later

  const body = req.body || {};

  if (!body.driverId || !Array.isArray(body.selections)) {
    return res.status(400).json({
      code: 'INVALID_REQUEST',
      message: 'driverId and selections[] are required.',
    });
  }

  try {
    const limits = await getPlanLimitsForTenant(tenantId, body.driverId);
    const result = checkSelectionAgainstPlan(body, limits);

    if (!result.ok) {
      // Over plan limits → 409.LIMIT_EXCEEDED
      return res.status(409).json({
        code: 'LIMIT_EXCEEDED',
        reason: result.reason,
        usedTables: result.usedTables,
        usedFields: result.usedFields,
        maxTables: result.maxTables,
        maxFields: result.maxFields,
      });
    }

    await saveSelection(tenantId, selectedBy, body);

    return res.status(200).json({
      status: 'success',
      usedTables: result.usedTables,
      usedFields: result.usedFields,
      maxTables: result.maxTables,
      maxFields: result.maxFields,
    });
  } catch (err) {
    console.error('Error in postSelections:', err);
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to save selection.',
    });
  }
}

module.exports = {
  postSelections,
};
