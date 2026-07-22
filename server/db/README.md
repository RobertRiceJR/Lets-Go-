# Database maintenance

The entire database shape lives in **one file: `server/db/schema.js`** — every table, index, view, trigger, and the connection PRAGMAs. `db.js`, `seed.js`, `migrate.js`, and `import.js` all import from it, so the schema is edited in exactly one place. There is **no migrations framework**; changes are `CREATE ... IF NOT EXISTS` plus guarded `ALTER TABLE` (below).

## Golden rule

Adding a column is **additive and safe** — existing rows, indexes, and views keep working untouched. Indexes and views only need changes when you want to *use* the new column *in* them.

## Add a column

1. Add it to the `CREATE TABLE` in `schema.js` (this covers brand-new databases).
2. Prod already has the table, so also add a **guarded migration** so existing DBs pick it up on boot — same pattern the `source` / `source_key` columns already use:
   ```js
   const cols = db.prepare('PRAGMA table_info(location)').all().map((c) => c.name);
   if (!cols.includes('price_level')) db.exec('ALTER TABLE location ADD COLUMN price_level TEXT');
   ```
3. New columns must be **nullable or have a DEFAULT** — SQLite can't add a `NOT NULL` column without a default to an existing table.

## When to add an INDEX

Only if you'll **filter, sort, or join on the column often**. Not queried by it → no index needed. Add `CREATE INDEX IF NOT EXISTS ...` in `schema.js`. (Unique/partial indexes also *enforce* rules — e.g. the `source_key` dedup index.)

## When to change a VIEW

A view returns only the columns its `SELECT` names — new table columns do **not** appear automatically.

- Want the column visible in a view → edit that view. SQLite can't `ALTER` a view, so **drop and recreate** it: `DROP VIEW IF EXISTS ...; CREATE VIEW ...`. Views hold no data; this is harmless.
- **Leave `vw_activities_compat` frozen on purpose.** Its whole job is to keep returning the old flat shape so the current web client never breaks. New data flows through the new endpoints, not this view.

## Triggers

The `updated_at` triggers auto-stamp rows on `UPDATE`. If you add another table that needs `updated_at`, copy the trigger pattern for it — SQLite won't do it automatically.

## Connection settings (applies to every script that opens the DB)

`foreign_keys`, `busy_timeout`, and WAL are set per-connection in `applyPragmas()`. Any new script that opens the database must call `applyPragmas()` (or `applySchema()`, which calls it) — **otherwise foreign keys are silently not enforced** and deletes won't cascade.
