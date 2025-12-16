// src/routes/clientDrivers.js
const express = require('express');
const router = express.Router();

const DriverController = require('../controllers/DriverController');
const { authMiddleware } = require('../middleware/auth');
// If you have TenantContext middleware, import it here:
// const { tenantContextMiddleware } = require('../middleware/tenantContext.middleware');

// List catalog drivers for the authenticated tenant
router.get(
  '/catalog/drivers',
  authMiddleware,
  // tenantContextMiddleware, // uncomment if available
  (req, res, next) => DriverController.listCatalogDrivers(req, res, next)
);

// Select a driver for a tenant
router.post(
  '/tenant/:tenantId/drivers/:driverId/select',
  authMiddleware,
  // tenantContextMiddleware, // uncomment if available
  (req, res, next) => DriverController.selectDriver(req, res, next)
);

module.exports = router;
