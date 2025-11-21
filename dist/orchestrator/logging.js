"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
// src/orchestrator/logging.ts
/**
 * Very small logger that mirrors the API used in the codebase.
 * If you later need structured JSON logging, replace the implementation
 * with winston/pino – the public interface stays the same.
 */
exports.logger = {
    /** Log an informational message. */
    info: (msg, meta) => {
        if (meta) {
            console.info(`[INFO] ${msg}`, JSON.stringify(meta));
        }
        else {
            console.info(`[INFO] ${msg}`);
        }
    },
    /** Log a warning. */
    warn: (msg, meta) => {
        if (meta) {
            console.warn(`[WARN] ${msg}`, JSON.stringify(meta));
        }
        else {
            console.warn(`[WARN] ${msg}`);
        }
    },
    /** Log an error. */
    error: (msg, meta) => {
        if (meta) {
            console.error(`[ERROR] ${msg}`, JSON.stringify(meta));
        }
        else {
            console.error(`[ERROR] ${msg}`);
        }
    },
    /** Optional debug level – useful during local dev. */
    debug: (msg, meta) => {
        if (process.env.NODE_ENV !== 'production') {
            if (meta) {
                console.debug(`[DEBUG] ${msg}`, JSON.stringify(meta));
            }
            else {
                console.debug(`[DEBUG] ${msg}`);
            }
        }
    },
};
