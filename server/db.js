const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// In production (Railway), set DB_PATH to /data/db.sqlite via environment variable.
// The /data directory must be a mounted persistent volume on Railway.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'db.sqlite');

// Ensure the directory for the DB file exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

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

// Auto-seed on first run if the table is empty
const count = db.prepare('SELECT COUNT(*) as count FROM activities').get();
if (count.count === 0) {
  const seedData = require('./seedData');
  const insert = db.prepare(`
    INSERT INTO activities (title, category, status, drive_time, season, notes, date_completed, rating)
    VALUES (@title, @category, @status, @drive_time, @season, @notes, @date_completed, @rating)
  `);
  db.transaction((items) => { for (const item of items) insert.run(item); })(seedData);
  console.log(`🌱 Seeded ${seedData.length} activities into ${DB_PATH}`);
}

module.exports = db;
