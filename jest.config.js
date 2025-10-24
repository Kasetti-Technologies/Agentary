// jest.config.cjs  (or jest.config.js with module.exports)

const config = {
  preset: 'ts-jest',                 // TypeScript → JS
  testEnvironment: 'node',
  // Transform the ESM‑only deps instead of ignoring them
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|jwks-rsa)/)',   // <-- keep these packages transformed
  ],
  // If you also need Babel (e.g. for JSX), add it here
  // transform: { '^.+\\.[tj]sx?$': 'babel-jest' },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  verbose: true,
};
module.exports = config;               // CJS export
