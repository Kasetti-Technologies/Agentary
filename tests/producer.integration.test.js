const { connectProducer, publishUsageEvent } = require('../src/index');

// Skips the test if you don't have Kafka running locally.
// To run it, remove ".skip" and start a Kafka broker on localhost:9092.
test.skip(
  "producer integration test - publishes usage event to Kafka",
  async () => {
    // This wrapper lets Jest control execution and report errors properly
    await connectProducer();

    await publishUsageEvent({
      servicetype: 'nlp',
      tenantid: 'tenant-42',
      value: { metric: 'UDFCALL', count: 1 },
      XTenantContext: 'test-context',
      XCorrelationId: 'test-corr',
      idempotencykey: 'idem-unique',
      eventhash: 'etag-hash',
      regiontag: 'us-west-1',
    });

    console.log('Message published successfully!');
  }
);
