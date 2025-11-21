// src/orchestrator/utils/ecdsa-verify.ts
import { createVerify } from 'crypto';

/**
 * Verify an ECDSA P‑384 signature.
 * @param data            – Buffer containing the signed payload (the checksum in our case).
 * @param signatureB64    – Base‑64 encoded signature from the artifact metadata.
 * @param publicKeyPem    – PEM‑encoded public key.
 * @returns true if the signature is valid.
 */
export function verifyEcdsaP384(
  data: Buffer,
  signatureB64: string,
  publicKeyPem: string,
): boolean {
  const verifier = createVerify('SHA256');
  verifier.update(data);
  verifier.end();
  const signature = Buffer.from(signatureB64, 'base64');
  return verifier.verify(publicKeyPem, signature);
}
