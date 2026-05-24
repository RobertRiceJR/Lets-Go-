# Spare PC Setup Guide

Complete instructions to mirror Let's Go! onto a second machine so it runs 24/7 without keeping your main laptop on.

---

## Prerequisites

Install these on the spare PC before anything else.

### 1. Node.js LTS

Download from https://nodejs.org — click the **LTS** button (not "Current").

Verify installation:
```bash
node --version    # should be 18.x or higher
npm --version     # should be 9.x or higher
```

### 2. Git

**Windows:** https://git-scm.com/download/win — use all defaults during install.

**Mac:** Run `git --version` in Terminal — it will prompt you to install Xcode Command Line Tools if not present.

**Linux:**
```bash
sudo apt install git        # Debian/Ubuntu
sudo yum install git        # Fedora/RHEL
```

### 3. PM2 (global)

```bash
npm install -g pm2
```

Verify: `pm2 --version`

### 4. cloudflared

See [cloudflared/setup.md](cloudflared/setup.md) — follow the install instructions for your OS.

---

## Step-by-Step Setup

### Step 1 — Clone the repository

```bash
git clone https://github.com/RobertRiceJR/Lets-Go-.git
cd Lets-Go-
```

### Step 2 — Copy the SQLite database from your main machine

The database lives at `server/data/db.sqlite` on your main machine. Copy it to the same path on the spare PC.

**Option A — via the local network (recommended):**

On the spare PC, from inside the project directory:

```bash
# Mac/Linux:
scp YOUR_MAIN_MACHINE_IP:"/path/to/Lets-Go-/server/data/db.sqlite" server/data/db.sqlite

# Windows (PowerShell — scp is built into Windows 10+):
scp YOUR_MAIN_MACHINE_IP:"C:/Users/terri/Repos/Lets-Go-/server/data/db.sqlite" server\data\db.sqlite
```

Replace `YOUR_MAIN_MACHINE_IP` with your main machine's local IP (find it with `ipconfig` on Windows or `ifconfig` on Mac).

**Option B — USB drive or shared folder:**

1. On your main machine, copy `server/data/db.sqlite` to a USB drive.
2. On the spare PC, create the folder `server/data/` inside the project, then paste the file there.

**Option C — skip this step and start fresh:**

If you're fine with the spare PC starting from the default seed data, just skip the copy. The app will auto-seed 15 activities on first run.

> ⚠️ **Never run both machines simultaneously** — SQLite only supports one writer at a time. Whichever machine is your "main" server should be the only one running PM2. Shut one down before starting the other.

### Step 3 — Run the launch script

**Mac/Linux:**
```bash
chmod +x scripts/launch.sh   # one-time, makes it executable
./scripts/launch.sh
```

**Windows:**
```powershell
.\scripts\launch.bat
```

This installs dependencies, builds the client, starts PM2, and saves the process list.

### Step 4 — Verify the app is running

Open http://localhost:3001 in a browser on the spare PC. You should see the Let's Go! dashboard.

Check the status page: http://localhost:3001/status

### Step 5 — Make PM2 start on reboot

This is the step that makes the spare PC truly hands-off.

**Mac/Linux:**
```bash
pm2 startup
```
PM2 will print a command like:
```
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u youruser --hp /home/youruser
```
Copy and run that exact command, then:
```bash
pm2 save
```

**Windows:**

PM2 doesn't integrate with Windows startup natively. Use one of these:

*Option A — Windows Task Scheduler (easiest):*
1. Open Task Scheduler → Create Basic Task
2. Name: `PM2 Let's Go`
3. Trigger: **When the computer starts**
4. Action: Start a program
   - Program: `pm2`
   - Arguments: `start C:\path\to\Lets-Go-\ecosystem.config.js`
5. Check "Run whether user is logged on or not"
6. Check "Run with highest privileges"

*Option B — pm2-windows-startup (npm package):*
```powershell
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```

### Step 6 — Set up Cloudflare Tunnel

Follow [cloudflared/setup.md](cloudflared/setup.md).

For the simplest option (random URL, no account):
```bash
cloudflared tunnel --url http://localhost:3001
```

For a permanent URL with a custom domain, follow the full Option B guide.

### Step 7 — Verify everything end to end

1. **Local check:** http://localhost:3001 — app loads ✅
2. **Status page:** http://localhost:3001/status — shows uptime and DB counts ✅
3. **Health endpoint:** http://localhost:3001/api/health — returns `{"status":"ok",...}` ✅
4. **Public URL:** Open the Cloudflare URL on your wife's phone — app loads over 4G/5G ✅
5. **Add to home screen** (iPhone): Safari → Share → "Add to Home Screen"

---

## Keeping the App Up To Date

When you push new changes to GitHub, update the spare PC:

```bash
# SSH into the spare PC, or run these commands in its terminal

cd /path/to/Lets-Go-   # wherever you cloned it

git pull               # get latest code
npm run build          # rebuild the client
npm run pm2:restart    # restart the server

# Verify it came back up
npm run pm2:status
```

---

## ⚠️ The One-Writer Rule for SQLite

SQLite is a single-file database. It handles multiple simultaneous *readers* fine, but only one process can *write* at a time.

**What this means for you:**

- **One machine running at a time** is the safe operating model.
- If you ever need to switch from main laptop to spare PC: stop PM2 on the main first (`npm run pm2:stop`), then start it on the spare.
- If both accidentally run at once and someone adds an activity, the write on the second machine may fail or corrupt the database.
- The database file is in `server/data/db.sqlite` — never commit it to git (it's in `.gitignore`).

If you eventually want true multi-machine sync, the upgrade path is to switch to a hosted database (Postgres on Railway, etc.), but that's unnecessary for a single-family app.

---

## Troubleshooting

| Problem | What to check |
|---------|---------------|
| App won't start | `npm run pm2:logs` — look for errors on startup |
| DB is empty | Run `npm run db:seed` to populate defaults |
| Can't reach via tunnel | `cloudflared tunnel list` — is your tunnel active? |
| Port 3001 already in use | `npm run pm2:stop`, then check for other node processes |
| Build fails | Make sure Node.js is 18+ — run `node --version` |
| PM2 not found | `npm install -g pm2` and restart terminal |
