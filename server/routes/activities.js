const express = require('express');
const router = express.Router();
const db = require('../db');
const { STATUS_TO_CODE, SEASON_TO_CODE, splitCategory, makeResolvers } = require('../lib/places-map');

// Reads go through v_activities_compat (reconstructs the old flat shape); writes
// translate the flat fields into the places tables. External behavior is
// identical to the old flat API, so the React client is untouched.
const R = makeResolvers(db);
const today = () => new Date().toISOString().split('T')[0];

const getCompat = db.prepare('SELECT * FROM v_activities_compat WHERE id = ?');
const getLocId = db.prepare('SELECT location_id FROM location_activity WHERE id = ?');
const findLocByTitle = db.prepare('SELECT id FROM location WHERE title = ?');
const insLocation = db.prepare(
  'INSERT INTO location (title, category_id, status_id, notes) VALUES (@title,@category_id,@status_id,@notes)'
);
const insActivity = db.prepare(
  'INSERT INTO location_activity (location_id, title, activity_category_id) VALUES (@location_id,@title,@activity_category_id)'
);
const upsDrive = db.prepare(
  `INSERT INTO location_drive_time (location_id, from_label, drive_bucket) VALUES (?, 'Home', ?)
   ON CONFLICT(location_id, from_label) DO UPDATE SET drive_bucket = excluded.drive_bucket`
);
const delSeasons = db.prepare('DELETE FROM location_season WHERE location_id = ?');
const insSeason = db.prepare('INSERT OR IGNORE INTO location_season (location_id, season_id) VALUES (?, ?)');
const setLocTitle = db.prepare('UPDATE location SET title = ? WHERE id = ?');
const setLocNotes = db.prepare('UPDATE location SET notes = ? WHERE id = ?');
const setLocCategory = db.prepare('UPDATE location SET category_id = ? WHERE id = ?');
const setLocStatus = db.prepare('UPDATE location SET status_id = ? WHERE id = ?');
const setActivity = db.prepare('UPDATE location_activity SET activity_category_id = ?, title = ? WHERE id = ?');
const latestHist = db.prepare(
  'SELECT id FROM location_activity_history WHERE location_activity_id = ? ORDER BY visited_on DESC, id DESC LIMIT 1'
);
const countHist = db.prepare('SELECT COUNT(*) c FROM location_activity_history WHERE location_activity_id = ?');
const insHistory = db.prepare('INSERT INTO location_activity_history (location_activity_id, visited_on) VALUES (?, ?)');
const delHistory = db.prepare('DELETE FROM location_activity_history WHERE location_activity_id = ?');
const delRatings = db.prepare('DELETE FROM location_activity_history_rating WHERE location_activity_history_id = ?');
const insRating = db.prepare('INSERT INTO location_activity_history_rating (location_activity_history_id, rating) VALUES (?, ?)');
const delActivity = db.prepare('DELETE FROM location_activity WHERE id = ?');
const countActsForLoc = db.prepare('SELECT COUNT(*) c FROM location_activity WHERE location_id = ?');
const delLocation = db.prepare('DELETE FROM location WHERE id = ?');

// GET /api/activities  — supports ?category=, ?status=, ?drive_time=, ?season=
router.get('/', (req, res) => {
  const { category, status, drive_time, season } = req.query;
  let query = 'SELECT * FROM v_activities_compat WHERE 1=1';
  const params = [];
  if (category) { query += ' AND category = ?'; params.push(category); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (drive_time) { query += ' AND drive_time = ?'; params.push(drive_time); }
  if (season && season !== 'Any') { query += " AND (season = ? OR season = 'Any')"; params.push(season); }
  query += ' ORDER BY created_at DESC, id DESC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/activities
router.post('/', (req, res) => {
  const { title, category, status = 'want to do', drive_time, season = 'Any', notes } = req.body;
  if (!title || !category || !drive_time) {
    return res.status(400).json({ error: 'title, category, and drive_time are required' });
  }
  const [locCode, actCode] = splitCategory(category);
  const statusCode = STATUS_TO_CODE[status] || 'want-to-go';

  const laId = db.transaction(() => {
    // find-or-create the location (location.title is UNIQUE; same-title POST adds a 1:N activity)
    let locId = findLocByTitle.get(title)?.id;
    if (!locId) {
      locId = insLocation.run({
        title,
        category_id: R.locCatId(locCode),
        status_id: R.locStatusId(statusCode),
        notes: notes || null,
      }).lastInsertRowid;
    }
    const newId = insActivity.run({
      location_id: locId,
      title: R.actLabel[actCode] || 'Visit',
      activity_category_id: R.actCatId(actCode),
    }).lastInsertRowid;
    upsDrive.run(locId, drive_time);
    const scode = SEASON_TO_CODE[season];
    if (scode) insSeason.run(locId, R.seasonId(scode));
    if (statusCode === 'been') insHistory.run(newId, today()); // POSTed as done -> stamp a visit
    return newId;
  })();

  res.status(201).json(getCompat.get(laId));
});

// PATCH /api/activities/:id
router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = getCompat.get(id);
  if (!existing) return res.status(404).json({ error: 'Activity not found' });
  const locId = getLocId.get(id).location_id;
  const u = req.body;

  db.transaction(() => {
    if ('notes' in u) setLocNotes.run(u.notes || null, locId);
    if ('title' in u && u.title) setLocTitle.run(u.title, locId);
    if ('category' in u && u.category) {
      const [locCode, actCode] = splitCategory(u.category);
      setLocCategory.run(R.locCatId(locCode), locId);
      setActivity.run(R.actCatId(actCode), R.actLabel[actCode] || 'Visit', id);
    }
    if ('drive_time' in u && u.drive_time) upsDrive.run(locId, u.drive_time);
    if ('season' in u && u.season) {
      delSeasons.run(locId);
      const scode = SEASON_TO_CODE[u.season];
      if (scode) insSeason.run(locId, R.seasonId(scode));
    }

    // status lifecycle (mirrors the old server rule; also duplicated optimistically in KanbanView)
    if ('status' in u) {
      if (u.status === 'done') {
        setLocStatus.run(R.locStatusId('been'), locId);
        if (existing.status !== 'done' && countHist.get(id).c === 0) insHistory.run(id, today());
      } else if (u.status === 'want to do') {
        setLocStatus.run(R.locStatusId('want-to-go'), locId);
        if (existing.status === 'done') delHistory.run(id); // cascade drops ratings -> clears date_completed + rating
      }
    }

    // rating (attaches to the latest visit; ensure one exists so a rating is never dropped)
    if ('rating' in u) {
      let h = latestHist.get(id);
      if (u.rating == null) {
        if (h) delRatings.run(h.id);
      } else {
        if (!h) h = { id: insHistory.run(id, today()).lastInsertRowid };
        delRatings.run(h.id);
        insRating.run(h.id, u.rating);
      }
    }
  })();

  res.json(getCompat.get(id));
});

// DELETE /api/activities/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = getCompat.get(id);
  if (!existing) return res.status(404).json({ error: 'Activity not found' });
  const locId = getLocId.get(id).location_id;

  db.transaction(() => {
    delActivity.run(id); // cascades this activity's history + ratings
    if (countActsForLoc.get(locId).c === 0) delLocation.run(locId); // orphaned place -> remove (cascades drive_time + seasons)
  })();

  res.json({ success: true });
});

module.exports = router;
