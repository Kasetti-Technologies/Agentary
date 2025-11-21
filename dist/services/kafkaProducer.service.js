"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishUsageEvent = publishUsageEvent;
const kafkajs_1 = require("kafkajs");
// Initialize Kafka client (configure brokers via environment variables)
const kafka = new kafkajs_1.Kafka({
    clientId: 'metering-api',
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
});
const producer = kafka.producer();
let isConnected = false;
async function getProducer() {
    if (!isConnected) {
        await producer.connect();
        isConnected = true;
    }
    return producer;
}
/**
 * Publishes a usage event to the appropriate Kafka topic.
 * @param event The full event object to be published.
 * @returns Kafka record metadata (topic, partition, offset).
 */
async function publishUsageEvent(event) {
    const kafkaProducer = await getProducer();
    const topic = `usage.${event.service_type.toLowerCase()}`;
    const [recordMetadata] = await kafkaProducer.send({
        topic,
        messages: [{
                key: event.tenant_id, // Partition key
                value: JSON.stringify(event),
                headers: {
                    'correlation-id': event.correlation_id,
                    'schema-version': 'usagepilot.v1',
                },
            }],
    });
    if (!recordMetadata || recordMetadata.errorCode !== 0) {
        throw new Error(`Failed to publish event ${event.id} to Kafka topic ${topic}`);
    }
    return recordMetadata;
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    if (isConnected) {
        await producer.disconnect();
    }
});
