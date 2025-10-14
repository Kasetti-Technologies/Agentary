const express = require('express');
const secrets = require('./secrets.json');
const app = express();

app.get('/vault/fetch', (req, res) => {
  const path = req.query.path;
  const secret = secrets[path];
  if (secret) {
    res.json(secret);
  } else {
    res.status(404).json({ error: 'Secret not found' });
  }
});
 
app.listen(8200, () => console.log('🔐 Fake Vault running on port 8200'));
