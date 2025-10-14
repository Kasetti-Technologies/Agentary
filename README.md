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


# 🧠 Agentary Monorepo

This repo contains canonical schemas, CI workflows, SDK stubs, and runbooks for validating usage events and computing golden hashes.

---

## 📁 Folder Overview

- `schemas/`: Canonical field map, AJV schema, OpenAPI spec
- `ci/testdata/`: Sample events for hash validation
- `ci/golden/`: Golden hash templates
- `packages/`: SDK stubs in TypeScript and Python
- `runbooks/`: Incident handling and operational guides
- `.github/workflows/`: CI jobs for validation and testing

---

## 🚀 CI Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `validate-contracts.yaml` | PR to `schemas/**` | Lints OpenAPI and runs AJV tests |
| `compute-golden-hashes.yaml` | Manual or push to testdata | Computes SHA-256 hashes |
| `contract-and-unit-tests.yaml` | PR to `main` | Runs unit tests and hash parity checks |

---

## 🧪 How to Run Locally
 
```bash  
npm ci
node ci/scripts/run-ajv-tests.js
node ci/scripts/compute-golden.js
