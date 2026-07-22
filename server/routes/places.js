const express = require('express');
const router = express.Router();
const db = require('../db');
const { makePlacesReader } = require('../lib/places-read');
const { makeResolvers } = require('../lib/places-map');
const { requireToken } = require('../lib/auth');

// The places resource. Reads (GET) are open like the compat routes; writes
// (POST/PATCH/DELETE) are gated by requireToken — this is the surface the remote
// MCP's create_location / add_activity / log_visit / add_rating / set_status
// tools call. Inputs speak lk_* CODES (same vocabulary as the reader/contract).
const reader = makePlacesReader(db);
const R = makeResolvers(db);
const today = () => new Date().toISOString().split('T')[0];
const err = (status, msg) => Object.assign(new Error(msg), { status });
const handle = (fn) => (req, res) => {
  try {
    fn(req, res);
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ error: e.message });
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

// code validators (throw 400 on unknown; return the resolved id)
const has = (tbl, code) => Object.prototype.hasOwnProperty.call(R.idOf[tbl], code);
const vLocCat = (c) => { if (!has('lk_location_category', c)) throw err(400, `unknown category '${c}'`); return R.locCatId(c); };
const vLocStatus = (c) => { if (!has('lk_location_status', c)) throw err(400, `unknown status '${c}'`); return R.locStatusId(c); };
const vSeason = (c) => { if (!has('lk_location_season', c)) throw err(400, `unknown season '${c}'`); return R.seasonId(c); };
const vActCat = (c) => { if (!has('lk_activity_category', c)) throw err(400, `unknown activity category '${c}'`); return R.actCatId(c); };
const vRating = (r) => { if (!Number.isInteger(r) || r < 1 || r > 5) throw err(400, 'rating must be an integer 1-5'); return r; };

// prepared writes
const qLocExists = db.prepare('SELECT id FROM location WHERE id = ?');
const qLocByTitle = db.prepare('SELECT id FROM location WHERE title = ?');
const qActInLoc = db.prepare('SELECT id FROM location_activity WHERE id = ? AND location_id = ?');
const qVisitInAct = db.prepare('SELECT id FROM location_activity_history WHERE id = ? AND location_activity_id = ?');
const insLocation = db.prepare(`INSERT INTO location
  (title, category_id, status_id, address, city, state, zip, lat, lng, notes, source, source_key)
  VALUES (@title,@category_id,@status_id,@address,@city,@state,@zip,@lat,@lng,@notes,@source,@source_key)`);
const insSeason = db.prepare('INSERT OR IGNORE INTO location_season (location_id, season_id) VALUES (?, ?)');
const upsDrive = db.prepare(`INSERT INTO location_drive_time
  (location_id, from_label, drive_minutes, distance_miles, drive_bucket)
  VALUES (@location_id,@from_label,@drive_minutes,@distance_miles,@drive_bucket)
  ON CONFLICT(location_id, from_label) DO UPDATE SET
    drive_minutes=excluded.drive_minutes, distance_miles=excluded.distance_miles, drive_bucket=excluded.drive_bucket`);
const insActivity = db.prepare(`INSERT INTO location_activity
  (location_id, title, activity_category_id, description, cost_estimate, duration_min)
  VALUES (@location_id,@title,@activity_category_id,@description,@cost_estimate,@duration_min)`);
const insHistory = db.prepare(`INSERT INTO location_activity_history
  (location_activity_id, visited_on, with_whom, cost_actual, note)
  VALUES (@location_activity_id,@visited_on,@with_whom,@cost_actual,@note)`);
const insRating = db.prepare('INSERT INTO location_activity_history_rating (location_activity_history_id, rating, notes) VALUES (?, ?, ?)');
const delActivity = db.prepare('DELETE FROM location_activity WHERE id = ?');
const delLocation = db.prepare('DELETE FROM location WHERE id = ?');

// nested builders (run inside a transaction)
function addVisit(aid, v) {
  const hid = insHistory.run({
    location_activity_id: aid,
    visited_on: v.date || today(),
    with_whom: v.with ?? null,
    cost_actual: v.cost ?? null,
    note: v.note ?? null,
  }).lastInsertRowid;
  if (v.rating != null) insRating.run(hid, vRating(v.rating), v.notes ?? null);
  for (const r of v.ratings || []) insRating.run(hid, vRating(r.rating), r.notes ?? null);
  return hid;
}
function addActivity(locId, a) {
  if (!a || !a.title) throw err(400, 'activity title is required');
  const aid = insActivity.run({
    location_id: locId,
    title: a.title,
    activity_category_id: a.category != null ? vActCat(a.category) : null,
    description: a.description ?? null,
    cost_estimate: a.cost_estimate ?? null,
    duration_min: a.duration_min ?? null,
  }).lastInsertRowid;
  for (const v of a.visits || []) addVisit(aid, v);
  return aid;
}

