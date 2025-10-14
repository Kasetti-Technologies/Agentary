const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const inputPath = path.join(__dirname, '../testdata/canonical_strings.json');
const outputPath = path.join(__dirname, '../golden/event_hash_golden.json');

const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

const output = data.map((event) => {
  const canonical = JSON.stringify(event);
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');
  return { ...event, sha256: hash };
}); 

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`✅ Golden hashes written to ${outputPath}`);
