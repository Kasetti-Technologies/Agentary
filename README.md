# Agentary

## Folder Layout
- `/api`, `/services`, `/web`: Application code
- `/schemas`: OpenAPI, JSON Schema, DDL
- `/ci`: Test data and golden hashes
- `/docs`: Developer guides and policies
- `/infra`: Local dev setup (Docker/K3s)
- `/runbooks`: Incident response guides
- `/packages`: SDKs and shared libraries

## Local Bootstrap
- Install Node.js 18+
- Run `npm ci`
- Run AJV tests and golden hash checks

## How to Run Tests
- Unit tests: `npm test`
- Contract tests: `npx @stoplight/spectral lint`
- Golden hash: `node compute-golden.js`
