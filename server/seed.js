/**
 * Manual seed script — wipes and re-populates the activities table.
 *
 * Run after first Railway deploy (via Railway console or CLI):
 *   node server/seed.js
 * Or via npm script:
 *   npm run db:seed
 *
 * WARNING: This deletes all existing activities and replaces them with defaults.
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const seedData = require('./seedData');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'db.sqlite');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
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
  )
`);

db.prepare('DELETE FROM activities').run();

const insert = db.prepare(`
  INSERT INTO activities (title, category, status, drive_time, season, notes, date_completed, rating)
  VALUES (@title, @category, @status, @drive_time, @season, @notes, @date_completed, @rating)
`);
db.transaction((items) => { for (const item of items) insert.run(item); })(seedData);

console.log(`✅ Seeded ${seedData.length} activities into ${DB_PATH}`);
process.exit(0);
