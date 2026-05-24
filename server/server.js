const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// CORS strategy:
//   - Railway:     set RAILWAY_PUBLIC_DOMAIN → locked to that origin
//   - Self-hosted: don't set it → open (frontend is served from same Express process)
//   - Dev:         always open
const corsOrigin = isProd && process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : '*';
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// ── Health & Status ────────────────────────────────────────────────────────────

// Minimal liveness probe — used by Railway and Cloudflare health checks
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() });
});

// Richer status — used by the /status UI page
app.get('/api/status', (_req, res) => {
  try {
    const db = require('./db');
    const total = db.prepare('SELECT COUNT(*) as count FROM activities').get();
    const done  = db.prepare("SELECT COUNT(*) as count FROM activities WHERE status = 'done'").get();
    const byCategory = db.prepare(
      'SELECT category, COUNT(*) as count FROM activities GROUP BY category ORDER BY category'
    ).all();

    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date(),
      node_version: process.version,
      db: {
        total: total.count,
        done: done.count,
        wantToDo: total.count - done.count,
        byCategory: byCategory.reduce((acc, r) => ({ ...acc, [r.category]: r.count }), {}),
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── API Routes ─────────────────────────────────────────────────────────────────

app.use('/api/activities', require('./routes/activities'));

// ── Production: serve built React app ─────────────────────────────────────────

if (isProd) {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  // Catch-all: serve index.html for any unknown path (enables /status React page)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Let's Go! running on http://localhost:${PORT} [${isProd ? 'production' : 'development'}]`);
});
