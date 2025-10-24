// tests/tenantContext.middleware.test.ts

import request from 'supertest';
import express, { Express } from 'express';

// --- MOCKS ---

// Mock pg Pool and PoolClient
jest.mock('pg', () => {
  const mClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  return {
    Pool: jest.fn(() => ({
      connect: jest.fn(() => Promise.resolve(mClient)),
    })),
  };
});

// Mock jwks-rsa to resolve the key used for JWT verification
const MOCK_PUBLIC_KEY = 'mock-public-key-from-jwks';
const mockGetSigningKey = jest.fn((kid, cb) => {
  cb(null, { getPublicKey: () => MOCK_PUBLIC_KEY });
});
jest.mock('jwks-rsa', () => () => ({
  getSigningKey: mockGetSigningKey,
}));

// Mock jsonwebtoken to bypass signature: always returns the claims
const mockVerify = jest.fn();
jest.mock('jsonwebtoken', () => ({
  verify: (...args: any[]) => mockVerify(...args),
}));

// --- IMPORT THE MIDDLEWARE UNDER TEST ---

import {
  tenantContextMiddleware,
  releaseDbClientMiddleware,
  TenantClaims,
} from '../src/middleware/tenantContext.middleware';

// --- TEST FIXTURES ---

// Claims expected by your middleware
const MOCK_CLAIMS: TenantClaims = {
  sub: 'tenant-abc-123',
  tenant_name: 'Acme Corp',
  primary_region: 'us-west-2',
  allowed_regions: ['us-west-2', 'eu-central-1'],
  roles: ['admin'],
  org_id: 'org-456',
  correlation_id: 'corr-xyz-789',
  iat: Math.floor(Date.now() / 1000) - 60,
  exp: Math.floor(Date.now() / 1000) + 3600,
};

// This header {"alg":"ES384","typ":"JWT","kid":"mock-kid-1"} base64url
const MOCK_JWT_HEADER_B64 =
  'eyJhbGciOiJFUzM4NCIsInR5cCI6IkpXVCIsImtpZCI6Im1vY2sta2lkLTEifQ';
// Dummy payload and signature (not used, but three parts needed)
const MOCK_TOKEN = `${MOCK_JWT_HEADER_B64}.eyJmb28iOiJiYXIifQ.dXNlcmN0b2tlbm==`;

// --- SETUP THE TEST APP ---

let app: Express;

beforeAll(() => {
  app = express();
  app.use(tenantContextMiddleware);
  app.use(releaseDbClientMiddleware);
  app.get('/test-route', (req, res) => {
    // success if req.tenantContext is attached
    if (req.tenantContext) {
      res.status(200).json({ status: 'ok', tenant: req.tenantContext });
    } else {
      res.status(500).json({ status: 'error', message: 'Context missing' });
    }
  });
});

// --- TESTS ---

describe('tenantContextMiddleware', () => {
  beforeEach(() => {
    // resets mocks for each test
    mockGetSigningKey.mockClear();
    mockVerify.mockClear();
  });

  it('should return 401 when token missing', async () => {
    const res = await request(app).get('/test-route');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('MISSING_TOKEN');
  });

  it('should return 200 and attach context when token valid', async () => {
    // Setup our signature-bypass: when verify is called, return the mock claims
    mockVerify.mockReturnValue(MOCK_CLAIMS);

    const res = await request(app)
      .get('/test-route')
      .set('X-Tenant-Context', MOCK_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.tenant.tenant_name).toBe('Acme Corp');
    expect(res.body.tenant.sub).toBe('tenant-abc-123');
    expect(mockGetSigningKey).toHaveBeenCalledWith(
      'mock-kid-1',
      expect.any(Function),
    );
    expect(mockVerify).toHaveBeenCalled();
  });

  it('should return 401 when claims are invalid', async () => {
    // Return incomplete claims
    mockVerify.mockReturnValue({ sub: 'id-only' });

    const res = await request(app)
      .get('/test-route')
      .set('X-Tenant-Context', MOCK_TOKEN);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });
});
