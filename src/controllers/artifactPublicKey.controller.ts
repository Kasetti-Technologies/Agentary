// services/catalog/src/controllers/artifactPublicKey.controller.ts
import { Request, Response } from "express";

interface PublicKeyResponse {
  algorithm: string;        // e.g. "ECDSA_P384"
  signatureKeyId: string;   // e.g. "agentary-signing-key-1"
  publicKeyPem: string;     // PEM-encoded public key
}

// In a real system this would come from Vault/KMS or a mounted secret.
// For now, read from environment so you can wire it up later.
const SIGNING_ALGORITHM = process.env.SIGNING_ALGORITHM || "ECDSA_P384";
const SIGNATURE_KEY_ID = process.env.SIGNATURE_KEY_ID || "agentary-signing-key-1";
const SIGNING_PUBLIC_KEY_PEM = process.env.SIGNING_PUBLIC_KEY_PEM || "";

export async function getArtifactPublicKey(req: Request, res: Response) {
  if (!SIGNING_PUBLIC_KEY_PEM) {
    return res.status(500).json({
      error: "SIGNING_PUBLIC_KEY_PEM not configured",
    });
  }

  const payload: PublicKeyResponse = {
    algorithm: SIGNING_ALGORITHM,
    signatureKeyId: SIGNATURE_KEY_ID,
    publicKeyPem: SIGNING_PUBLIC_KEY_PEM,
  };

  return res.status(200).json(payload);
}
