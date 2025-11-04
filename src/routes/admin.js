// src/routes/admin.js
const express = require('express');
const router = express.Router();

// --- Controller Imports ---
// Controller for creating drivers (Existing)
const DriverController = require('../controllers/DriverController');
// Controller for the new Admin UI page functionality (Ticket D-004)
const driverAdminController = require('../../services/catalog/controllers/driverAdminController');

// --- Middleware Imports ---
// Using your existing middleware for authentication and authorization
const { authMiddleware, adminOnlyMiddleware } = require('../middleware/auth');

// =================================================================
// --- Route Definitions ---
// =================================================================

// Route for creating a new driver (Existing - from D-001)
// Handles POST /admin/drivers
router.post(
    '/drivers',
    authMiddleware,
    adminOnlyMiddleware,
    DriverController.create
);


// --- NEW Routes for Admin Driver Offerings Page (Ticket D-004) ---

// 1. Route to get a list of all drivers for the main catalog view
// Handles GET /admin/drivers
router.get(
    '/drivers',
    authMiddleware,
    adminOnlyMiddleware,
    driverAdminController.listDrivers
);

// 2. Route to get all artifact versions for a specific driver
// Handles GET /admin/drivers/:driverId/artifacts
router.get(
    '/drivers/:driverId/artifacts',
    authMiddleware,
    adminOnlyMiddleware,
    driverAdminController.listDriverArtifacts
);

// 3. Route to publish a specific artifact version
// Handles POST /admin/artifacts/:artifactId/publish
router.post(
    '/artifacts/:artifactId/publish',
    authMiddleware,
    adminOnlyMiddleware,
    driverAdminController.publishArtifact
);


module.exports = router;
