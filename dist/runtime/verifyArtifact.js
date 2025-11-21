"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyArtifact = verifyArtifact;
// CORRECTED PATH: /src/runtime/verifyArtifact.ts
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
/**
 * Verifies the integrity and signature of a downloaded artifact.
 * To be used by an init container.
 * @param filePath - Path to the artifact file.
 * @param expectedChecksum - The sha256 checksum from metadata.
 * @param signature - The base64 encoded signature from metadata.
 * @param publicKey - The PEM-encoded public key for verification.
 */
async function verifyArtifact(filePath, expectedChecksum, signature, publicKey) {
    const fileBytes = await promises_1.default.readFile(filePath);
    // 1. Verify checksum
    const computedChecksum = crypto_1.default.createHash('sha256').update(fileBytes).digest('hex');
    if (computedChecksum !== expectedChecksum) {
        throw new Error(`Checksum mismatch. Aborting startup.`);
    }
    // 2. Verify signature (over the checksum)
    const payloadToVerify = Buffer.from(expectedChecksum, 'utf8');
    const isSignatureValid = crypto_1.default.createVerify('sha384')
        .update(payloadToVerify)
        .verify(publicKey, signature, 'base64');
    if (!isSignatureValid) {
        throw new Error("Artifact signature is invalid. Aborting startup.");
    }
    console.log("Artifact is valid. Proceeding with application start.");
}
