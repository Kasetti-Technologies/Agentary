// src/services/myKafkaPublisher.ts
import { withTenantHeaders } from '../utils/tenantAwareKafkaProducer';
import { Kafka } from 'kafkajs';

export async function emitKafkaMessage(req) {
  const kafka = new Kafka({ brokers: ['localhost:9092'] });
  const producer = kafka.producer();

  const claims = req.tenantContext; // Populated by your middleware
  const payload = { event: 'something_happened' };

  const message = withTenantHeaders(claims)({
    value: Buffer.from(JSON.stringify(payload))
  });

  await producer.send({
    topic: 'your.topic',
    messages: [message]
  });
}
