// FINAL CORRECTED FILE (as .js): /services/catalog/jobs/signArtifactsJob.js

// Use require() for CommonJS modules, not 'import'. These paths are now correct.
const ArtifactService = require('../services/ArtifactService.js');
const { sign } = require('../lib/artifactSigner'); // Assuming artifactSigner exists or will be created
const KafkaProducer = require('../lib/kafkaProducer.js');

/**
 * Scheduled job to find artifacts with NULL signatures, sign them,
 * and update the database. This directly implements the logic for Ticket D-003.
 */
async function runSigningJob() {
  console.log("Starting artifact signing job...");
  try {
    const artifactsToSign = await ArtifactService.getUnsignedArtifacts({ status: 'uploaded' });

    if (artifactsToSign.length === 0) {
      console.log("No artifacts found waiting for signature. Job finished.");
      return;
    }

    console.log(`Found ${artifactsToSign.length} artifact(s) to sign.`);

    for (const artifact of artifactsToSign) {
      try {
        // The payload to be signed is the artifact's checksum, as per the spec.
        const payloadToSign = Buffer.from(artifact.sha256_checksum, "utf8");
        const signature = await sign(payloadToSign);
        const signingKeyId = process.env.SIGNING_KEY_ID || 'default-key-id';

        // Persist the new signature to the database.
        await ArtifactService.updateArtifactSignature(artifact.id, signature, signingKeyId);

        // Emit an event to Kafka confirming the artifact was signed.
        await KafkaProducer.send("artifact.signed", {
          artifactId: artifact.id,
          signatureKeyId: signingKeyId,
        });

        console.log(`Successfully signed artifact ${artifact.id}`);
      } catch (error) {
        // Log error for a single artifact but continue with the next one.
        console.error(`Failed to sign artifact ${artifact.id}:`, error);
      }
    }
  } catch (error) {
    console.error("A critical error occurred during the signing job:", error);
  }

  console.log("Artifact signing job finished.");
}

// Export the function so it can be called by a scheduler.
module.exports = {
  runSigningJob
};
