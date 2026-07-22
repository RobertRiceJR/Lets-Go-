// Single source of truth for the activity enums shared across the UI.
// The server stores these as free-text columns, so these values must match
// what routes/activities.js and seedData.js write (see CLAUDE.md).

// Canonical category → emoji map. Key insertion order defines display order.
export const CATEGORY_EMOJIS = {
  'Arts & Crafts': '🎨',
  'Day Trips': '🚗',
  'Lakes & Swimming': '🏊',
  'Hikes & Nature': '🌿',
  'Rainy Day': '☔',
  'Food & Restaurants': '🍕',
  Seasonal: '🍂',
  'Local Gems': '💎',
};

export const CATEGORIES = Object.keys(CATEGORY_EMOJIS);

export const STATUSES = ['want to do', 'done'];

export const DRIVE_TIMES = ['under 30 min', '30-60 min', '1-2 hours', '2+ hours'];

// Badge colors keyed by drive-time value.
export const DRIVE_BADGE = {
  'under 30 min': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  '30-60 min': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  '1-2 hours': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  '2+ hours': 'bg-red-500/15 text-red-400 border-red-500/20',
};

// 'Any' is a real, assignable season value (activity works in any season),
// not the same as an unset filter (empty string).
export const SEASON_ANY = 'Any';

// The four concrete seasons, in calendar order.
export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];

// Assignable season values for the add/edit form — 'Any' leads as the default.
export const SEASON_OPTIONS = [SEASON_ANY, ...SEASONS];

export const SEASON_ICONS = {
  [SEASON_ANY]: '🌈',
  Spring: '🌸',
  Summer: '☀️',
  Fall: '🍂',
  Winter: '❄️',
};
