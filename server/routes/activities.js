const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/activities  — supports ?category=, ?status=, ?drive_time=, ?season=
router.get('/', (req, res) => {
  const { category, status, drive_time, season } = req.query;

  let query = 'SELECT * FROM activities WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (drive_time) {
    query += ' AND drive_time = ?';
    params.push(drive_time);
  }
  if (season && season !== 'Any') {
    query += " AND (season = ? OR season = 'Any')";
    params.push(season);
  }

  query += ' ORDER BY created_at DESC';

  const activities = db.prepare(query).all(...params);
  res.json(activities);
});

// POST /api/activities
router.post('/', (req, res) => {
  const { title, category, status = 'want to do', drive_time, season = 'Any', notes } = req.body;

  if (!title || !category || !drive_time) {
    return res.status(400).json({ error: 'title, category, and drive_time are required' });
  }

  const result = db
    .prepare(
      'INSERT INTO activities (title, category, status, drive_time, season, notes) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(title, category, status, drive_time, season, notes || null);

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(activity);
});

// PATCH /api/activities/:id
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };

  const existing = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Activity not found' });

  if (updates.status === 'done' && existing.status !== 'done') {
    updates.date_completed = new Date().toISOString().split('T')[0];
  }
  if (updates.status === 'want to do' && existing.status === 'done') {
    updates.date_completed = null;
    updates.rating = null;
  }

  const fields = Object.keys(updates)
    .map((k) => `${k} = ?`)
    .join(', ');
  const values = Object.values(updates);

  db.prepare(`UPDATE activities SET ${fields} WHERE id = ?`).run(...values, id);

  const updated = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /api/activities/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Activity not found' });

  db.prepare('DELETE FROM activities WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;
