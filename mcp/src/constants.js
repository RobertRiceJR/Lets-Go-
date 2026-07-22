// Vocabulary shared with the Let's Go! API (must match the lk_* codes seeded in
// server/db/schema.js / the 5-Year-Plan hub). Used for Zod enums + tool docs.

export const LOCATION_CATEGORIES = [
  'restaurant', 'hike-nature', 'park', 'museum', 'entertainment', 'shopping', 'service', 'lake', 'other',
];
export const LOCATION_STATUSES = ['want-to-go', 'been', 'favorite', 'avoid'];
export const SEASONS = ['spring', 'summer', 'fall', 'winter', 'any'];
export const ACTIVITY_CATEGORIES = [
  'dining', 'hiking', 'playground', 'tour', 'class', 'event',
  'swimming', 'arts-crafts', 'day-trip', 'indoor', 'seasonal', 'sightseeing', 'other',
];
export const DRIVE_BUCKETS = ['under 30 min', '30-60 min', '1-2 hours', '2+ hours'];
