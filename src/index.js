// src/index.js
require('dotenv/config');
const express = require('express');
const { Kafka, logLevel } = require('kafkajs');
const selectionRoutes = require('./routes/selections');


// ---- Credential broker + rotation (from dist build) ----
const { CredentialBrokerClient } = require('../dist/runtime/CredentialBrokerClient');
const { CredentialRotator } = require('../dist/runtime/CredentialRotator');

// ---- UsageForwarder (from dist build) ----
const { UsageForwarder } = require('../dist/runtime/UsageForwarder');

/**
 * Small helper to require environment variables with an optional default.
 */


function requireEnv(name, defaultValue) {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

// ---------- Helpers ----------
function getEnv(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (!val) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return val;
}

// ---------- Kafka producer ----------
const kafka = new Kafka({
  clientId: 'my-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  logLevel: logLevel.INFO, // <- fixed
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

// ---------- Health HTTP server ----------
function startHttpServer() {
  const app = express();
const port = process.env.PORT | 3000;

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });
const PORT = process.env.PORT | 3000;

  app.listen(port, () => {
    console.log(`Health server listening on port ${port}`);
  });
}

// ---------- Orchestrator provisioned event + audit logging ----------
const ORCHESTRATOR_TOPIC = 'orchestrator.provisioned';

async function emitProvisionEvent({
  tenantId,
  serviceType,
  deploymentName,
  status,
  error,
}) {
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
          key: tenantId | 'unknown', // <- fixed; was tenantId | 'unknown'
          value: JSON.stringify(payload),
        },
      ],
    });
  } catch (err) {
    console.error('Failed to emit orchestrator.provisioned event', err);
  }
}

function auditProvision({
  tenantId,
  serviceType,
  deploymentName,
  status,
  error,
}) {
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

// ---------- Bootstrap: credentials + HTTP + Kafka + UsageForwarder ----------
let rotator; // so the shutdown handler can see it

async function bootstrap() {
  // 1) Start credential rotation (R-003)
  const brokerUrl = getEnv('CREDENTIAL_BROKER_URL');
  const serviceId = getEnv('SERVICE_ID', 'driver-runtime');
  const tenantId = getEnv('TENANT_ID');

  const rotationSafetySeconds = Number(
    getEnv('CREDENTIAL_ROTATION_SAFETY_SECONDS', '60'),
  );
  const retryDelaySeconds = Number(
    getEnv('CREDENTIAL_ROTATION_RETRY_SECONDS', '10'),
  );

  const brokerClient = new CredentialBrokerClient(brokerUrl, serviceId);
  rotator = new CredentialRotator(brokerClient, {
    tenantId,
    correlationId: undefined,
    rotationSafetySeconds,
    retryDelaySeconds,
  });

  // Wait for first credential so the runtime can use it
  await rotator.start();
  console.log('[Bootstrap] Credential rotation started');

  // 2) Start HTTP health server
  startHttpServer();

  // 3) Connect Kafka in background (do not crash on failure)
  connectProducer()
    .then(() => {
      console.log('Kafka producer connected');
    })
    .catch((err) => {
      console.error(
        'Kafka producer connection failed (continuing without Kafka)',
        err,
      );
      // no process.exit(1) on purpose
    });

  // 4) UsageForwarder initialization (R-004)
  const meteringEndpoint =
  process.env.METERING_API_URL ||
  'http://localhost:4000/api/v1/usage-events'; // adjust to your metering API URL

const primaryRegion = process.env.PRIMARY_REGION || 'us-east-1';

const tenantContextJwt = requireEnv(
  'TENANT_CONTEXT_JWT',
  'MOCK.JWT.TOKEN' // dev default; replace with real JWT in staging/prod
);

const usageForwarder = new UsageForwarder({
  endpoint: meteringEndpoint,
  tenantId,
  primaryRegion,
  tenantContextJwt,
  baseCorrelationId: `runtime-${tenantId}-${Date.now()}`,
  flushIntervalMs: 5000,
  maxBatchSize: 20,
});

usageForwarder.start();

console.log('[Bootstrap] UsageForwarder started, endpoint:', meteringEndpoint);
  // OPTIONAL: emit a test usage event every 30s
  setInterval(() => {
    usageForwarder.record('nlp.udf_call', 1, {
      source: 'runtime-test',
      note: 'R-004 test event from container',
    });
    console.log('[UsageForwarder] queued test usage event');
  }, 30000);

  // 5) Graceful shutdown
  const shutdown = () => {
    console.log('[Bootstrap] Shutting down...');
    try {
      if (rotator) {
        rotator.stop();
      }
    } catch (e) {
      console.error('Error stopping rotator', e);
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Only run bootstrap when this file is run directly
if (require.main === module) {
  bootstrap().catch((err) => {
    console.error('[Bootstrap] Fatal error:', err);
    process.exit(1);
  });
}

// Export things if other modules need them
module.exports = {
  publishUsageEvent,
  emitProvisionEvent,
  auditProvision,
};
