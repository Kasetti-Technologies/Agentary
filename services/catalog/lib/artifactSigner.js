// FILE: /services/catalog/lib/artifactSigner.js (Corrected)
const { KMSClient, SignCommand } = require('@aws-sdk/client-kms');

// Configure the KMS client. It will automatically use credentials from your environment
// (e.g., IAM role, ~/.aws/credentials)
const kmsClient = new KMSClient({ region: process.env.AWS_REGION || "us-east-1" });

/**
 * Signs a payload using the configured AWS KMS key. This function implements
 * the ECDSA P-384 signing requirement for Ticket D-003.
 * @param {Buffer} payload - The data to be signed (expected to be a digest).
 * @returns {Promise<string>} The base64-encoded signature.
 */
async function sign(payload) {
  // SOLUTION: Read the environment variable inside the function.
  // This ensures it gets the most up-to-date value, especially during tests.
  const keyId = process.env.SIGNING_KEY_ID;

  if (!keyId) {
    throw new Error("Signing key ID is not configured. Cannot sign artifact.");
  }

  const command = new SignCommand({
    KeyId: keyId,
    Message: payload,
    SigningAlgorithm: "ECDSA_SHA_384",
    MessageType: "DIGEST"
  });

  try {
    const response = await kmsClient.send(command);
    // The signature is returned as a Uint8Array, so we encode it to base64 for storage.
    const signatureBase64 = Buffer.from(response.Signature).toString('base64');
    return signatureBase64;
  } catch (error) {
    console.error("Error signing with KMS:", error);
    throw new Error("Failed to sign artifact using KMS.");
  }
}

/**
 * Placeholder for a verification function. In a real-world scenario, this would
 * use the public key corresponding to the KMS key to verify the signature.
 * @param {Buffer} payload - The original payload (digest).
 * @param {string} signatureBase64 - The base64-encoded signature to verify.
 * @returns {Promise<boolean>}
 */
async function verify(payload, signatureBase64) {
  console.warn("Verification function is a placeholder and not implemented.");
  // A real implementation would involve a GetPublicKey call to KMS
  // and then using a crypto library to perform the verification.
  return true;
}

// Export the functions using the CommonJS pattern
module.exports = {
  sign,
  verify
};
