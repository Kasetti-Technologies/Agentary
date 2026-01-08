// src/billing/archivalEvidence.ts
import { BillingEvent } from './domain/invoice';

// TODO: replace this with actual S3 upload using @aws-sdk/client-s3 if desired.
export async function createArchivalEvidenceBundle(
  invoiceId: string,
  events: BillingEvent[]
): Promise<{
  archivalEvidenceUri: string;
  eventHashes: string[];
}> {
  const eventHashes = events.map((ev) => ev.eventHash);

  // For now, just pretend we've created an archive and uploaded it.
  // Example URI pattern; adjust for your environment.
  const archivalEvidenceUri = `s3://agentary-archives/invoices/${invoiceId}/evidence.json`;

  // In a full implementation, you would:
  // 1. Serialize { invoiceId, eventHashes, createdAt } as JSON
  // 2. Upload to S3 and return the real S3 URI

  return { archivalEvidenceUri, eventHashes };
}
