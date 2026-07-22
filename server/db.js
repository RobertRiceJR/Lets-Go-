const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { applySchema } = require('./db/schema');

// In production (Railway), set DB_PATH to /data/db.sqlite via environment variable.
// The /data directory must be a mounted persistent volume on Railway.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'db.sqlite');

// Ensure the directory for the DB file exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Connection settings + schema + guarded migrations. Single source of truth: ./db/schema.js
applySchema(db);

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
