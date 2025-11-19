const express = require('express');
const { Kafka, logLevel } = require('kafkajs');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'my-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
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

// Health HTTP server
function startHttpServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.listen(port, () => {
    console.log(`Health server listening on port ${port}`);
  });
}

// If this file is run directly (node src/index.js), start HTTP + Kafka
if (require.main === module) {
  // Start HTTP server first so /health works even if Kafka is down
  startHttpServer();

  // Try to connect Kafka in the background, but don't kill the process if it fails
  connectProducer()
    .then(() => {
      console.log('Kafka producer connected');
    })
    .catch((err) => {
      console.error('Kafka producer connection failed (continuing without Kafka)', err);
      // No process.exit(1) here
    });
}

// Orchestrator provisioned event + audit logging
const ORCHESTRATOR_TOPIC = 'orchestrator.provisioned';

async function emitProvisionEvent({ tenantId, serviceType, deploymentName, status, error }) {
  if (!producer) {
    console.error('emitProvisionEvent: producer not initialized');
    return;
  }

  const payload = {
    tenantId,
    serviceType,
    deploymentName,
    status, // 'success' | 'failure'
    error: error ? String(error) : null,
    timestamp: new Date().toISOString(),
  };

  try {
    await producer.send({
      topic: ORCHESTRATOR_TOPIC,
      messages: [
        {
          key: tenantId || 'unknown',
          value: JSON.stringify(payload),
        },
      ],
    });
  } catch (err) {
    console.error('Failed to emit orchestrator.provisioned event', err);
  }
}

function auditProvision({ tenantId, serviceType, deploymentName, status, error }) {
  const entry = {
    ts: new Date().toISOString(),
    type: 'orchestrator.provision',
    tenantId,
    serviceType,
    deploymentName,
    status,
    error: error ? String(error) : null,
  };
  console.log(JSON.stringify(entry));
}
