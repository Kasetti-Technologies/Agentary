// src/utils/tenantAwareKafkaProducer.ts
import { Message } from 'kafkajs';
import { TenantClaims } from '../middleware/tenantContext.middleware';

export function withTenantHeaders(claims: TenantClaims) {
  return (msg: Message): Message => {
    msg.headers = msg.headers || {};
    msg.headers['tenant_id'] = Buffer.from(claims.sub);
    msg.headers['correlation_id'] = Buffer.from(claims.correlation_id);
    msg.headers['region_tag'] = Buffer.from(claims.primary_region);
    // Optionally, add the whole JWT or claims JSON as a header for advanced scenarios

    return msg;
  };
}
