// services/your-service/src/index.js

const { Kafka, logLevel } = require('kafkajs');

// Configuration — set your environment or config values
const kafka = new Kafka({
  clientId: 'my-service',
  brokers: ['localhost:9092'],
  logLevel: logLevel.INFO,
});

const producer = kafka.producer();

async function connectProducer() {
  await producer.connect();
}

// Usage event producer
async function publishUsageEvent({
  servicetype,
  tenantid,
  value,
  XTenantContext,
  XCorrelationId,
  idempotencykey,
  eventhash,
  regiontag,
}) {
  const topic = `usage.${servicetype}`;
  const headers = {
    XTenantContext: XTenantContext || '',
    XCorrelationId: XCorrelationId || '',
    idempotencykey: idempotencykey || '',
    eventhash: eventhash || '',
    regiontag: regiontag || '',
  };
  await producer.send({
    topic,
    messages: [
      {
        key: tenantid, // partition key
        value: JSON.stringify(value),
        headers,
      },
    ],
  });
  console.log(`Published to ${topic} for tenant ${tenantid}`);
}

module.exports = { publishUsageEvent, connectProducer };
