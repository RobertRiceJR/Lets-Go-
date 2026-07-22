const express = require('express');
const router = express.Router();
const db = require('../db');
const { makePlacesReader, toContract, CONTRACT_VERSION } = require('../lib/places-read');

// GET /api/export/places — every place in the vault frontmatter-contract shape.
// The Phase-7 local pull script consumes this to write vault place-notes.
// Gated by requireToken at the mount (see server.js).
const reader = makePlacesReader(db);

router.get('/places', (_req, res) => {
  const places = reader.listPlaces().map(toContract);
  res.json({ contract_version: CONTRACT_VERSION, count: places.length, places });
});

module.exports = router;
