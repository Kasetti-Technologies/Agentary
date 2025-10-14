# 🧱 Database Migration Policy

## Schema Versioning
- All schema changes must bump the version in `schemas/version.txt`
- Each migration must be tracked with a timestamped file in `/schemas/migrations/`

## Migration Workflow
1. Developer creates migration SQL file
2. Runs locally against dev DB
3. Opens PR with migration file + version bump
4. CI runs migration test job

## Rollbacks
- Rollbacks must be defined in a paired `rollback.sql` file
- Rollbacks must be tested in CI before merging

## CI Gates  
- CI must validate: 
  - Migration file syntax 
  - No destructive changes without rollback
  - Version bump is present
