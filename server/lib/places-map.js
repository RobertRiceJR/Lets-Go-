// Shared flat <-> places mapping. Used by migrate.js and the compat routes
// (forward: flat -> places). The reverse (places -> flat) lives in the
// v_activities_compat SQL view. Keep the three in sync when categories change.

// app flat category -> [location category code, activity category code]
const CATEGORY_SPLIT = {
  'Food & Restaurants': ['restaurant', 'dining'],
  'Hikes & Nature': ['hike-nature', 'hiking'],
  'Lakes & Swimming': ['lake', 'swimming'],
  'Arts & Crafts': ['entertainment', 'arts-crafts'],
  'Day Trips': ['other', 'day-trip'],
  'Rainy Day': ['entertainment', 'indoor'],
  Seasonal: ['other', 'seasonal'],
  'Local Gems': ['other', 'sightseeing'],
};
const DEFAULT_SPLIT = ['other', 'other'];
const STATUS_TO_CODE = { 'want to do': 'want-to-go', done: 'been' };
const SEASON_TO_CODE = { Any: 'any', Spring: 'spring', Summer: 'summer', Fall: 'fall', Winter: 'winter' };

const splitCategory = (flatCategory) => CATEGORY_SPLIT[flatCategory] || DEFAULT_SPLIT;

// Build code->id resolvers (+ the activity-category label map) from the lk_*
// tables for a given better-sqlite3 connection.
function makeResolvers(db) {
  const idOf = {};
  for (const t of ['lk_location_category', 'lk_location_status', 'lk_location_season', 'lk_activity_category']) {
    idOf[t] = {};
    for (const r of db.prepare(`SELECT id, code FROM ${t}`).all()) idOf[t][r.code] = r.id;
  }
  const actLabel = {};
  for (const r of db.prepare('SELECT code, label FROM lk_activity_category').all()) actLabel[r.code] = r.label;
  return {
    idOf,
    actLabel,
    locCatId: (c) => idOf.lk_location_category[c] ?? idOf.lk_location_category.other,
    actCatId: (c) => idOf.lk_activity_category[c] ?? idOf.lk_activity_category.other,
    locStatusId: (c) => idOf.lk_location_status[c] ?? idOf.lk_location_status['want-to-go'],
    seasonId: (c) => idOf.lk_location_season[c] ?? idOf.lk_location_season.any,
  };
}

module.exports = { CATEGORY_SPLIT, DEFAULT_SPLIT, STATUS_TO_CODE, SEASON_TO_CODE, splitCategory, makeResolvers };
