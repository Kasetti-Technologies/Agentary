// src/routes/selections.js
const express = require('express');
const router = express.Router();

const { postSelections } = require('../controllers/SelectionController');
// If you want to protect this later, you can re-enable auth:
// const { authMiddleware } = require('../middleware/auth');

// POST /tenant/:tenant_id/selections
router.post(
  '/tenant/:tenant_id/selections',
  express.json(),      // ensure JSON body parsing for this route
  // authMiddleware,    // <-- keep commented while testing without JWT
  postSelections
);

module.exports = router;
