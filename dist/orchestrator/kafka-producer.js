"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initKafka = initKafka;
exports.emitArtifactFailed = emitArtifactFailed;
// src/orchestrator/kafka-producer.ts
const kafkajs_1 = require("kafkajs");
const logging_1 = require("./logging"); // tiny logger we added earlier
// ---------------------------------------------------------------------
// Kafka client & producer (single instance for the whole orchestrator)
// ---------------------------------------------------------------------
const kafka = new kafkajs_1.Kafka({
    clientId: 'agentary-orchestrator',
    brokers: (process.env.KAFKA_BROKERS?.split(',') ?? ['localhost:9092']),
});
const producer = kafka.producer();
/** Connect the producer once at application start‑up */
async function initKafka() {
    await producer.connect();
}
/** Publish a failure event – called only on verification errors */
async function emitArtifactFailed(event) {
    // -----------------------------------------------------------------
    // Build a `Message` that matches kafkajs’ expected shape.
    // -----------------------------------------------------------------
    const kafkaMsg = {
        // Keys may be strings, but using Buffer makes the type explicit.
        key: Buffer.from(event.tenantId),
        // Store the JSON payload as bytes.
        value: Buffer.from(JSON.stringify(event)),
        // Header values **must be Buffers** (or Uint8Array). This satisfies the
        // `Message.headers` type: `{ [key: string]: Buffer }`.
        headers: {
            'tenant-id': Buffer.from(event.tenantId),
            'correlation-id': Buffer.from(process.env.CORRELATION_ID ?? ''),
        },
    };
    // -----------------------------------------------------------------
    // Send the message.  No generic needed because `kafkaMsg` already
    // conforms to `Message` (the generic `T` is inferred as `any`/`unknown`).
    // -----------------------------------------------------------------
    await producer.send({
        topic: 'artifact.verification_failed',
        messages: [kafkaMsg],
    });
    logging_1.logger.warn('artifact.verification_failed emitted', { event });
}
