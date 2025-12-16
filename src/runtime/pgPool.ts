// src/runtime/pgPool.ts
import { Pool } from 'pg';

export function createPgPool(): Pool {
  const connectionString =
    process.env.DATABASE_URL ?? 'postgres://dev:devpass@localhost:5432/agentary';

  return new Pool({
    connectionString,
  });
}
