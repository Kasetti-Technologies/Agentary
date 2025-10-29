import { Kafka, Producer, RecordMetadata } from 'kafkajs';

// Initialize Kafka client (configure brokers via environment variables)
const kafka = new Kafka({
  clientId: 'metering-api',
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
});

const producer: Producer = kafka.producer();
let isConnected = false;

async function getProducer(): Promise<Producer> {
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
export async function publishUsageEvent(event: any): Promise<RecordMetadata> {
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
