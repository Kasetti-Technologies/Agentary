const DriverService = require('../services/DriverService');

class DriverController {
    async create(req, res, next) {
        try {
            // The request body contains the driver data from the client.
            const driverData = req.body;

            // Call the service layer to handle the business logic.
            const newDriver = await DriverService.createDriver(driverData);

            // If successful, send a 201 Created response with the new driver object.
            return res.status(201).json(newDriver);
        } catch (error) {
            // If the service throws an error (e.g., validation, conflict),
            // pass it to the global error handler.
            next(error);
        }
    }
}

module.exports = new DriverController();
