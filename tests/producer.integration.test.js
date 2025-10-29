const { connectProducer, publishUsageEvent } = require('../src/index');

async function runTest() {
  await connectProducer();
  await publishUsageEvent({
    servicetype: 'nlp',
    tenantid: 'tenant-42',
    value: { metric: 'UDFCALL', count: 1 },
    XTenantContext: 'test-context',
    XCorrelationId: 'test-corr',
    idempotencykey: 'idem-unique',
    eventhash: 'etag-hash',
    regiontag: 'us-west-1'
  });
  console.log('Message published successfully!');
  process.exit(0);
}

runTest();
