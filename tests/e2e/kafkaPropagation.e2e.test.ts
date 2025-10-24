import axios from "axios";
import { Kafka } from "kafkajs";

const STAGING_API_URL = process.env.STAGING_API_URL || "https://api.staging.kasetti.com/v1/usage/events";
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const KAFKA_TOPIC = "usage.udf_calls"; // Or your correct topic
const TEST_TENANT_JWT = "YOUR.TEST.JWT.HERE"; // Replace with valid JWT for test tenant
const TEST_CORRELATION_ID = "E2E-TEST-20251024-001";

describe("E2E Kafka propagation", () => {
  it("produces Kafka message with tenant_id and correlation_id headers", async () => {
    // 1. Post usage event to API
    await axios.post(
      STAGING_API_URL,
      {
        schema_version: "usagepilot.v1",
        id: "e2e-test-evt-001",
        customer_id: "e2e-tenant-123",
        timestamp: new Date().toISOString(),
        event_type: "udf_call",
        metric: "test_e2e",
        quantity: 1,
        properties: {} // Customize as needed
      },
      {
        headers: {
          "X-Tenant-Context": TEST_TENANT_JWT,
          "X-Correlation-Id": TEST_CORRELATION_ID,
          "Content-Type": "application/json"
        }
      }
    );

    // 2. Consume message(s) from Kafka topic
    const kafka = new Kafka({ brokers: KAFKA_BROKERS });
    const consumer = kafka.consumer({ groupId: "e2e-test-group" + Math.random() });
    await consumer.connect();
    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });

    // 3. Wait for a message and check headers
    let found = false;
    await new Promise<void>(async (resolve) => {
      await consumer.run({
        eachMessage: async ({ message }) => {
          // Kafka header values are Buffer: convert to string for comparison
          const tenantHeader =
            message.headers && message.headers["X-Tenant-Context"]
              ? message.headers["X-Tenant-Context"].toString()
              : null;
          const correlationHeader =
            message.headers && message.headers["X-Correlation-Id"]
              ? message.headers["X-Correlation-Id"].toString()
              : null;

          if (
            tenantHeader === TEST_TENANT_JWT &&
            correlationHeader === TEST_CORRELATION_ID
          ) {
            found = true;
            resolve();
          }
        }
      });

      // Timeout if not found in 15 seconds
      setTimeout(() => resolve(), 15000);
    });

    await consumer.disconnect();
    expect(found).toBe(true);
  }, 20000); // Set a reasonable timeout
});
