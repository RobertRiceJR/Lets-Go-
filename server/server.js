const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// CORS: open in dev; restrict to Railway public domain in production
const corsOrigin = isProd
  ? process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : false
  : '*';
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Health check — Railway uses this to confirm the app is alive
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/api/activities', require('./routes/activities'));

// Serve built React app in production
if (isProd) {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT} [${isProd ? 'production' : 'development'}]`);
});