// ---- reads (open) ---------------------------------------------------------
router.get('/', (req, res) => {
  const { search, status, season } = req.query;
  res.json(reader.listPlaces({ search, status, season }));
});
router.get('/:id', (req, res) => {
  const place = reader.getPlace(Number(req.params.id));
  if (!place) return res.status(404).json({ error: 'Location not found' });
  res.json(place);
});

// ---- writes (gated) -------------------------------------------------------
// POST /api/places — create a place (optionally nested: seasons, drive_times, activities/visits/ratings)
router.post('/', requireToken, handle((req, res) => {
  const b = req.body || {};
  if (!b.title) throw err(400, 'title is required');
  if (qLocByTitle.get(b.title)) throw err(409, 'a location with that title already exists');
  const category_id = b.category != null ? vLocCat(b.category) : null;
  const status_id = vLocStatus(b.status || 'want-to-go');
  const locId = db.transaction(() => {
    const id = insLocation.run({
      title: b.title, category_id, status_id,
      address: b.address ?? null, city: b.city ?? null, state: b.state ?? null, zip: b.zip ?? null,
      lat: b.lat ?? null, lng: b.lng ?? null, notes: b.notes ?? null,
      source: b.source ?? null, source_key: b.source_key ?? null,
    }).lastInsertRowid;
    for (const s of b.seasons || []) insSeason.run(id, vSeason(s));
    for (const d of b.drive_times || []) upsDrive.run({
      location_id: id, from_label: d.from || 'Home',
      drive_minutes: d.minutes ?? null, distance_miles: d.miles ?? null, drive_bucket: d.bucket ?? null,
    });
    for (const a of b.activities || []) addActivity(id, a);
    return id;
  })();
  res.status(201).json(reader.getPlace(locId));
}));

// PATCH /api/places/:id — update location fields (incl. status)
const LOC_SETTERS = {
  title: (v) => ['title', v],
  notes: (v) => ['notes', v ?? null],
  address: (v) => ['address', v ?? null],
  city: (v) => ['city', v ?? null],
  state: (v) => ['state', v ?? null],
  zip: (v) => ['zip', v ?? null],
  lat: (v) => ['lat', v ?? null],
  lng: (v) => ['lng', v ?? null],
  category: (v) => ['category_id', v != null ? vLocCat(v) : null],
  status: (v) => ['status_id', vLocStatus(v)],
};
router.patch('/:id', requireToken, handle((req, res) => {
  const id = Number(req.params.id);
  if (!qLocExists.get(id)) throw err(404, 'Location not found');
  const b = req.body || {};
  const sets = [], vals = [];
  for (const k of Object.keys(b)) {
    if (LOC_SETTERS[k]) { const [col, val] = LOC_SETTERS[k](b[k]); sets.push(`${col} = ?`); vals.push(val); }
  }
  if (sets.length) db.prepare(`UPDATE location SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
  res.json(reader.getPlace(id));
}));

// DELETE /api/places/:id
router.delete('/:id', requireToken, handle((req, res) => {
  const id = Number(req.params.id);
  if (!qLocExists.get(id)) throw err(404, 'Location not found');
  delLocation.run(id); // cascades activities/visits/ratings/drive_times/seasons
  res.json({ success: true });
}));

// POST /api/places/:id/activities — add an activity (optionally with visits)
router.post('/:id/activities', requireToken, handle((req, res) => {
  const id = Number(req.params.id);
  if (!qLocExists.get(id)) throw err(404, 'Location not found');
  db.transaction(() => addActivity(id, req.body || {}))();
  res.status(201).json(reader.getPlace(id));
}));

// DELETE /api/places/:id/activities/:aid
router.delete('/:id/activities/:aid', requireToken, handle((req, res) => {
  const id = Number(req.params.id), aid = Number(req.params.aid);
  if (!qActInLoc.get(aid, id)) throw err(404, 'Activity not found');
  delActivity.run(aid);
  res.json({ success: true });
}));

// POST /api/places/:id/activities/:aid/visits — log a visit (+ optional rating)
router.post('/:id/activities/:aid/visits', requireToken, handle((req, res) => {
  const id = Number(req.params.id), aid = Number(req.params.aid);
  if (!qActInLoc.get(aid, id)) throw err(404, 'Activity not found');
  db.transaction(() => addVisit(aid, req.body || {}))();
  res.status(201).json(reader.getPlace(id));
}));

// POST /api/places/:id/activities/:aid/visits/:vid/ratings — add a rating to a visit
router.post('/:id/activities/:aid/visits/:vid/ratings', requireToken, handle((req, res) => {
  const id = Number(req.params.id), aid = Number(req.params.aid), vid = Number(req.params.vid);
  if (!qActInLoc.get(aid, id)) throw err(404, 'Activity not found');
  if (!qVisitInAct.get(vid, aid)) throw err(404, 'Visit not found');
  const b = req.body || {};
  if (b.rating == null) throw err(400, 'rating is required');
  insRating.run(vid, vRating(b.rating), b.notes ?? null);
  res.status(201).json(reader.getPlace(id));
}));

module.exports = router;
