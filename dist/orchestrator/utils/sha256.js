"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSha256 = computeSha256;
// src/orchestrator/utils/sha256.ts
const fs_1 = require("fs");
const crypto_1 = require("crypto");
/**
 * Compute SHA‑256 of a file on disk.
 * Returns the hex‑encoded digest.
 */
async function computeSha256(filePath) {
    return new Promise((resolve, reject) => {
        const hash = (0, crypto_1.createHash)('sha256');
        const stream = (0, fs_1.createReadStream)(filePath);
        stream.on('error', reject);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}
