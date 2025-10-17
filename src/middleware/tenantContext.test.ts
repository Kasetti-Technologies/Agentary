// src/middleware/tenantContext.test.ts
import express from 'express';
import request from 'supertest';

// Mock jose so tests control verification behavior
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => async () => {}),
  jwtVerify: jest.fn(),
}));
import { jwtVerify } from 'jose';

import { tenantContextMiddlewareFactory } from './tenantContext';

describe('tenantContext middleware acceptance tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('missing X-Tenant-Context / Authorization -> 401', async () => {
    const app = express();
    // use middleware (no jwksUri required for this test)
    app.use(tenantContextMiddlewareFactory({ requireCorrelationId: false }));
    app.get('/whoami', (req, res) => res.json({ ok: true }));

    await request(app).get('/whoami').expect(401);
  });

  test('valid token => tenant context attached', async () => {
    // Arrange: mock jwtVerify to return payload with expected claims
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: {
        sub: 'tenant-uuid-123',
        org: 'org-xyz',
        roles: ['tenant_admin', 'user'],
        primary_region: 'us-east-1',
      },
    });

    const app = express();
    // pass jwksUri so middleware uses jwtVerify path
    app.use(tenantContextMiddlewareFactory({ jwksUri: 'https://auth.test/.well-known/jwks.json' }));

    app.get('/whoami', (req, res) => {
      // middleware attaches to res.locals and req; return what we see
      const ctx = (res.locals as any).tenantContext ?? (req as any).tenantContext;
      return res.json({ tenantContext: ctx });
    });

    const resp = await request(app)
      .get('/whoami')
      .set('Authorization', 'Bearer faketoken')
      .expect(200);

    expect(resp.body).toHaveProperty('tenantContext');
    expect(resp.body.tenantContext.sub).toBe('tenant-uuid-123');
    expect(resp.body.tenantContext.org).toBe('org-xyz');
    expect(Array.isArray(resp.body.tenantContext.roles)).toBe(true);
    expect(resp.body.tenantContext.roles).toContain('tenant_admin');
  });

  test('verification failure logs correlation_id and returns 401', async () => {
    // Arrange: make jwtVerify throw to simulate invalid signature
    const err = new Error('invalid token signature');
    (jwtVerify as jest.Mock).mockImplementation(() => { throw err; });

    // Spy on console.error to capture logging
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const app = express();
    // require correlation id path exercised; middleware creates one if missing
    app.use(tenantContextMiddlewareFactory({ jwksUri: 'https://auth.test/.well-known/jwks.json', requireCorrelationId: false }));

    app.get('/x', (req, res) => res.sendStatus(200));

    const res = await request(app)
      .get('/x')
      .set('Authorization', 'Bearer badtoken')
      .expect(401);

    // Expect logging occurred with correlationId included
    expect(spy).toHaveBeenCalled();
    const logged = spy.mock.calls[0][0];
    // Ensure error message is present and correlationId exists in the logged object
    expect(JSON.stringify(logged)).toContain('invalid token signature');
    expect(JSON.stringify(logged)).toMatch(/correlationId/);

    spy.mockRestore();
  });
});
