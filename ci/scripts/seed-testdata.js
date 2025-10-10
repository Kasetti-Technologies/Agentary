const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load canonical test data
const dataPath = path.join(__dirname, '../testdata/canonical_strings.json');
const testVectors = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Connect to Postgres
const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'dev',
  password: 'devpass',
  database: 'agentary',
});

async function seed() {
  try {
    await client.connect();

    for (const item of testVectors) {
     await client.query(
  'INSERT INTO events (tenant_id, event_type, timestamp) VALUES ($1, $2, $3)',
  [item.tenant_id, item.event_type, item.timestamp]
);
    }

    console.log('✅ Seeded canonical test vectors');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await client.end();
  }
}

seed();
