// SINGLE SOURCE OF TRUTH for the database shape + connection settings.
// Consumed by db.js, seed.js, and import.js so the DDL lives in exactly one
// place. See ./README.md and ../../docs/places-frontmatter-contract.md.
//
// Two table families:
//   * activities  — the original flat table. Still serves the React client
//                   (directly today; via a compatibility view after migration).
//   * places      — location / location_activity / location_activity_history /
//                   _rating / location_drive_time / location_season + lk_*
//                   lookups. Conformed COLUMN-FOR-COLUMN to the 5-Year-Plan
//                   Life DB `places` package (the schema authority at
//                   5_Year_Plan/db/build_schema.py). The app adds operational
//                   columns (created_at/updated_at, source/source_key) and,
//                   being a LIVE db, FK cascades + indexes + updated_at triggers
//                   the rebuildable hub omits. The shared contract is the
//                   COLUMN SET, not the constraints.

// Connection settings. Per-connection (WAL persists on the file). Every script
// that opens the DB must call applyPragmas — otherwise foreign keys are
// silently not enforced.
function applyPragmas(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
}

// ---- legacy flat table ----------------------------------------------------
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'want to do',
  drive_time TEXT NOT NULL,
  season TEXT NOT NULL DEFAULT 'Any',
  notes TEXT,
  date_completed TEXT,
  rating INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// ---- places (conforms to the hub `places` package) ------------------------
const PLACES_SQL = `
CREATE TABLE IF NOT EXISTS lk_location_category (
  id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, label TEXT, sort_order INTEGER
);
CREATE TABLE IF NOT EXISTS lk_location_status (
  id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, label TEXT, sort_order INTEGER
);
CREATE TABLE IF NOT EXISTS lk_location_season (
  id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, label TEXT, sort_order INTEGER
);
CREATE TABLE IF NOT EXISTS lk_activity_category (
  id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, label TEXT, sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS location (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL UNIQUE,
  category_id INTEGER REFERENCES lk_location_category(id),
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat REAL,
  lng REAL,
  status_id INTEGER REFERENCES lk_location_status(id),
  notes TEXT,
  source TEXT,                                          -- app-only: provenance
  source_key TEXT,                                      -- app-only: importer dedup
  created_at TEXT NOT NULL DEFAULT (datetime('now')),   -- app-only
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))    -- app-only
);

CREATE TABLE IF NOT EXISTS location_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES location(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  activity_category_id INTEGER REFERENCES lk_activity_category(id),
  description TEXT,
  cost_estimate NUMERIC,
  duration_min INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS location_activity_history (
  id INTEGER PRIMARY KEY,
  location_activity_id INTEGER NOT NULL REFERENCES location_activity(id) ON DELETE CASCADE,
  visited_on TEXT NOT NULL,
  with_whom TEXT,
  cost_actual NUMERIC,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS location_activity_history_rating (
  id INTEGER PRIMARY KEY,
  location_activity_history_id INTEGER NOT NULL REFERENCES location_activity_history(id) ON DELETE CASCADE,
  rating INTEGER,          -- app validates 1-5 in code (hub column unconstrained)
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS location_drive_time (
  id INTEGER PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES location(id) ON DELETE CASCADE,
  from_label TEXT,
  from_address TEXT,
  drive_minutes INTEGER,
  distance_miles REAL,
  drive_bucket TEXT,
  computed_on TEXT,
  UNIQUE (location_id, from_label)
);

CREATE TABLE IF NOT EXISTS location_season (
  id INTEGER PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES location(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES lk_location_season(id),
  UNIQUE (location_id, season_id)
);

-- indexes (live-app read paths + importer dedup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_location_source_key ON location(source_key) WHERE source_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_location_category ON location(category_id);
CREATE INDEX IF NOT EXISTS idx_location_status   ON location(status_id);
CREATE INDEX IF NOT EXISTS idx_la_location       ON location_activity(location_id);
CREATE INDEX IF NOT EXISTS idx_lah_la            ON location_activity_history(location_activity_id);
CREATE INDEX IF NOT EXISTS idx_lahr_lah          ON location_activity_history_rating(location_activity_history_id);
CREATE INDEX IF NOT EXISTS idx_ldt_location      ON location_drive_time(location_id);
CREATE INDEX IF NOT EXISTS idx_lseason_location  ON location_season(location_id);

-- updated_at maintenance (SQLite has no auto-update)
CREATE TRIGGER IF NOT EXISTS trg_location_updated
AFTER UPDATE ON location FOR EACH ROW BEGIN
  UPDATE location SET updated_at = datetime('now') WHERE id = NEW.id;
END;
CREATE TRIGGER IF NOT EXISTS trg_location_activity_updated
AFTER UPDATE ON location_activity FOR EACH ROW BEGIN
  UPDATE location_activity SET updated_at = datetime('now') WHERE id = NEW.id;
END;
`;

// ---- lookup seeds (idempotent; codes + ids MUST match the hub) ------------
const PLACES_SEED_SQL = `
INSERT OR IGNORE INTO lk_location_category (id, code, label, sort_order) VALUES
  (1,'restaurant','Restaurant',1),(2,'hike-nature','Hike & Nature',2),(3,'park','Park',3),
  (4,'museum','Museum',4),(5,'entertainment','Entertainment',5),(6,'shopping','Shopping',6),
  (7,'service','Service',7),(8,'lake','Lake & Beach',8),(9,'other','Other',9);
INSERT OR IGNORE INTO lk_location_status (id, code, label, sort_order) VALUES
  (1,'want-to-go','Want to go',1),(2,'been','Been',2),(3,'favorite','Favorite',3),(4,'avoid','Avoid',4);
INSERT OR IGNORE INTO lk_location_season (id, code, label, sort_order) VALUES
  (1,'spring','Spring',1),(2,'summer','Summer',2),(3,'fall','Fall',3),(4,'winter','Winter',4),(5,'any','Any',5);
INSERT OR IGNORE INTO lk_activity_category (id, code, label, sort_order) VALUES
  (1,'dining','Dining',1),(2,'hiking','Hiking',2),(3,'playground','Playground',3),(4,'tour','Tour',4),
  (5,'class','Class',5),(6,'event','Event',6),(7,'swimming','Swimming',7),(8,'arts-crafts','Arts & crafts',8),
  (9,'day-trip','Day trip',9),(10,'indoor','Indoor / rainy-day',10),(11,'seasonal','Seasonal event',11),
  (12,'sightseeing','Sightseeing',12),(13,'other','Other',13);
`;

// Guarded additive migrations for the legacy table. No migrations framework
// (see README), so these inspect the table before ALTERing.
function applyMigrations(db) {
  const cols = db.prepare('PRAGMA table_info(activities)').all().map((c) => c.name);
  if (!cols.includes('source')) db.exec('ALTER TABLE activities ADD COLUMN source TEXT');
  if (!cols.includes('source_key')) db.exec('ALTER TABLE activities ADD COLUMN source_key TEXT');
  db.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_source_key ON activities(source_key) WHERE source_key IS NOT NULL'
  );
}

// Full bootstrap: settings + schema (legacy + places) + lookup seeds + guarded
// migrations. Idempotent — safe on every boot.
function applySchema(db) {
  applyPragmas(db);
  db.exec(SCHEMA_SQL);
  db.exec(PLACES_SQL);
  db.exec(PLACES_SEED_SQL);
  applyMigrations(db);
}

module.exports = { applySchema, applyPragmas, applyMigrations, SCHEMA_SQL, PLACES_SQL, PLACES_SEED_SQL };
