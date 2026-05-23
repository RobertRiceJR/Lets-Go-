const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'db.sqlite'));

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

const count = db.prepare('SELECT COUNT(*) as count FROM activities').get();

if (count.count === 0) {
  const insert = db.prepare(`
    INSERT INTO activities (title, category, status, drive_time, season, notes, date_completed, rating)
    VALUES (@title, @category, @status, @drive_time, @season, @notes, @date_completed, @rating)
  `);

  const seed = db.transaction((items) => {
    for (const item of items) insert.run(item);
  });

  seed([
    {
      title: 'Morton Arboretum',
      category: 'Hikes & Nature',
      status: 'done',
      drive_time: '30-60 min',
      season: 'Spring',
      notes: "Amazing tree collection. The children's adventure garden is magical — go early to avoid crowds.",
      date_completed: '2024-05-12',
      rating: 3,
    },
    {
      title: 'Indiana Dunes National Park',
      category: 'Lakes & Swimming',
      status: 'want to do',
      drive_time: '1-2 hours',
      season: 'Summer',
      notes: 'Pack a full-day picnic. Mt. Baldy Trail is great for little ones. Bring water shoes.',
      date_completed: null,
      rating: null,
    },
    {
      title: 'Chicago Children\'s Museum',
      category: 'Day Trips',
      status: 'done',
      drive_time: 'under 30 min',
      season: 'Any',
      notes: 'Navy Pier location. Buy tickets online to skip the line!',
      date_completed: '2024-02-18',
      rating: 3,
    },
    {
      title: 'Kalamazoo Day Trip',
      category: 'Day Trips',
      status: 'want to do',
      drive_time: '2+ hours',
      season: 'Summer',
      notes: "Kalamazoo Nature Center + pizza at Bell's Eccentric Café (super kid-friendly!).",
      date_completed: null,
      rating: null,
    },
    {
      title: 'Lake Geneva Weekend',
      category: 'Day Trips',
      status: 'want to do',
      drive_time: '2+ hours',
      season: 'Summer',
      notes: "Rent a kayak, walk the lake path, Gordy's Lakehouse for cheese curds.",
      date_completed: null,
      rating: null,
    },
    {
      title: 'Pottery Painting at Color Me Mine',
      category: 'Arts & Crafts',
      status: 'done',
      drive_time: 'under 30 min',
      season: 'Any',
      notes: 'Perfect rainy day activity. Kids love painting their own keepsakes to take home.',
      date_completed: '2024-01-27',
      rating: 2,
    },
    {
      title: 'Centennial Beach & Splash Pad',
      category: 'Lakes & Swimming',
      status: 'done',
      drive_time: 'under 30 min',
      season: 'Summer',
      notes: "Naperville's famous quarry pool. Get there right when it opens — fills up fast!",
      date_completed: '2024-07-04',
      rating: 3,
    },
    {
      title: 'Starved Rock State Park',
      category: 'Hikes & Nature',
      status: 'want to do',
      drive_time: '2+ hours',
      season: 'Fall',
      notes: 'Canyon trails are breathtaking in fall foliage. Wear sturdy shoes and pack a lunch.',
      date_completed: null,
      rating: null,
    },
    {
      title: 'Lincoln Park Zoo',
      category: 'Day Trips',
      status: 'done',
      drive_time: 'under 30 min',
      season: 'Spring',
      notes: 'Free admission! Farm-in-the-Zoo is perfect for toddlers. Bring the stroller.',
      date_completed: '2024-04-20',
      rating: 3,
    },
    {
      title: 'Shedd Aquarium',
      category: 'Rainy Day',
      status: 'want to do',
      drive_time: 'under 30 min',
      season: 'Any',
      notes: 'Buy Chicago CityPASS for savings. Dolphin show is a must — book timed entry.',
      date_completed: null,
      rating: null,
    },
    {
      title: "Deep Dish at Lou Malnati's",
      category: 'Food & Restaurants',
      status: 'done',
      drive_time: 'under 30 min',
      season: 'Any',
      notes: 'Call ahead — deep dish takes 45 min but totally worth it. Kids love the cheese pull.',
      date_completed: '2024-03-08',
      rating: 3,
    },
    {
      title: "Goebbert's Pumpkin Patch",
      category: 'Seasonal',
      status: 'want to do',
      drive_time: '30-60 min',
      season: 'Fall',
      notes: 'South Barrington. Hay rides, pig races, corn maze — budget a full day!',
      date_completed: null,
      rating: null,
    },
    {
      title: 'Navy Pier Centennial Wheel',
      category: 'Local Gems',
      status: 'want to do',
      drive_time: 'under 30 min',
      season: 'Summer',
      notes: 'Go at sunset for magic-hour views of the skyline. Grab gelato after.',
      date_completed: null,
      rating: null,
    },
    {
      title: 'Chicago Botanic Garden',
      category: 'Hikes & Nature',
      status: 'done',
      drive_time: '30-60 min',
      season: 'Spring',
      notes: 'Glencoe. Free admission, $30 parking. Absolutely magical during spring bloom.',
      date_completed: '2024-05-05',
      rating: 3,
    },
    {
      title: 'Millennium Park & The Bean',
      category: 'Local Gems',
      status: 'done',
      drive_time: 'under 30 min',
      season: 'Any',
      notes: 'Kids love touching The Bean and seeing their reflections. Pack a picnic for the great lawn.',
      date_completed: '2024-06-15',
      rating: 2,
    },
  ]);
}

module.exports = db;
