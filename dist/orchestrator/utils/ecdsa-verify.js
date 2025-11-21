"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEcdsaP384 = verifyEcdsaP384;
// src/orchestrator/utils/ecdsa-verify.ts
const crypto_1 = require("crypto");
/**
 * Verify an ECDSA P‑384 signature.
 * @param data            – Buffer containing the signed payload (the checksum in our case).
 * @param signatureB64    – Base‑64 encoded signature from the artifact metadata.
 * @param publicKeyPem    – PEM‑encoded public key.
 * @returns true if the signature is valid.
 */
function verifyEcdsaP384(data, signatureB64, publicKeyPem) {
    const verifier = (0, crypto_1.createVerify)('SHA256');
    verifier.update(data);
    verifier.end();
    const signature = Buffer.from(signatureB64, 'base64');
    return verifier.verify(publicKeyPem, signature);
}
