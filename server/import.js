/**
 * Non-destructive importer — upserts harvested "things to do" from the
 * last30days pipeline into the activities table.
 *
 *   npm run import:letsgo                 # reads the sibling repo's export
 *   npm run import:letsgo -- --from path  # explicit JSON path
 *
 * Contract (produced by last30daysDashboard_Claude/src/export_letsgo.py):
 *   { source, source_key, title, category, season, notes, lat, lon, source_url }
 *
 * Design:
 *  - IDEMPOTENT: dedup by source_key. New places INSERT; places already present
 *    are SKIPPED so your in-app edits (status, rating, notes) are never clobbered.
 *  - NON-DESTRUCTIVE: unlike seed.js, this never DELETEs. Back up the DB anyway —
 *    it's gitignored, so the file copy is your only rollback.
 *  - drive_time (NOT NULL, absent from the contract) is computed here from a
 *    configurable HOME location (HOME_LAT/HOME_LON) + the record's lat/lon.
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { applySchema } = require('./db/schema');
const { driveTimeBucket } = require('./lib/drive-time');

// ---- CLI args -------------------------------------------------------------
const argv = process.argv.slice(2);
function argVal(flag) {
  const i = argv.indexOf(flag);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
}
const FROM =
  argVal('--from') ||
  path.join(__dirname, '..', '..', 'last30daysDashboard_Claude', 'exports', 'lets-go', 'activities.json');

// ---- Home location (Chicago-area default: Naperville, IL) ------------------
const HOME_LAT = parseFloat(process.env.HOME_LAT || '41.7508');
const HOME_LON = parseFloat(process.env.HOME_LON || '-88.1535');

// ---- Enums (must match client/src/lib/constants.js) -----------------------
const CATEGORIES = new Set([
  'Arts & Crafts', 'Day Trips', 'Lakes & Swimming', 'Hikes & Nature',
  'Rainy Day', 'Food & Restaurants', 'Seasonal', 'Local Gems',
]);
const SEASONS = new Set(['Any', 'Spring', 'Summer', 'Fall', 'Winter']);

// drive_time bucketing lives in ./lib/drive-time.js (shared with the API + future recompute).

// ---- DB (same path resolution as db.js / seed.js) -------------------------
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'db.sqlite');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(DB_PATH);

// Schema + settings + guarded provenance columns (single source of truth; runs standalone).
applySchema(db);

// ---- Load the contract JSON ----------------------------------------------
if (!fs.existsSync(FROM)) {
  console.error(`✗ Import file not found: ${FROM}\n  Run \`.\\run export-letsgo\` in the last30days repo first, or pass --from <path>.`);
  process.exit(1);
}
let records;
try {
  records = JSON.parse(fs.readFileSync(FROM, 'utf-8'));
} catch (e) {
  console.error(`✗ Could not parse ${FROM}: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(records)) {
  console.error('✗ Expected the import file to be a JSON array of activity records.');
  process.exit(1);
}

// ---- Idempotent upsert ----------------------------------------------------
const findByKey = db.prepare('SELECT id FROM activities WHERE source_key = ?');
const insert = db.prepare(`
  INSERT INTO activities (title, category, drive_time, season, notes, source, source_key)
  VALUES (@title, @category, @drive_time, @season, @notes, @source, @source_key)
`);

let inserted = 0, skipped = 0, invalid = 0;
const run = db.transaction((items) => {
  for (const r of items) {
    const title = (r.title || '').trim();
    const source_key = (r.source_key || '').trim();
    if (!title || !source_key) {
      invalid++;
      console.warn(`  ! skipped record with missing title/source_key: ${JSON.stringify(r).slice(0, 80)}`);
      continue;
    }
    if (findByKey.get(source_key)) {
      skipped++;
      continue; // already present — preserve any in-app edits
    }
    const category = CATEGORIES.has(r.category) ? r.category : 'Day Trips';
    const season = SEASONS.has(r.season) ? r.season : 'Any';
    insert.run({
      title,
      category,
      drive_time: driveTimeBucket(HOME_LAT, HOME_LON, r.lat, r.lon),
      season,
      notes: r.notes || null,
      source: r.source || 'last30days',
      source_key,
    });
    inserted++;
  }
});
run(records);

console.log(
  `✅ Import complete from ${FROM}\n` +
  `   inserted: ${inserted}  |  skipped (already present): ${skipped}` +
  (invalid ? `  |  invalid: ${invalid}` : '') +
  `\n   DB: ${DB_PATH}  (home ${HOME_LAT},${HOME_LON})`
);
process.exit(0);
