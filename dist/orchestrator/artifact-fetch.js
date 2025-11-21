"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/orchestrator/artifact-fetch.ts
const axios_1 = __importDefault(require("axios"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const sha256_1 = require("./utils/sha256");
const ecdsa_verify_1 = require("./utils/ecdsa-verify");
const kafka_producer_1 = require("./kafka-producer");
const logging_1 = require("./logging");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/** ENTRY POINT – called by the init container.
 *  All required configuration is passed via environment variables.
 */
async function run() {
    // -----------------------------------------------------------------
    // Load and validate required env vars (fail fast)
    // -----------------------------------------------------------------
    const { ARTIFACT_URI, ARTIFACT_SHA256, ARTIFACT_SIG_URI, PUBLIC_KEY_URI, TARGET_DIR, TENANT_ID, ARTIFACT_ID, CORRELATION_ID, } = process.env;
    if (!ARTIFACT_URI ||
        !ARTIFACT_SHA256 ||
        !ARTIFACT_SIG_URI ||
        !PUBLIC_KEY_URI ||
        !TARGET_DIR ||
        !TENANT_ID ||
        !ARTIFACT_ID) {
        logging_1.logger.error('Missing required environment variables for artifact fetch');
        process.exit(1);
    }
    // -----------------------------------------------------------------
    // Prepare a temporary directory for downloads
    // -----------------------------------------------------------------
    const tmpDir = await fs_1.promises.mkdtemp(path_1.default.join('/tmp', 'artifact-'));
    const artifactPath = path_1.default.join(tmpDir, 'artifact.pkg');
    try {
        // -----------------------------------------------------------------
        // DOWNLOAD THE ARTIFACT BINARY
        // -----------------------------------------------------------------
        logging_1.logger.info('Downloading artifact', { uri: ARTIFACT_URI });
        // `axios.get<Readable>` tells TS that the response data is a stream.
        const resp = await axios_1.default.get(ARTIFACT_URI, {
            responseType: 'stream',
        });
        const writer = (0, fs_1.createWriteStream)(artifactPath);
        resp.data.pipe(writer);
        // Resolve only when the stream finishes; wrap resolve to match the
        // listener signature (`() => void`).
        await new Promise((resolve, reject) => {
            writer.on('finish', () => resolve());
            writer.on('error', reject);
        });
        logging_1.logger.info('Artifact downloaded', { path: artifactPath });
        // -----------------------------------------------------------------
        // VERIFY SHA‑256 CHECKSUM
        // -----------------------------------------------------------------
        const actualHash = await (0, sha256_1.computeSha256)(artifactPath);
        if (actualHash !== ARTIFACT_SHA256.toLowerCase()) {
            const reason = `checksum mismatch (expected ${ARTIFACT_SHA256}, got ${actualHash})`;
            await (0, kafka_producer_1.emitArtifactFailed)({
                tenantId: TENANT_ID,
                artifactId: ARTIFACT_ID,
                reason,
            });
            logging_1.logger.error(reason);
            process.exit(1);
        }
        logging_1.logger.info('Checksum verified');
        // -----------------------------------------------------------------
        // FETCH SIGNATURE & PUBLIC KEY (plain‑text files)
        // -----------------------------------------------------------------
        const [sigResp, keyResp] = await Promise.all([
            // Explicitly type as string so `data` is known to be a string.
            axios_1.default.get(ARTIFACT_SIG_URI, { responseType: 'text' }),
            axios_1.default.get(PUBLIC_KEY_URI, { responseType: 'text' }),
        ]);
        const signatureB64 = sigResp.data.trim();
        const publicKeyPem = keyResp.data;
        // -----------------------------------------------------------------
        // VERIFY ECDSA P‑384 SIGNATURE
        // -----------------------------------------------------------------
        const artifactBytes = await fs_1.promises.readFile(artifactPath);
        const isValid = (0, ecdsa_verify_1.verifyEcdsaP384)(artifactBytes, signatureB64, publicKeyPem);
        if (!isValid) {
            const reason = 'ECDSA signature verification failed';
            await (0, kafka_producer_1.emitArtifactFailed)({
                tenantId: TENANT_ID,
                artifactId: ARTIFACT_ID,
                reason,
            });
            logging_1.logger.error(reason);
            process.exit(1);
        }
        logging_1.logger.info('Signature verified');
        // -----------------------------------------------------------------
        // EXTRACT ARTIFACT INTO THE TARGET DIRECTORY
        // -----------------------------------------------------------------
        await fs_1.promises.mkdir(TARGET_DIR, { recursive: true });
        // Assuming a tar.gz; adjust if you use zip or another format.
        await execAsync(`tar -xzf ${artifactPath} -C ${TARGET_DIR}`);
        logging_1.logger.info('Artifact extracted', { target: TARGET_DIR });
        // -----------------------------------------------------------------
        // SUCCESS – exit 0 so the main container can start
        // -----------------------------------------------------------------
        process.exit(0);
    }
    catch (err) {
        // -----------------------------------------------------------------
        // ANY UNEXPECTED ERROR → emit failure event & exit 1
        // -----------------------------------------------------------------
        const reason = `runtime error: ${err.message}`;
        await (0, kafka_producer_1.emitArtifactFailed)({
            tenantId: TENANT_ID,
            artifactId: ARTIFACT_ID,
            reason,
        });
        logging_1.logger.error('Artifact fetch failed', { error: err });
        process.exit(1);
    }
}
/* -------------------------------------------------------------
   Bootstrap – connect to Kafka before running the logic.
   ------------------------------------------------------------- */
(async () => {
    try {
        await (0, kafka_producer_1.initKafka)();
        await run();
    }
    catch (e) {
        logging_1.logger.error('Fatal init error', { error: e });
        process.exit(1);
    }
})();
