"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTenantHeaders = withTenantHeaders;
function withTenantHeaders(claims) {
    return (msg) => {
        msg.headers = msg.headers || {};
        msg.headers['tenant_id'] = Buffer.from(claims.sub);
        msg.headers['correlation_id'] = Buffer.from(claims.correlation_id);
        msg.headers['region_tag'] = Buffer.from(claims.primary_region);
        // Optionally, add the whole JWT or claims JSON as a header for advanced scenarios
        return msg;
    };
}
