const express = require('express');
const router = express.Router();
const DriverController = require('../controllers/DriverController');
const { authMiddleware, adminOnlyMiddleware } = require('../middleware/auth');

// Define the route for creating a driver
// It first runs authMiddleware to check for a valid token.
// Then it runs adminOnlyMiddleware to ensure the user has the 'admin' role.
// If both pass, it calls the 'create' function in the DriverController.
router.post(
    '/drivers',
    authMiddleware,

    adminOnlyMiddleware,
    DriverController.create
);

module.exports = router;
