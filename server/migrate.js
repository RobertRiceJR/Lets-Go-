/**
 * One-time (idempotent) migration: the flat `activities` table -> the normalized
 * `places` tables, conformed to the 5-Year-Plan Life DB `places` package.
 *
 *   node server/migrate.js            # migrate data (NON-DESTRUCTIVE — `activities` left intact)
 *   node server/migrate.js --cutover  # ALSO rename activities -> activities_legacy
 *
 * Idempotent: dedups locations by source_key/title and SKIPS any old row whose id
 * already exists as a location_activity. The old `activities.id` is preserved as
 * `location_activity.id` so the Phase-3 compat view and existing client references
 * stay stable.
 *
 * IMPORTANT:
 *  - Back up the DB first (Railway /data/db.sqlite is your prod data).
 *  - RUN WITH THE API QUIESCED — one writer per SQLite file.
 *  - `--cutover` renames the source table and WILL break the live app until the
 *    Phase-3 compat view + route changes ship. Use it only as part of Phase 3.
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { applyPragmas, PLACES_SQL, PLACES_SEED_SQL } = require('./db/schema');
const { STATUS_TO_CODE, SEASON_TO_CODE, splitCategory, makeResolvers } = require('./lib/places-map');

const CUTOVER = process.argv.includes('--cutover');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'db.sqlite');
if (!fs.existsSync(DB_PATH)) {
  console.error(`✗ DB not found at ${DB_PATH}. Nothing to migrate.`);
  process.exit(1);
}

const db = new Database(DB_PATH);
applyPragmas(db);
db.exec(PLACES_SQL);      // ensure places tables/indexes/triggers/view exist (does NOT touch `activities`)
db.exec(PLACES_SEED_SQL); // ensure lookups are seeded

// Source table works before OR after cutover.
const tableExists = (name) =>
  !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
const hasActivities = tableExists('activities');
const hasLegacy = tableExists('activities_legacy');
const SOURCE = hasActivities ? 'activities' : hasLegacy ? 'activities_legacy' : null;
if (!SOURCE) {
  console.error('✗ No `activities` or `activities_legacy` table to migrate from.');
  process.exit(1);
}

const { locCatId, actCatId, locStatusId, seasonId, actLabel } = makeResolvers(db);

// ---- prepared statements --------------------------------------------------
const findActivityById = db.prepare('SELECT id FROM location_activity WHERE id = ?');
const findLocByKey = db.prepare('SELECT id FROM location WHERE source_key = ?');
const findLocByTitle = db.prepare('SELECT id FROM location WHERE title = ?');
const insLocation = db.prepare(
  `INSERT INTO location (title, category_id, status_id, notes, source, source_key)
   VALUES (@title, @category_id, @status_id, @notes, @source, @source_key)`
);
const insActivity = db.prepare(
  `INSERT INTO location_activity (id, location_id, title, activity_category_id)
   VALUES (@id, @location_id, @title, @activity_category_id)`
);
const insDrive = db.prepare(
  "INSERT OR IGNORE INTO location_drive_time (location_id, from_label, drive_bucket) VALUES (?, 'Home', ?)"
);
const insSeason = db.prepare('INSERT OR IGNORE INTO location_season (location_id, season_id) VALUES (?, ?)');
const insHistory = db.prepare(
  'INSERT INTO location_activity_history (location_activity_id, visited_on) VALUES (?, ?)'
);
const insRating = db.prepare(
  'INSERT INTO location_activity_history_rating (location_activity_history_id, rating) VALUES (?, ?)'
);

const today = new Date().toISOString().split('T')[0];
const dateOf = (s) => (s ? String(s).split('T')[0].split(' ')[0] : null); // YYYY-MM-DD from date/datetime

// ---- migrate --------------------------------------------------------------
const stats = { source: 0, skipped: 0, locations: 0, activities: 0, drive_times: 0, seasons: 0, histories: 0, ratings: 0 };
const rows = db.prepare(`SELECT * FROM ${SOURCE} ORDER BY id`).all();
stats.source = rows.length;

const migrate = db.transaction(() => {
  for (const a of rows) {
    if (findActivityById.get(a.id)) { stats.skipped++; continue; } // already migrated (id preserved)

    const [locCode, actCode] = splitCategory(a.category);

    // location — dedup by source_key, else by title (collapses same-place rows into 1:N)
    let locId = a.source_key ? findLocByKey.get(a.source_key)?.id : null;
    if (!locId) locId = findLocByTitle.get(a.title)?.id;
    if (!locId) {
      locId = insLocation.run({
        title: a.title,
        category_id: locCatId(locCode),
        status_id: locStatusId(STATUS_TO_CODE[a.status] || 'want-to-go'),
        notes: a.notes ?? null,
        source: a.source ?? null,
        source_key: a.source_key ?? null,
      }).lastInsertRowid;
      stats.locations++;
    }

    // activity — id preserved from old activities.id
    insActivity.run({
      id: a.id,
      location_id: locId,
      title: actLabel[actCode] || 'Visit',
      activity_category_id: actCatId(actCode),
    });
    stats.activities++;

    // drive time (Home; only the legacy bucket is known — minutes/miles NULL)
    if (a.drive_time) stats.drive_times += insDrive.run(locId, a.drive_time).changes;

    // season (M:N; 'Any' -> 'any')
    const scode = SEASON_TO_CODE[a.season];
    if (scode) stats.seasons += insSeason.run(locId, seasonId(scode)).changes;

    // visit history + rating (a completion/rating implies you've been)
    if (a.status === 'done' || a.rating != null || a.date_completed != null) {
      const visitedOn = dateOf(a.date_completed) || dateOf(a.created_at) || today;
      const histId = insHistory.run(a.id, visitedOn).lastInsertRowid;
      stats.histories++;
      if (a.rating != null) { insRating.run(histId, a.rating); stats.ratings++; }
    }
  }
});
migrate();

// ---- reconciliation -------------------------------------------------------
const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
const fk = db.pragma('foreign_key_check');
console.log(`✅ Migration complete from \`${SOURCE}\` (${DB_PATH})`);
console.log(`   source rows: ${stats.source}  |  skipped (already migrated): ${stats.skipped}`);
console.log(`   created — locations: ${stats.locations}, activities: ${stats.activities}, ` +
  `drive_times: ${stats.drive_times}, seasons: ${stats.seasons}, histories: ${stats.histories}, ratings: ${stats.ratings}`);
console.log(`   totals now — location: ${count('location')}, location_activity: ${count('location_activity')}, ` +
  `history: ${count('location_activity_history')}, rating: ${count('location_activity_history_rating')}`);
console.log(`   foreign_key_check: ${fk.length === 0 ? 'clean' : JSON.stringify(fk)}`);

// reconciliation guard: one activity per source row
const laCount = count('location_activity');
const ok = fk.length === 0 && laCount >= stats.source;
if (!ok) console.warn(`   ⚠ WARN: expected location_activity >= ${stats.source} and clean FKs — review before cutover.`);

// ---- optional cutover -----------------------------------------------------
if (CUTOVER) {
  if (SOURCE !== 'activities') {
    console.log('   --cutover: source already renamed; nothing to do.');
  } else if (hasLegacy) {
    console.error('   ✗ --cutover: activities_legacy already exists; refusing to overwrite. Resolve manually.');
  } else if (!ok) {
    console.error('   ✗ --cutover: skipped because reconciliation did not pass.');
  } else {
    db.exec('ALTER TABLE activities RENAME TO activities_legacy');
    console.log('   --cutover: renamed `activities` -> `activities_legacy` (compat view/routes land in Phase 3).');
  }
}

process.exit(0);
