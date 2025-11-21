// src/orchestrator/kafka-producer.ts
import { Kafka, Producer, Message } from 'kafkajs';
import { logger } from './logging';   // tiny logger we added earlier

// ---------------------------------------------------------------------
// Kafka client & producer (single instance for the whole orchestrator)
// ---------------------------------------------------------------------
const kafka = new Kafka({
  clientId: 'agentary-orchestrator',
  brokers: (process.env.KAFKA_BROKERS?.split(',') ?? ['localhost:9092']),
});

const producer: Producer = kafka.producer();

/** Connect the producer once at application start‑up */
export async function initKafka(): Promise<void> {
  await producer.connect();
}

/** Payload for a verification‑failed event */
export interface ArtifactFailure {
  tenantId: string;
  artifactId: string;
  reason: string;
}

/** Publish a failure event – called only on verification errors */
export async function emitArtifactFailed(
  event: ArtifactFailure,
): Promise<void> {
  // -----------------------------------------------------------------
  // Build a `Message` that matches kafkajs’ expected shape.
  // -----------------------------------------------------------------
  const kafkaMsg: Message = {
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

  logger.warn('artifact.verification_failed emitted', { event });
}
