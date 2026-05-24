# 🗺️ Let's Go!

> *"What should we do this weekend?"* — solved in one glance.

A beautifully designed family activity tracker and bucket list. Add adventures, drag them to "Done" when you've completed them, and let the app randomly pick one when inspiration runs dry.

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)
![Railway](https://img.shields.io/badge/Deploy-Railway-0B0D0E?logo=railway&logoColor=white)

---

## Features

- **Dashboard** — live stats, category progress bars, and "Pick Something For Me!" button
- **List view** — search and filter by category, drive time, season, or status
- **Kanban board** — drag activities between "Want to Do" and "Done" columns
- **Quick Add** — floating + button, visual category/drive/season pickers
- **Pick for Me** — shuffle animation with optional drive time and season filters
- **Confetti burst** 🎉 fires when you mark an activity as done
- **Star ratings** (1–3 ⭐) on completed activities
- Dark navy/amber design, smooth animations, fully mobile-responsive

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 |
| Backend | Express.js 4 |
| Database | SQLite via better-sqlite3 (v11+) |
| Drag & Drop | @hello-pangea/dnd |
| Confetti | canvas-confetti |
| Icons | lucide-react |
| Dev runner | concurrently |
| Hosting | Railway |

---

## Local Development

### Prerequisites

- Node.js 18+ (tested on 22)
- npm 9+

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/lets-go.git
cd lets-go

# 2. Install all dependencies
npm install
npm install --prefix server
npm install --prefix client

# 3. Start both servers (client :5173, server :3001)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The app seeds 15 Chicago-area activities automatically on first run.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client (port 5173) + server (port 3001) concurrently |
| `npm run build` | Build the Vite client to `client/dist/` |
| `npm start` | Start Express in production mode (serves built client) |
| `npm run db:seed` | Wipe and re-populate the DB with default seed data |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values for local development.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Port Express listens on. Railway sets this automatically. |
| `NODE_ENV` | `development` | Set to `production` on Railway (Railway sets this automatically). |
| `DB_PATH` | `server/data/db.sqlite` | Absolute path to the SQLite file. On Railway, set to `/data/db.sqlite`. |
| `RAILWAY_PUBLIC_DOMAIN` | — | Your Railway domain (no `https://`). Used to restrict CORS in production. |

---

## Project Structure

```
lets-go/
├── .github/
│   └── workflows/
│       └── deploy.yml        # CI: install + build + health check
├── client/                   # Vite + React frontend (port 5173 in dev)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ActivityCard.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   ├── KanbanView.jsx
│   │   │   ├── ListView.jsx
│   │   │   ├── Navigation.jsx
│   │   │   ├── PickForMeModal.jsx
│   │   │   └── QuickAddModal.jsx
│   │   ├── lib/api.js         # fetch wrappers for all API endpoints
│   │   └── index.css          # Tailwind base + custom utilities
│   ├── tailwind.config.js
│   └── vite.config.js         # proxies /api → :3001 in dev
├── server/                    # Express backend (port 3001)
│   ├── routes/
│   │   └── activities.js      # GET/POST/PATCH/DELETE with filter support
│   ├── db.js                  # SQLite init + auto-seed on empty DB
│   ├── seed.js                # Manual seed script (wipes + re-populates)
│   ├── seedData.js            # The 15 default activities
│   └── server.js              # Express app, CORS, health check, static serve
├── .env.example
├── .gitignore
├── package.json               # Root: dev/build/start/db:seed scripts
├── Procfile                   # Fallback for Railway: web: npm start
└── railway.toml               # Railway build + deploy + health check config
```

---

## Deploying to Railway

### Step 1 — Push to GitHub

```bash
# Inside the project root
git init
git add .
git commit -m "Initial commit — Let's Go! family activity tracker"

# Create a new repo on GitHub (github.com/new), then:
git remote add origin https://github.com/YOUR_USERNAME/lets-go.git
git branch -M main
git push -u origin main
```

### Step 2 — Create a Railway Project

1. Go to [railway.app](https://railway.app) and sign in.
2. Click **New Project → Deploy from GitHub repo**.
3. Authorize Railway to access your GitHub account if prompted.
4. Select the **lets-go** repository.
5. Railway will detect the `railway.toml` and start the first build automatically.

### Step 3 — Set Environment Variables

In your Railway project, go to **your service → Variables** and add:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DB_PATH` | `/data/db.sqlite` |
| `RAILWAY_PUBLIC_DOMAIN` | *(fill in after Step 5 below)* |

> Railway automatically sets `PORT`. You do **not** need to add it.

### Step 4 — Add a Persistent Volume for SQLite

SQLite writes to disk. Without a persistent volume, the database resets on every deploy.

1. In your Railway project, click **New → Volume**.
2. Name it `lets-go-data` (or anything you like).
3. Set **Mount Path** to `/data`.
4. Click **Create**.
5. Railway will redeploy with the volume attached.

Your `DB_PATH=/data/db.sqlite` variable now points to this persistent volume.

### Step 5 — Get Your Public URL

1. In Railway, go to **your service → Settings → Networking**.
2. Click **Generate Domain** (or use a custom domain).
3. Copy the domain, e.g., `lets-go-production.up.railway.app`.
4. Go back to **Variables** and set `RAILWAY_PUBLIC_DOMAIN` to that domain (no `https://`).
5. Railway will redeploy one more time to pick up the new variable.

### Step 6 — Seed the Database

The app auto-seeds on first start if the table is empty, so this usually happens automatically. If you ever need to reset to defaults:

**Option A — via Railway CLI:**
```bash
# Install the Railway CLI (one time)
npm install -g @railway/cli
railway login
railway link   # connect to your project

# Run the seed script in your Railway environment
railway run node server/seed.js
```

**Option B — via Railway Console:**
1. Go to your service in Railway.
2. Click the **Console** tab (looks like a terminal icon).
3. Run: `node server/seed.js`

> ⚠️ This deletes all existing activities and replaces them with the 15 defaults. Don't run it unless you want to reset.

### Step 7 — Verify Everything Works

1. Open your Railway URL (e.g., `https://lets-go-production.up.railway.app`).
2. You should see the Let's Go! dashboard with 15 seed activities.
3. Verify the health endpoint: `https://YOUR_DOMAIN/api/health` should return `{"status":"ok",...}`.
4. Share the URL with your wife. Bookmark it on her phone's home screen!

---

## How Auto-Deploy Works

```
You push to main
       ↓
GitHub Actions runs (.github/workflows/deploy.yml)
  → installs deps
  → builds Vite client
  → starts server + hits /api/health
  → if any step fails, the workflow turns red (deploy blocked)
       ↓
Railway detects the push (GitHub integration)
  → runs the build command from railway.toml
  → starts the server with npm start
  → hits /api/health to confirm successful boot
  → swaps traffic to the new deployment
```

If the GitHub Actions workflow goes red, fix the issue before pushing again — Railway won't get a broken build.

---

## Tips

- **Adding activities on the go**: The app is mobile-optimized. Add it to your phone's home screen via "Add to Home Screen" in Safari/Chrome for an app-like experience.
- **Drag & drop**: On the Kanban board, drag any card from "Want to Do" to "Done" to mark it complete (confetti included 🎉).
- **Pick for Me**: On the Dashboard, tap "Pick Something For Me!" and optionally filter by drive time or season to get a random suggestion.
- **SQLite vs Postgres**: SQLite is intentional here. It's simple, fast, needs no external database service, and works perfectly for a single-family app. The persistent volume on Railway handles durability.

---

## Self-Hosted Setup (PM2 + Cloudflare Tunnel)

Run the app on your own machine or a spare PC instead of (or alongside) Railway.

### Architecture

```
[Wife's Phone]  ──→  [Cloudflare Tunnel]  ──→  [Spare PC: PM2 + Express]  ──→  [SQLite]
[Your Laptop]   ──→  [Local Network]      ──→  [Spare PC: PM2 + Express]  ──→  [SQLite]
```

- **Cloudflare Tunnel** gives the app a public HTTPS URL with no port-forwarding or router config
- **PM2** keeps Express running in the background and restarts it on crash or reboot
- **SQLite** stores everything locally — no external database needed

### Quick Start (this machine)

**1. Install PM2 globally (one-time):**
```bash
npm install -g pm2
```

**2. Build and start:**
```bash
# Mac/Linux:
chmod +x scripts/launch.sh && ./scripts/launch.sh

# Windows:
.\scripts\launch.bat
```

The script installs deps, builds the client, starts PM2, and saves the process list.

**3. Verify:**
- App: http://localhost:3001
- Status page: http://localhost:3001/status
- Health check: http://localhost:3001/api/health

### PM2 Commands

| Command | What it does |
|---------|-------------|
| `npm run pm2:start` | Start the app under PM2 |
| `npm run pm2:stop` | Stop the app |
| `npm run pm2:restart` | Restart after a code change |
| `npm run pm2:logs` | Tail live logs |
| `npm run pm2:status` | Show process table (CPU, memory, uptime) |
| `pm2 monit` | Live CPU/memory dashboard in terminal |

**Make PM2 survive reboots** (run once):
```bash
pm2 startup    # prints a command — copy and run it
pm2 save       # saves the current process list
```

### Expose Publicly via Cloudflare Tunnel

**Quickest option — no account or domain needed:**
```bash
# Install cloudflared first (see cloudflared/setup.md)
cloudflared tunnel --url http://localhost:3001
```
Prints a public URL like `https://abc123.trycloudflare.com` — share it instantly. The URL changes each time you restart the tunnel.

**For a permanent URL** with your own domain, follow the full guide in [cloudflared/setup.md](cloudflared/setup.md).

### Updating the App

```bash
git pull
npm run build
npm run pm2:restart
```

### When to Use Which

| Situation | Use |
|-----------|-----|
| Just testing locally | `npm run dev` |
| Sharing with wife temporarily | Cloudflare quick tunnel |
| Permanent family URL | Named Cloudflare tunnel + custom domain |
| 24/7 on a spare PC | PM2 + Cloudflare tunnel service |
| No machine to spare | Railway (cloud) |

### Moving to a Spare PC

See [SPARE_PC_SETUP.md](SPARE_PC_SETUP.md) for the full step-by-step guide including database transfer, startup config for both Windows and Mac, and the one-writer rule for SQLite.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| Port 3001 in use | `npm run pm2:stop` then check for leftover node processes |
| App crashes on start | `npm run pm2:logs` — look for the error |
| Blank screen in browser | Did you run `npm run build` before `pm2:start`? |
| Tunnel URL not working | Make sure `npm run pm2:status` shows the app as **online** first |
| DB is empty after restart | Check `DB_PATH` in `ecosystem.config.js` points to the right file |
