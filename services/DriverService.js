// Assume you have a database utility, e.g., a 'db' object for querying.
const db = require('../database');
// Use a validation library like Joi or Zod for robust validation.
const Joi = require('joi');

const driverSchema = Joi.object({
    name: Joi.string().required(),
    vendor: Joi.string().required(),
    supported_services: Joi.array().items(Joi.string().valid('NLP', 'AGENTIC_AI', 'DOC_SUMMARIZER')).min(1).required(),
    default_pricing_sku: Joi.string().optional(),
    published_status: Joi.string().valid('draft', 'staged', 'published').optional().default('draft'),
    metadata: Joi.object().optional(),
    tenant_availability_flags: Joi.object({
        is_public: Joi.boolean().default(false),
        allowed_tenants: Joi.array().items(Joi.string())
    }).optional()
});


class DriverService {
    async createDriver(driverData) {
        // 1. Validate the incoming data against the schema.
        const { error, value } = driverSchema.validate(driverData);
        if (error) {
            // Throw a specific error for the controller to catch.
            const validationError = new Error(error.details[0].message);
            validationError.statusCode = 400; // Bad Request
            throw validationError;
        }

        // 2. Check if a driver with the same name and vendor already exists.
        const existingDriver = await db.query(
            "SELECT driver_id FROM drivers WHERE name = $1 AND vendor = $2",
            [value.name, value.vendor]
        );

        if (existingDriver.rows.length > 0) {
            const conflictError = new Error('A driver with this name and vendor already exists.');
            conflictError.statusCode = 409; // Conflict
            throw conflictError;
        }

        // 3. Insert the validated and sanitized data into the database.
        const { name, vendor, supported_services, default_pricing_sku, published_status, metadata, tenant_availability_flags } = value;
        
        const result = await db.query(
            `INSERT INTO drivers (name, vendor, supported_services, default_pricing_sku, published_status, metadata, tenant_availability_flags)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`, // RETURNING * conveniently returns the created row.
            [name, vendor, supported_services, default_pricing_sku, published_status, metadata, tenant_availability_flags]
        );

        // 4. Return the newly created driver record.
        return result.rows[0];
    }
}

module.exports = new DriverService();
