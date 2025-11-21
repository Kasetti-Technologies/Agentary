"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenantAwareHttpClient = createTenantAwareHttpClient;
// src/utils/tenantAwareHttpClient.ts
const axios_1 = __importDefault(require("axios"));
/**
 * Creates an Axios client that automatically injects TenantContext and Correlation IDs
 * from the request object into outgoing HTTP calls.
 */
function createTenantAwareHttpClient(getTenantContextJwt, getTenantContext) {
    const client = axios_1.default.create({});
    client.interceptors.request.use((config) => {
        const tenantToken = getTenantContextJwt();
        const context = getTenantContext();
        // 1. Attach X-Tenant-Context (signed JWT required by spec)
        if (tenantToken) {
            config.headers = config.headers || {};
            config.headers['X-Tenant-Context'] = tenantToken;
            // 2. Propagate X-Correlation-Id
            // The spec requires X-Tenant-Context/TenantContext header for multi-tenant scoping @22 @24
            config.headers['X-Correlation-Id'] = context && context.correlation_id
                ? context.correlation_id
                : (Math.random() + '').substring(2); // Simple fallback if correlation ID is missing
        }
        return config;
    });
    return client;
}
