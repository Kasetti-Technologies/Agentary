// NEW FILE: /services/catalog/services/ArtifactService.js

// 1. Require the database utility, following the pattern in your existing services.
const db = require('../database');

/**
 * Manages database operations for driver artifacts, including fetching
 * artifacts for signing and updating them with signature data.
 */
class ArtifactService {

    /**
     * Fetches artifacts from the database that are ready for signing.
     * This query targets records where the signature is NULL and the status is 'uploaded',
     * as required by ticket D-003.
     *
     * @param {object} criteria - An object specifying the filter criteria, e.g., { status: 'uploaded' }.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of artifact records.
     */
    async getUnsignedArtifacts(criteria) {
        if (!criteria || !criteria.status) {
            const validationError = new Error("A status filter is required to fetch artifacts.");
            validationError.statusCode = 400; // Bad Request
            throw validationError;
        }

        const query = `
            SELECT id, sha256_checksum
            FROM driver_artifacts
            WHERE signature IS NULL AND status = $1;
        `;

        const result = await db.query(query, [criteria.status]);
        return result.rows;
    }

    /**
     * Updates a specific artifact record with its computed signature and the key ID.
     * This is the persistence step for the artifact signing job (D-003).
     *
     * @param {string} artifactId The ID of the artifact to update.
     * @param {string} signature The base64-encoded signature.
     * @param {string} signatureKeyId The identifier for the signing key.
     * @returns {Promise<object>} A promise that resolves to the updated driver artifact record.
     */
    async updateArtifactSignature(artifactId, signature, signatureKeyId) {
        if (!artifactId || !signature || !signatureKeyId) {
            const validationError = new Error('Artifact ID, signature, and signatureKeyId are all required.');
            validationError.statusCode = 400; // Bad Request
            throw validationError;
        }

        const query = `
            UPDATE driver_artifacts
            SET
                signature = $1,
                signature_key_id = $2,
                status = 'verified' -- Logically update status to reflect it has been signed
            WHERE
                id = $3
            RETURNING *;
        `;

        const result = await db.query(query, [signature, signatureKeyId, artifactId]);

        if (result.rows.length === 0) {
            const notFoundError = new Error(`Artifact with ID '${artifactId}' not found.`);
            notFoundError.statusCode = 404; // Not Found
            throw notFoundError;
        }

        return result.rows[0];
    }
}

// Export a singleton instance, matching the pattern used in DriverService.js
module.exports = new ArtifactService();
