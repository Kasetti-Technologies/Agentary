// src/controllers/DriverController.js

// Import the services needed by this controller
const DriverService = require('../services/DriverService');
const ArtifactService = require('../services/ArtifactService'); // You will need to create/import this service
const TenantDriverSelectionService = require('../services/TenantDriverSelectionService');

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
    async listCatalogDrivers(req, res, next) {
    try {
      // Prefer tenant_id from TenantContext if you have it
      // Adjust these property names to your actual auth/middleware
      const tenantFromContext =
        (req.tenant && req.tenant.tenant_id) ||
        (req.tenantContext && req.tenantContext.tenant_id) ||
        (req.user && req.user.tenant_id);

      if (!tenantFromContext) {
        return res.status(400).json({
          error: 'Tenant context missing for catalog request',
        });
      }

      const drivers = await DriverService.getAvailableDriversForTenant(
        tenantFromContext
      );

      return res.status(200).json(drivers);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [New] Select a driver for a tenant.
   * POST /tenant/:tenantId/drivers/:driverId/select
   */
  async selectDriver(req, res, next) {
    try {
      const { tenantId, driverId } = req.params;

      // Cross‑check with TenantContext if available
      const tenantFromContext =
        (req.tenant && req.tenant.tenant_id) ||
        (req.tenantContext && req.tenantContext.tenant_id) ||
        (req.user && req.user.tenant_id);

      if (
        tenantFromContext &&
        String(tenantFromContext) !== String(tenantId)
      ) {
        return res.status(403).json({
          error:
            'Tenant mismatch between URL and authenticated context. Request forbidden.',
        });
      }

      // Who is performing the selection? Use your auth user or tenant sub
      const selectedBy =
        (req.user && (req.user.id || req.user.email)) ||
        (req.tenant && req.tenant.sub) ||
        null;

      if (!driverId) {
        return res
          .status(400)
          .json({ error: 'driverId parameter is required' });
      }

      const selection = await TenantDriverSelectionService.selectDriver({
        tenantId,
        driverId,
        selectedBy,
      });

      return res.status(201).json({
        selection_id: selection.selection_id || selection.id,
        tenant_id: selection.tenant_id,
        driver_id: selection.driver_id,
        selected_by: selection.selected_by,
        created_at: selection.created_at,
        status: 'selected',
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export a single instance of the controller
module.exports = new DriverController();
