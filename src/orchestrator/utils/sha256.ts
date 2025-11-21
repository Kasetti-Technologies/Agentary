// src/orchestrator/utils/sha256.ts
import { createReadStream } from 'fs';
import { createHash } from 'crypto';

/**
 * Compute SHA‑256 of a file on disk.
 * Returns the hex‑encoded digest.
 */
export async function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
