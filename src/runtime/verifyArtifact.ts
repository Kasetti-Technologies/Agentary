// CORRECTED PATH: /src/runtime/verifyArtifact.ts
import crypto from 'crypto';
import fs from 'fs/promises';

/**
 * Verifies the integrity and signature of a downloaded artifact.
 * To be used by an init container.
 * @param filePath - Path to the artifact file.
 * @param expectedChecksum - The sha256 checksum from metadata.
 * @param signature - The base64 encoded signature from metadata.
 * @param publicKey - The PEM-encoded public key for verification.
 */
export async function verifyArtifact(filePath: string, expectedChecksum: string, signature: string, publicKey: string): Promise<void> {
    const fileBytes = await fs.readFile(filePath);

    // 1. Verify checksum
    const computedChecksum = crypto.createHash('sha256').update(fileBytes).digest('hex');
    if (computedChecksum !== expectedChecksum) {
        throw new Error(`Checksum mismatch. Aborting startup.`);
    }

    // 2. Verify signature (over the checksum)
    const payloadToVerify = Buffer.from(expectedChecksum, 'utf8');
    const isSignatureValid = crypto.createVerify('sha384')
        .update(payloadToVerify)
        .verify(publicKey, signature, 'base64');

    if (!isSignatureValid) {
        throw new Error("Artifact signature is invalid. Aborting startup.");
    }

    console.log("Artifact is valid. Proceeding with application start.");
}
