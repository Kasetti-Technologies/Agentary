// src/controllers/DriverController.js

// Import the services needed by this controller
const DriverService = require('../services/DriverService');
const ArtifactService = require('../services/ArtifactService'); // You will need to create/import this service

class DriverController {
    /**
     * [Existing] Creates a new driver.
     * Corresponds to: POST /admin/drivers
     */
    async create(req, res, next) {
        try {
            // The request body contains the driver data from the client.
            const driverData = req.body;
            // Call the service layer to handle the business logic.
            const newDriver = await DriverService.createDriver(driverData);
            // If successful, send a 201 Created response with the new driver object.
            return res.status(201).json(newDriver);
        } catch (error) {
            // If the service throws an error, pass it to the global error handler.
            next(error);
        }
    }

    // --- NEW Methods for Admin Driver Offerings Page (Ticket D-004) ---

    /**
     * [New] Gets a list of all drivers.
     * Corresponds to: GET /admin/drivers
     */
    async listDrivers(req, res, next) {
        try {
            const drivers = await DriverService.getDrivers();
            res.status(200).json(drivers);
        } catch (error) {
            // Pass any errors to the global error handler
            next(error);
        }
    }

    /**
     * [New] Gets all artifacts for a single driver.
     * Corresponds to: GET /admin/drivers/:driverId/artifacts
     */
    async listDriverArtifacts(req, res, next) {
        try {
            const { driverId } = req.params;
            const artifacts = await ArtifactService.getArtifactsForDriver(driverId);
            res.status(200).json(artifacts);
        } catch (error) {
            next(error);
        }
    }

    /**
     * [New] Publishes a specific artifact.
     * Corresponds to: POST /admin/artifacts/:artifactId/publish
     */
    async publishArtifact(req, res, next) {
        try {
            const { artifactId } = req.params;
            const adminUser = req.user; // Assuming user is attached by auth middleware

            const updatedArtifact = await ArtifactService.publishArtifact(artifactId, adminUser.id);
            res.status(200).json(updatedArtifact);
        } catch (error) {
            next(error);
        }
    }
}

// Export a single instance of the controller
module.exports = new DriverController();
