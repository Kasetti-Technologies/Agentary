   const { Kafka } = require('kafkajs');

   (async () => {
     const kafka = new Kafka({
       clientId: 'test-producer',
       brokers: ['localhost:9092'],
     });

     const producer = kafka.producer();
     await producer.connect();

     const event = {
       id: 'evt_123',
       tenant_id: 'tenant-123',
       service_type: 'NLP',
       event_type: 'UDF_CALL',
       timestamp: new Date().toISOString(),
       event_hash: 'hash_evt_123',
       quantity: 1,
     };

     await producer.send({
       topic: 'usage.nlp',
       messages: [{ value: JSON.stringify(event) }],
     });

     await producer.disconnect();
     console.log('Sent test usage event');
   })().catch((err) => {
     console.error('Producer error', err);
     process.exit(1);
   });
