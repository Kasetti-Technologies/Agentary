import jwt from 'jsonwebtoken';
import nock from 'nock';
import { generateKeyPairSync } from 'crypto';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-384' });

export const mockJwks = () => {
  nock('https://auth.example.local')
    .get('/.well-known/jwks.json')
    .reply(200, {
      keys: [
        {
          kty: 'EC',
          crv: 'P-384',
          kid: 'test-key',
          use: 'sig',
          x5c: [],
        },
      ],
    });
};

export const makeToken = (claims = {}) => {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: 'uuid-tenant',
      tenant_name: 'Acme',
      primary_region: 'us-east',
      allowed_regions: ['us-east', 'eu-central'],
      roles: ['admin'],
      org_id: 'org-123',
      correlation_id: 'corr-uuid',
      iat: now,
      exp: now + 3600,
      ...claims,
    },
    privateKey,
    { algorithm: 'ES384', keyid: 'test-key' }
  );
};

export const pubKey = publicKey;
