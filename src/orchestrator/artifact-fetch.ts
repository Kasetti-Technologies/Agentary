// src/orchestrator/artifact-fetch.ts
import axios from 'axios';
import { createWriteStream, promises as fs } from 'fs';
import path from 'path';
import { computeSha256 } from './utils/sha256';
import { verifyEcdsaP384 } from './utils/ecdsa-verify';
import { emitArtifactFailed, initKafka } from './kafka-producer';
import { logger } from './logging';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Readable } from 'stream';   // <-- only for typing the stream

const execAsync = promisify(exec);

/** ENTRY POINT – called by the init container.
 *  All required configuration is passed via environment variables.
 */
async function run(): Promise<void> {
  // -----------------------------------------------------------------
  // Load and validate required env vars (fail fast)
  // -----------------------------------------------------------------
  const {
    ARTIFACT_URI,
    ARTIFACT_SHA256,
    ARTIFACT_SIG_URI,
    PUBLIC_KEY_URI,
    TARGET_DIR,
    TENANT_ID,
    ARTIFACT_ID,
    CORRELATION_ID,
  } = process.env;

  if (
    !ARTIFACT_URI ||
    !ARTIFACT_SHA256 ||
    !ARTIFACT_SIG_URI ||
    !PUBLIC_KEY_URI ||
    !TARGET_DIR ||
    !TENANT_ID ||
    !ARTIFACT_ID
  ) {
    logger.error('Missing required environment variables for artifact fetch');
    process.exit(1);
  }

  // -----------------------------------------------------------------
  // Prepare a temporary directory for downloads
  // -----------------------------------------------------------------
  const tmpDir = await fs.mkdtemp(path.join('/tmp', 'artifact-'));
  const artifactPath = path.join(tmpDir, 'artifact.pkg');

  try {
    // -----------------------------------------------------------------
    // DOWNLOAD THE ARTIFACT BINARY
    // -----------------------------------------------------------------
    logger.info('Downloading artifact', { uri: ARTIFACT_URI });

    // `axios.get<Readable>` tells TS that the response data is a stream.
    const resp = await axios.get<Readable>(ARTIFACT_URI, {
      responseType: 'stream',
    });

    const writer = createWriteStream(artifactPath);
    resp.data.pipe(writer);

    // Resolve only when the stream finishes; wrap resolve to match the
    // listener signature (`() => void`).
    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });

    logger.info('Artifact downloaded', { path: artifactPath });

    // -----------------------------------------------------------------
    // VERIFY SHA‑256 CHECKSUM
    // -----------------------------------------------------------------
    const actualHash = await computeSha256(artifactPath);
    if (actualHash !== ARTIFACT_SHA256.toLowerCase()) {
      const reason = `checksum mismatch (expected ${ARTIFACT_SHA256}, got ${actualHash})`;
      await emitArtifactFailed({
        tenantId: TENANT_ID,
        artifactId: ARTIFACT_ID,
        reason,
      });
      logger.error(reason);
      process.exit(1);
    }
    logger.info('Checksum verified');

    // -----------------------------------------------------------------
    // FETCH SIGNATURE & PUBLIC KEY (plain‑text files)
    // -----------------------------------------------------------------
    const [sigResp, keyResp] = await Promise.all([
      // Explicitly type as string so `data` is known to be a string.
      axios.get<string>(ARTIFACT_SIG_URI, { responseType: 'text' }),
      axios.get<string>(PUBLIC_KEY_URI, { responseType: 'text' }),
    ]);

    const signatureB64 = sigResp.data.trim();
    const publicKeyPem = keyResp.data;

    // -----------------------------------------------------------------
    // VERIFY ECDSA P‑384 SIGNATURE
    // -----------------------------------------------------------------
    const artifactBytes = await fs.readFile(artifactPath);
    const isValid = verifyEcdsaP384(artifactBytes, signatureB64, publicKeyPem);
    if (!isValid) {
      const reason = 'ECDSA signature verification failed';
      await emitArtifactFailed({
        tenantId: TENANT_ID,
        artifactId: ARTIFACT_ID,
        reason,
      });
      logger.error(reason);
      process.exit(1);
    }
    logger.info('Signature verified');

    // -----------------------------------------------------------------
    // EXTRACT ARTIFACT INTO THE TARGET DIRECTORY
    // -----------------------------------------------------------------
    await fs.mkdir(TARGET_DIR, { recursive: true });
    // Assuming a tar.gz; adjust if you use zip or another format.
    await execAsync(`tar -xzf ${artifactPath} -C ${TARGET_DIR}`);
    logger.info('Artifact extracted', { target: TARGET_DIR });

    // -----------------------------------------------------------------
    // SUCCESS – exit 0 so the main container can start
    // -----------------------------------------------------------------
    process.exit(0);
  } catch (err) {
    // -----------------------------------------------------------------
    // ANY UNEXPECTED ERROR → emit failure event & exit 1
    // -----------------------------------------------------------------
    const reason = `runtime error: ${(err as Error).message}`;
    await emitArtifactFailed({
      tenantId: TENANT_ID,
      artifactId: ARTIFACT_ID,
      reason,
    });
    logger.error('Artifact fetch failed', { error: err });
    process.exit(1);
  }
}

/* -------------------------------------------------------------
   Bootstrap – connect to Kafka before running the logic.
   ------------------------------------------------------------- */
(async () => {
  try {
    await initKafka();
    await run();
  } catch (e) {
    logger.error('Fatal init error', { error: e });
    process.exit(1);
  }
})();
