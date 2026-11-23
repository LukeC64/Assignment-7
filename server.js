const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), quiet: true });
const express = require('express');
const { Track } = require('./database/setup');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const REQUIRED_STRINGS = ['songTitle', 'artistName', 'albumName', 'genre'];
const OPTIONAL_INTEGERS = ['duration', 'releaseYear'];
const ALLOWED_FIELDS = [...REQUIRED_STRINGS, ...OPTIONAL_INTEGERS];

// Validate a request body. For POST every required field must be present;
// for PUT (partial = true) only the fields that were sent are checked.
// Returns an array of error messages (empty when valid).
function validateTrack(body, { partial = false } = {}) {
  const errors = [];

  for (const field of REQUIRED_STRINGS) {
    const value = body[field];
    if (value === undefined) {
      if (!partial) errors.push(`${field} is required`);
    } else if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${field} must be a non-empty string`);
    }
  }

  for (const field of OPTIONAL_INTEGERS) {
    const value = body[field];
    if (value !== undefined && value !== null) {
      if (!Number.isInteger(value) || value <= 0) {
        errors.push(`${field} must be a positive integer`);
      }
    }
  }

  return errors;
}

// Keep only known columns so clients can't set trackId or unknown fields.
function pickFields(body) {
  const data = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      data[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
    }
  }
  return data;
}

// Reject ids like "abc" or "1.5" before hitting the database.
function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/tracks - all tracks
app.get('/api/tracks', async (req, res, next) => {
  try {
    const tracks = await Track.findAll();
    res.json(tracks);
  } catch (err) {
    next(err);
  }
});

// GET /api/tracks/:id - one track
app.get('/api/tracks/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Track id must be a positive integer' });

    const track = await Track.findByPk(id);
    if (!track) return res.status(404).json({ error: `Track ${id} not found` });

    res.json(track);
  } catch (err) {
    next(err);
  }
});

// POST /api/tracks - create a track
app.post('/api/tracks', async (req, res, next) => {
  try {
    const errors = validateTrack(req.body || {});
    if (errors.length > 0) return res.status(400).json({ errors });

    const track = await Track.create(pickFields(req.body));
    res.status(201).json(track);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tracks/:id - update a track
app.put('/api/tracks/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Track id must be a positive integer' });

    const body = req.body || {};
    const errors = validateTrack(body, { partial: true });
    const data = pickFields(body);
    if (Object.keys(data).length === 0 && errors.length === 0) {
      errors.push(`Provide at least one of: ${ALLOWED_FIELDS.join(', ')}`);
    }
    if (errors.length > 0) return res.status(400).json({ errors });

    const [affectedCount] = await Track.update(data, { where: { trackId: id } });
    if (affectedCount === 0) return res.status(404).json({ error: `Track ${id} not found` });

    const updated = await Track.findByPk(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tracks/:id - delete a track
app.delete('/api/tracks/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Track id must be a positive integer' });

    const deletedCount = await Track.destroy({ where: { trackId: id } });
    if (deletedCount === 0) return res.status(404).json({ error: `Track ${id} not found` });

    res.json({ message: `Track ${id} deleted` });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Fallbacks
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Music Library API running on http://localhost:${PORT}`);
});
