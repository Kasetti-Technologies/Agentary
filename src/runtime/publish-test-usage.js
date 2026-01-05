// src/runtime/publish-test-usage.js
const { Kafka } = require('kafkajs');

(async () => {
  const kafka = new Kafka({
    clientId: 'test-producer',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  });

  const producer = kafka.producer();
  await producer.connect();

  const event = {
    id: 'evt_123',
    tenant_id: 'tenant-123',
    service_type: 'nlp',          // use lowercase to match your topic naming
    event_type: 'UDF_CALL',
    timestamp: new Date().toISOString(),
    event_hash: 'hash_evt_123',
    quantity: 1,
  };

  await producer.send({
    topic: 'usage.nlp',           // BillingAggregator subscribes to this
    messages: [
      {
        key: event.tenant_id,     // partition by tenant (recommended)
        value: JSON.stringify(event),
      },
    ],
  });

  await producer.disconnect();
  console.log('Sent test usage event');
})().catch((err) => {
  console.error('Producer error', err);
  process.exit(1);
});
