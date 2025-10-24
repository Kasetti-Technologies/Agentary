// src/services/myService.ts
import { createTenantAwareHttpClient } from '../utils/tenantAwareHttpClient';

export async function callPartnerApi(req) {
  const getJwt = () => req.header('X-Tenant-Context') || '';
  const getContext = () => req.tenantContext;
  const httpClient = createTenantAwareHttpClient(getJwt, getContext);

  await httpClient.post('https://example.com/endpoint', { key: 'val' });
}
