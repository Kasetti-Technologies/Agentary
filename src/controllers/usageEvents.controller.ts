import { Request, Response, NextFunction } from 'express';
import { PoolClient } from 'pg';
import { validateUsagePilotEvent } from '../validators/usageEventValidator';
import { computeEventHash } from '../utils/eventHasher';
import { publishUsageEvent } from '../services/kafkaProducer.service';

/**
 * Controller for handling the ingestion of usage events.
 * Follows the sequence: Validate -> Hash -> Persist (Initial) -> Publish -> Persist (Update).
 */
export async function ingestUsageEventHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Validate Tenant Context (prerequisite from middleware)
    if (!req.tenantContext || !req.dbClient) {
      // This error indicates a middleware configuration issue
      throw new Error('Tenant context or DB client not available on request.');
    }
    
    const dbClient: PoolClient = req.dbClient;
    const eventPayload = req.body;

    // 2. Validate request body against usagepilot.v1 schema
    validateUsagePilotEvent(eventPayload);

    // 3. Compute deterministic event_hash
    const event_hash = computeEventHash(eventPayload);

    // 4. Persist initial record to events.usage_events
    const insertQuery = `
      INSERT INTO events.usage_events 
        (tenant_id, org_id, service_type, event_type, event_payload, emitted_at, event_hash, idempotency_key, correlation_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING event_id, created_at;
    `;
    
    const result = await dbClient.query(insertQuery, [
      req.tenantContext.sub, // tenant_id from JWT
      req.tenantContext.org_id,
      eventPayload.metric.split('.')[0], // Infer service_type from metric
      eventPayload.metric,
      eventPayload,
      eventPayload.timestamp,
      event_hash,
      eventPayload.idempotency_key,
      req.headers['x-correlation-id']
    ]);

    const persistedEvent = result.rows[0];
    const event_id = persistedEvent.event_id;

    // 5. Publish to Kafka
    // Augment the payload with persisted data for the Kafka message
    const kafkaMessage = {
      ...eventPayload,
      event_id,
      tenant_id: req.tenantContext.sub,
      correlation_id: req.headers['x-correlation-id'],
      event_hash,
      ingested_at: persistedEvent.created_at.toISOString()
    };
    
    const kafkaMeta = await publishUsageEvent(kafkaMessage);

    // 6. Update the persisted record with Kafka metadata (fire-and-forget for performance)
    const updateQuery = `
      UPDATE events.usage_events 
      SET kafka_topic = $1, kafka_partition = $2, kafka_offset = $3, status = 'published'
      WHERE event_id = $4;
    `;
    dbClient.query(updateQuery, [
      kafkaMeta.topicName,
      kafkaMeta.partition,
      kafkaMeta.offset,
      event_id
    ]).catch(err => console.error(`Failed to update Kafka metadata for event ${event_id}:`, err));


    // 7. Return 202 Accepted
    res.status(202).json({
      event_id,
      status: 'accepted',
    });

  } catch (error) {
    next(error); // Pass to centralized error handler
  }
}
