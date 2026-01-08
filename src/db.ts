// src/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASEURL, // from .env @1
});

export function getDbPool(): Pool {
  return pool;
}
