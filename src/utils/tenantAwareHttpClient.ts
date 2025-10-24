// src/utils/tenantAwareHttpClient.ts
import axios from 'axios';
import { TenantClaims } from '../middleware/tenantContext.middleware';

/**
 * NOTE: This implementation extracts Axios types using 'typeof' from the
 * runtime object to avoid conflicts with named exports (TS2305) or
 * incorrect namespace definitions (TS2833, TS2694) in legacy environments.
 */

// Extract the type of the client created by axios.create()
type AxiosClientInstance = ReturnType<typeof axios.create>;
// Extract the type of the config object passed to the request interceptor
type AxiosInterceptorRequestConfig = Parameters<AxiosClientInstance['interceptors']['request']['use']>[0] extends (c: infer C) => any ? C : any;

/**
 * Creates an Axios client that automatically injects TenantContext and Correlation IDs
 * from the request object into outgoing HTTP calls.
 */
export function createTenantAwareHttpClient(
    getTenantContextJwt: () => string,
    getTenantContext: () => TenantClaims | undefined
): AxiosClientInstance {
    const client = axios.create({});

    client.interceptors.request.use((config: AxiosInterceptorRequestConfig) => {
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
