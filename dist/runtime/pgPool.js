"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPgPool = createPgPool;
// src/runtime/pgPool.ts
const pg_1 = require("pg");
function createPgPool() {
    const connectionString = process.env.DATABASE_URL ?? 'postgres://dev:devpass@localhost:5432/agentary';
    return new pg_1.Pool({
        connectionString,
    });
}
