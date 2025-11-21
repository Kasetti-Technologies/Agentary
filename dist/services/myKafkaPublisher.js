"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitKafkaMessage = emitKafkaMessage;
const tenantAwareKafkaProducer_1 = require("../utils/tenantAwareKafkaProducer");
const kafkajs_1 = require("kafkajs");
/**
 * Publishes a simple test event to Kafka, automatically injecting the
 * X‑Tenant‑Context and X‑Correlation‑Id headers that were attached to the
 * request by `tenantContextMiddleware`.
 *
 * @param req – the incoming Express request (populated by the middleware)
 */
async function emitKafkaMessage(req) {
    // -----------------------------------------------------------------
    // Build the Kafka client – the broker list is hard‑coded for local dev.
    // -----------------------------------------------------------------
    const kafka = new kafkajs_1.Kafka({ brokers: ['localhost:9092'] });
    const producer = kafka.producer();
    // -----------------------------------------------------------------
    // Grab the tenant claims that the middleware attached.
    // -----------------------------------------------------------------
    // `tenantContext` is added at runtime, so we cast the request to `any`
    // before accessing it and then type‑assert the shape.
    const claims = req.tenantContext;
    // If for some reason the middleware didn’t run, fail fast.
    if (!claims) {
        throw new Error('Tenant context not available on request');
    }
    // -----------------------------------------------------------------
    // Prepare the payload and run it through the header‑injector.
    // -----------------------------------------------------------------
    const payload = { event: 'something_happened' };
    // `withTenantHeaders` returns a function that expects a `Message`
    // and returns a `Message`.  We pass the minimal message (just a value)
    // and let the wrapper add the required headers.
    const message = (0, tenantAwareKafkaProducer_1.withTenantHeaders)(claims)({
        value: Buffer.from(JSON.stringify(payload)),
    });
    // -----------------------------------------------------------------
    // Send the message.  In a real service you would call `producer.connect()`
    // once at startup; for a small utility it’s fine to connect on‑demand.
    // -----------------------------------------------------------------
    await producer.connect();
    await producer.send({
        topic: 'your.topic',
        messages: [message],
    });
    await producer.disconnect();
}
