// jest.config.js
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Transform the ESM‑only deps instead of ignoring them
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|jwks-rsa)/)', // <-- This line fixes the 'export' error
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  verbose: true,
};

module.exports = config;
