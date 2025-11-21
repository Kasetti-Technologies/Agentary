"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArtifactPublicKey = getArtifactPublicKey;
// In a real system this would come from Vault/KMS or a mounted secret.
// For now, read from environment so you can wire it up later.
const SIGNING_ALGORITHM = process.env.SIGNING_ALGORITHM || "ECDSA_P384";
const SIGNATURE_KEY_ID = process.env.SIGNATURE_KEY_ID || "agentary-signing-key-1";
const SIGNING_PUBLIC_KEY_PEM = process.env.SIGNING_PUBLIC_KEY_PEM || "";
async function getArtifactPublicKey(req, res) {
    if (!SIGNING_PUBLIC_KEY_PEM) {
        return res.status(500).json({
            error: "SIGNING_PUBLIC_KEY_PEM not configured",
        });
    }
    const payload = {
        algorithm: SIGNING_ALGORITHM,
        signatureKeyId: SIGNATURE_KEY_ID,
        publicKeyPem: SIGNING_PUBLIC_KEY_PEM,
    };
    return res.status(200).json(payload);
}
