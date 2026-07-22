import { z } from 'zod';
import { apiRequest } from './api.js';
import { LOCATION_CATEGORIES, LOCATION_STATUSES, SEASONS, ACTIVITY_CATEGORIES, DRIVE_BUCKETS } from './constants.js';

// ---- helpers --------------------------------------------------------------
const ok = (text) => ({ content: [{ type: 'text', text }] });
const fail = (e) => ({ isError: true, content: [{ type: 'text', text: `Error: ${e && e.message ? e.message : String(e)}` }] });
const json = (obj) => JSON.stringify(obj, null, 2);
const homeBucket = (p) => (p.drive_times || []).find((d) => d.from === 'Home')?.bucket;
const placeLine = (p) =>
  `#${p.id} ${p.title} [${p.category || '—'}/${p.status || '—'}]` +
  (p.city ? ` — ${p.city}${p.state ? ', ' + p.state : ''}` : '') +
  (homeBucket(p) ? ` — Home: ${homeBucket(p)}` : '') +
  (p.seasons?.length ? ` — ${p.seasons.join('/')}` : '') +
  ` — do: ${(p.activities || []).map((a) => a.title).join(', ') || 'none yet'}`;

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };

export function registerTools(server) {
  // -- search_locations -----------------------------------------------------
  server.registerTool('lets_go_search_locations', {
    title: 'Search saved places',
    description:
`Search the family's saved places ("Let's Go!"). All filters optional; they combine with AND.

Args:
- search (string, optional): case-insensitive substring match on the place title.
- status (optional): one of ${LOCATION_STATUSES.join(', ')}.
- season (optional): one of ${SEASONS.join(', ')} — places tagged with that season.

Returns one line per place: id, title, category/status, city, Home drive-time bucket, seasons, and the things to do there. Read-only. Use lets_go_get_location for full detail (visits, ratings).`,
    inputSchema: {
      search: z.string().max(100).optional().describe('title contains this'),
      status: z.enum(LOCATION_STATUSES).optional(),
      season: z.enum(SEASONS).optional(),
    },
    annotations: RO,
  }, async ({ search, status, season }) => {
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (status) qs.set('status', status);
      if (season) qs.set('season', season);
      const places = await apiRequest('/api/places' + (qs.toString() ? `?${qs}` : ''));
      if (!places.length) return ok('No matching places.');
      return ok(`${places.length} place(s):\n` + places.map(placeLine).join('\n'));
    } catch (e) { return fail(e); }
  });

  // -- get_location ---------------------------------------------------------
  server.registerTool('lets_go_get_location', {
    title: 'Get a place (full detail)',
    description:
`Get one saved place by id, fully nested: location fields, seasons, drive times, and every activity with its visit history and ratings. Read-only. Returns JSON.

Args:
- id (number): the location id (from lets_go_search_locations).`,
    inputSchema: { id: z.number().int().positive().describe('location id') },
    annotations: RO,
  }, async ({ id }) => {
    try {
      const place = await apiRequest(`/api/places/${id}`);
      return ok(json(place));
    } catch (e) {
      if (e.status === 404) return fail(new Error(`no place with id ${id}. Use lets_go_search_locations to find the right id.`));
      return fail(e);
    }
  });

  // -- pick_for_me ----------------------------------------------------------
  server.registerTool('lets_go_pick_for_me', {
    title: 'Pick a place to go',
    description:
`Pick ONE place at random from the "want to go" list, optionally narrowed by season, drive time, or category — for "what should we do this weekend?".

Args (all optional):
- season: one of ${SEASONS.join(', ')} (matches that season or places tagged 'any').
- drive_time: one of ${DRIVE_BUCKETS.map((b) => `'${b}'`).join(', ')} (drive-time bucket from Home).
- category: one of ${LOCATION_CATEGORIES.join(', ')}.

Read-only. Returns the chosen place, or a message if nothing matches.`,
    inputSchema: {
      season: z.enum(SEASONS).optional(),
      drive_time: z.enum(DRIVE_BUCKETS).optional(),
      category: z.enum(LOCATION_CATEGORIES).optional(),
    },
    annotations: { ...RO, idempotentHint: false },
  }, async ({ season, drive_time, category }) => {
    try {
      let places = await apiRequest('/api/places?status=want-to-go');
      if (season) places = places.filter((p) => !p.seasons?.length || p.seasons.includes(season) || p.seasons.includes('any'));
      if (drive_time) places = places.filter((p) => homeBucket(p) === drive_time);
      if (category) places = places.filter((p) => p.category === category);
      if (!places.length) return ok('No "want to go" places match those filters. Try loosening them or add places with lets_go_create_location.');
      const pick = places[Math.floor(Math.random() * places.length)];
      return ok(`Let's go to: ${placeLine(pick)}\n\n${json(pick)}`);
    } catch (e) { return fail(e); }
  });

  // -- list_options ---------------------------------------------------------
  server.registerTool('lets_go_list_options', {
    title: 'List valid codes',
    description: 'List the valid codes for categories, statuses, seasons, activity categories, and drive-time buckets used by the other tools. Read-only. Call this if unsure which code to pass.',
    inputSchema: {},
    annotations: RO,
  }, async () => ok(json({
    location_categories: LOCATION_CATEGORIES,
    location_statuses: LOCATION_STATUSES,
    seasons: SEASONS,
    activity_categories: ACTIVITY_CATEGORIES,
    drive_time_buckets: DRIVE_BUCKETS,
  })));

  // -- create_location ------------------------------------------------------
  server.registerTool('lets_go_create_location', {
    title: 'Add a place',
    description:
`Add a new place to the family's list. Only 'title' is required. Optionally give it a first activity and an approximate drive time from Home.

Args:
- title (string, required): the place name (must be unique).
- category (optional): one of ${LOCATION_CATEGORIES.join(', ')}.
- status (optional): one of ${LOCATION_STATUSES.join(', ')} (default 'want-to-go').
- city, state, address, zip (strings, optional); lat, lng (numbers, optional).
- notes (string, optional).
- seasons (array, optional): any of ${SEASONS.join(', ')}.
- home_drive_time (optional): one of ${DRIVE_BUCKETS.map((b) => `'${b}'`).join(', ')} — approx drive from Home.
- activity_title (string, optional) + activity_category (optional, one of ${ACTIVITY_CATEGORIES.join(', ')}): a first thing to do there.

Returns the created place (JSON). Fails with 409 if the title already exists.`,
    inputSchema: {
      title: z.string().min(1).max(200),
      category: z.enum(LOCATION_CATEGORIES).optional(),
      status: z.enum(LOCATION_STATUSES).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(50).optional(),
      address: z.string().max(200).optional(),
      zip: z.string().max(20).optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      notes: z.string().max(2000).optional(),
      seasons: z.array(z.enum(SEASONS)).optional(),
      home_drive_time: z.enum(DRIVE_BUCKETS).optional(),
      activity_title: z.string().max(200).optional(),
      activity_category: z.enum(ACTIVITY_CATEGORIES).optional(),
    },
    annotations: WRITE,
  }, async (a) => {
    try {
      const body = {
        title: a.title, category: a.category, status: a.status,
        city: a.city, state: a.state, address: a.address, zip: a.zip, lat: a.lat, lng: a.lng, notes: a.notes,
        seasons: a.seasons,
        drive_times: a.home_drive_time ? [{ from: 'Home', bucket: a.home_drive_time }] : undefined,
        activities: a.activity_title ? [{ title: a.activity_title, category: a.activity_category }] : undefined,
      };
      const place = await apiRequest('/api/places', { method: 'POST', body, auth: true });
      return ok(`Added.\n${json(place)}`);
    } catch (e) { return fail(e); }
  });

  // -- add_activity ---------------------------------------------------------
  server.registerTool('lets_go_add_activity', {
    title: 'Add an activity to a place',
    description:
`Add a thing-to-do to an existing place.

Args:
- location_id (number, required).
- title (string, required): e.g. "Walk the bluff trail".
- category (optional): one of ${ACTIVITY_CATEGORIES.join(', ')}.
- description (string, optional); cost_estimate (number, optional); duration_min (number, optional).

Returns the updated place (JSON).`,
    inputSchema: {
      location_id: z.number().int().positive(),
      title: z.string().min(1).max(200),
      category: z.enum(ACTIVITY_CATEGORIES).optional(),
      description: z.string().max(2000).optional(),
      cost_estimate: z.number().optional(),
      duration_min: z.number().int().optional(),
    },
    annotations: WRITE,
  }, async (a) => {
    try {
      const place = await apiRequest(`/api/places/${a.location_id}/activities`, {
        method: 'POST', auth: true,
        body: { title: a.title, category: a.category, description: a.description, cost_estimate: a.cost_estimate, duration_min: a.duration_min },
      });
      return ok(`Added activity.\n${json(place)}`);
    } catch (e) { return fail(e); }
  });

  // -- log_visit ------------------------------------------------------------
  server.registerTool('lets_go_log_visit', {
    title: 'Log a visit',
    description:
`Record that the family did an activity at a place (a visit), optionally with a rating.

Args:
- location_id (number, required); activity_id (number, required).
- date (string, optional): YYYY-MM-DD, defaults to today.
- with (string, optional): who went.
- cost (number, optional); note (string, optional): about the visit.
- rating (number 1-5, optional) + rating_notes (string, optional): a rating for this visit.

Returns the updated place (JSON).`,
    inputSchema: {
      location_id: z.number().int().positive(),
      activity_id: z.number().int().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD').optional(),
      with: z.string().max(200).optional(),
      cost: z.number().optional(),
      note: z.string().max(2000).optional(),
      rating: z.number().int().min(1).max(5).optional(),
      rating_notes: z.string().max(2000).optional(),
    },
    annotations: WRITE,
  }, async (a) => {
    try {
      const place = await apiRequest(`/api/places/${a.location_id}/activities/${a.activity_id}/visits`, {
        method: 'POST', auth: true,
        body: { date: a.date, with: a.with, cost: a.cost, note: a.note, rating: a.rating, notes: a.rating_notes },
      });
      return ok(`Logged visit.\n${json(place)}`);
    } catch (e) { return fail(e); }
  });

  // -- add_rating -----------------------------------------------------------
  server.registerTool('lets_go_add_rating', {
    title: 'Rate a visit',
    description:
`Add a rating (1-5) to an existing visit — e.g. a second family member rating the same outing.

Args:
- location_id (number, required); activity_id (number, required); visit_id (number, required).
- rating (number 1-5, required); notes (string, optional).

Returns the updated place (JSON).`,
    inputSchema: {
      location_id: z.number().int().positive(),
      activity_id: z.number().int().positive(),
      visit_id: z.number().int().positive(),
      rating: z.number().int().min(1).max(5),
      notes: z.string().max(2000).optional(),
    },
    annotations: WRITE,
  }, async (a) => {
    try {
      const place = await apiRequest(`/api/places/${a.location_id}/activities/${a.activity_id}/visits/${a.visit_id}/ratings`, {
        method: 'POST', auth: true, body: { rating: a.rating, notes: a.notes },
      });
      return ok(`Rated.\n${json(place)}`);
    } catch (e) { return fail(e); }
  });

  // -- set_status -----------------------------------------------------------
  server.registerTool('lets_go_set_status', {
    title: 'Set a place status',
    description:
`Set a place's status: ${LOCATION_STATUSES.join(', ')} (e.g. mark it a 'favorite', or 'been').

Args:
- location_id (number, required).
- status (required): one of ${LOCATION_STATUSES.join(', ')}.

Returns the updated place (JSON).`,
    inputSchema: {
      location_id: z.number().int().positive(),
      status: z.enum(LOCATION_STATUSES),
    },
    annotations: { ...WRITE, idempotentHint: true },
  }, async ({ location_id, status }) => {
    try {
      const place = await apiRequest(`/api/places/${location_id}`, { method: 'PATCH', auth: true, body: { status } });
      return ok(`Status set to ${status}.\n${json(place)}`);
    } catch (e) { return fail(e); }
  });
}
