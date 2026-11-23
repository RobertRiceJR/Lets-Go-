# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Let's Go!" is a full-stack family activity tracker (bucket list for weekend outings). Single-family app, mobile-first, deployed on Railway. See `README.md` for the product tour and the full Railway deploy runbook.

## Commands

This repo is **three separate npm packages** (root, `client/`, `server/`), each with its own `package.json` and lockfile — it is **not** an npm workspace. A root `npm install` installs all three layers: the root `postinstall` script runs `npm install --prefix server` and `npm install --prefix client --include=dev`. This is what lets Railway build the app with no config file, so don't remove it.

```bash
npm install
```

| Command | What it does |
|---------|--------------|
| `npm run dev` | Runs server (`:3001`, nodemon) + client (`:5173`, Vite) together via `concurrently`. Develop here. |
| `npm run build` | Vite-builds the client to `client/dist/`. |
| `npm start` | Production: runs `server/server.js`, which serves the API **and** the built client on one port. |
| `npm run db:seed` | Wipes and re-seeds the DB from `server/seedData.js` (destructive). |

There is **no test runner and no linter configured** — don't go looking for one. The only automated gate is the CI health check (below).

## Architecture

### Dev vs. production serving (this trips people up)

The client always calls the API at the **relative** path `/api/...` (`client/src/lib/api.js`). How that resolves differs by mode:

- **Dev:** two processes. Vite (`:5173`) proxies `/api` → Express (`:3001`) via `client/vite.config.js`.
- **Prod:** one process. `server/server.js` serves `client/dist` statically and answers `/api` on the same port. A catch-all route sends `index.html` for client-side rendering. This block only runs when `NODE_ENV=production`.

CORS is `*` in dev but locks to `https://${RAILWAY_PUBLIC_DOMAIN}` in prod (blocks all cross-origin if that var is unset).

### Server (`server/`)

- **better-sqlite3, synchronous.** All DB calls are blocking (no `await` on queries). Route handlers in `server/routes/activities.js` are plain synchronous functions. Keep that style.
- **One table:** `activities` (schema in `server/db.js`). No migrations framework — schema is a `CREATE TABLE IF NOT EXISTS`.
- **Two seed paths, three files:** `server/seedData.js` holds the 15-activity array; `server/db.js` auto-seeds it **only when the table is empty** (runs on every boot); `server/seed.js` is the manual wipe-and-reseed behind `npm run db:seed`.
- **Status lifecycle is server-authoritative** (`PATCH /api/activities/:id`): moving to `done` stamps `date_completed = today`; moving back to `want to do` clears `date_completed` and `rating`. `KanbanView.jsx` **duplicates this same logic optimistically** on the client before the PATCH resolves — if you change the rule, change both places.
- **PATCH builds its `SET` clause from arbitrary `req.body` keys** — there's no column allow-list, so only send real column names or the SQL will throw.

### Client (`client/src/`)

- **All state lives in `App.jsx`** via `useState` — `activities` is the single source of truth, passed down with `onUpdate`/`onDelete`/`onCreate` handlers. There is no router and no global store; the three views (`dashboard`, `list`, `kanban`) are switched by a `view` string. Updates are applied optimistically to local state, then persisted through `lib/api.js`.
- **All activity enums live in `client/src/lib/constants.js`** — `CATEGORY_EMOJIS`/`CATEGORIES`, `STATUSES`, `DRIVE_TIMES` (+ `DRIVE_BADGE` colors), `SEASONS`, and the season emoji map. Add or rename a category/season/etc. here and every view updates. Note the season variants: `SEASONS` is the four concrete seasons (used by the Pick-for-Me filter); `SEASON_OPTIONS` prepends the assignable `'Any'` value for the add/edit form; `FilterBar.jsx` composes its own Any-trailing list from those two. These enums are plain strings the server stores verbatim, so they must stay in sync with what `server/routes/activities.js` and `server/seedData.js` write.
- Styling is Tailwind with custom keyframe animations defined in `client/tailwind.config.js`.

## Deploy & CI

- **GitHub Actions** (`.github/workflows/deploy.yml`) runs on push/PR to `main`: one root `npm ci`, `npm run build`, `npm start` in production mode, then asserts `/api/health` returns `{"status":"ok"}` and that the built client is served. That is Railway's default path with no config file. It's a pre-flight gate, not the deployer: Railway deploys whether or not it passes, unless "Wait for CI" is on in the service settings.
- **Railway** auto-deploys on push to `main` via GitHub integration. `railway.toml` is **deprecated by Railway and stops being read on 2026-12-01**. After that, the build is Railway's default (root install, `npm run build`, `npm start`), which works because of the root `postinstall`. The health check path (`/api/health`) and restart policy must then be set in the Railway dashboard. Don't delete `railway.toml` until the service's Config File path is cleared in Railway, or the build fails with "config file not found". `Procfile` is a fallback for the start command.
- **Prod env vars:** `NODE_ENV=production`, `DB_PATH=/data/db.sqlite`, `RAILWAY_PUBLIC_DOMAIN=<domain-without-https>`. Railway auto-sets `PORT`. SQLite needs a **persistent volume mounted at `/data`** or the DB resets each deploy.

## Constraints

- **`better-sqlite3` must stay `^11`.** This dev machine is Node 22 on Windows with no Visual Studio build tools; v9.x has no prebuilt binaries for Node 22 and would need native compilation. Don't downgrade it.
- The SQLite file and `.env` are gitignored — never commit `server/data/` or secrets. Document any new env var in `.env.example`.
