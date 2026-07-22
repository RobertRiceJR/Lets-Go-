# Vault place-note frontmatter contract — v1

**Status:** draft (Phase 0). **The linchpin of the two-repo architecture.**

A "place" captured in the hosted "Let's Go!" app must round-trip into the local Life DB hub. It does so as **one Obsidian markdown note** in the vault (proposed folder `5_Year_Plan/vault/07-Places/`), with the YAML frontmatter defined here. Three components read/write exactly this shape:

1. **Hosted app export** — `GET /api/export/places` (Repo B, Phase 3) emits notes in this shape.
2. **Local pull script** (Phase 7) writes/updates the vault notes.
3. **Hub ingest** — `build_life_db.py` places loader (Repo A, Phase 7) projects notes → the `places` tables.

The vault note is the **source of truth**; `life.db` is a rebuildable projection (its `source_path` = the note's path). Codes below must match the hub's `lk_*` seeds in `5_Year_Plan/db/build_schema.py` (extended in Phase 1 to cover the app's domain).

## Canonical example

`5_Year_Plan/vault/07-Places/Morton-Arboretum.md`

```yaml
---
type: place
title: Morton Arboretum          # location.title — NATURAL KEY (unique, stable; renaming = new place)
category: hike-nature            # lk_location_category code
status: been                     # lk_location_status: want-to-go | been | favorite | avoid
address: 4100 IL-53
city: Lisle
state: IL
zip: "60532"                     # quote to preserve leading zeros
lat: 41.8156
lng: -88.0709                    # hub uses `lng` (not `lon`)
seasons: [spring, summer, fall]  # lk_location_season codes — M:N (0..n)
drive_times:                     # location_drive_time rows (one per origin)
  - from: Home                   # from_label
    minutes: 35                  # drive_minutes (nullable)
    miles: 22.4                  # distance_miles (nullable)
    bucket: 30-60 min            # drive_bucket (added to the hub in Phase 1)
activities:                      # location_activity rows — 1:N (owned by this location)
  - title: Walk the main trail loop
    category: hiking             # lk_activity_category code
    description: ~9 mi of paved + dirt trails
    cost_estimate: 0             # NUMERIC (nullable)
    duration_min: 120
    visits:                      # location_activity_history rows (0..n)
      - date: 2024-05-12         # visited_on (ISO-8601)
        with: family             # with_whom
        cost: 0                  # cost_actual
        note: Kids loved the children's garden
        ratings:                 # location_activity_history_rating rows (0..n per visit)
          - rating: 4            # INTEGER 1–5 (app-validated; hub column unconstrained)
            notes: Go early to beat the crowds
notes: Amazing tree collection.  # location.notes
source: lets-go                  # provenance: which app captured this
source_key: lets-go:42           # stable app id — the pull script dedups on this
contract_version: 1
---

Optional free-form body: trip notes, links, photos.
```

## Field → hub mapping

| Frontmatter | Hub table.column | Notes |
|---|---|---|
| `title` | `location.title` | natural key (UNIQUE) |
| `category` | `location.category_id` → `lk_location_category.code` | single |
| `status` | `location.status_id` → `lk_location_status.code` | single |
| `address`/`city`/`state`/`zip` | `location.address`/`city`/`state`/`zip` | |
| `lat`/`lng` | `location.lat`/`location.lng` | note: **`lng`** |
| `seasons[]` | `location_season` (M:N) → `lk_location_season.code` | |
| `drive_times[]` | `location_drive_time` rows | `from`→`from_label`, `minutes`/`miles`/`bucket` |
| `activities[]` | `location_activity` (1:N) | each owns its `visits[]` |
| `activities[].category` | `location_activity.activity_category_id` → `lk_activity_category.code` | |
| `activities[].visits[]` | `location_activity_history` | `date`→`visited_on`, `with`→`with_whom`, `cost`→`cost_actual` |
| `…visits[].ratings[]` | `location_activity_history_rating` | `rating`, `notes` (0..n per visit; hub has no `rater` column — attribution would need a deliberate hub change) |
| `notes` | `location.notes` | |
| (note file path) | `location.source_path` | set by the hub loader |
| `source`/`source_key` | app-local provenance | not projected to hub tables; drives pull-script dedup |

## Rules

- **snake_case codes**, matching the hub `lk_*` seeds exactly; unknown codes fall back to `other` on ingest (and are logged), never dropped.
- **Dates** ISO-8601 (`YYYY-MM-DD`) as strings.
- **Idempotent** on `title` (hub) and `source_key` (pull script) — re-running never duplicates; children (activities/visits/ratings) are re-synced per parent.
- **Ratings** are 1–5, enforced in app code; the hub column stays a plain INTEGER (consistent with recipe/book ratings).
- **`contract_version`** is bumped when this shape changes; export + pull script + hub loader check it.

## Open (resolve before Phase 3/7)

- Confirm the vault folder (`07-Places/` vs elsewhere) and filename rule (slug of `title`).
- Whether `drive_times[].bucket` is stored or derived from `minutes` at read time (leaning: store, since legacy rows have a bucket but no minutes).
