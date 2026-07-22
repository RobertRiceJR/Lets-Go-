// Assembles the nested "place" graph (location + activities + visits + ratings +
// drive_times + seasons) from the places tables — the read model the places API
// and the /api/export/places sync source share. Emits lk_* CODES (not ids/labels)
// so it lines up with the vault frontmatter contract.
//
// `makePlacesReader(db)` -> { getPlace(id), listPlaces(filters) } with DB ids.
// `toContract(place)`    -> the frontmatter-contract shape (ids dropped).

const CONTRACT_VERSION = 1;

function makePlacesReader(db) {
  const locBase = `
    SELECT l.id, l.title, lc.code AS category, ls.code AS status,
           l.address, l.city, l.state, l.zip, l.lat, l.lng,
           l.notes, l.source, l.source_key
    FROM location l
    LEFT JOIN lk_location_category lc ON lc.id = l.category_id
    LEFT JOIN lk_location_status ls ON ls.id = l.status_id`;
  const getLoc = db.prepare(locBase + ' WHERE l.id = ?');
  const qSeasons = db.prepare(
    `SELECT se.code FROM location_season lsn JOIN lk_location_season se ON se.id = lsn.season_id
     WHERE lsn.location_id = ? ORDER BY lsn.id`
  );
  const qDrives = db.prepare(
    `SELECT from_label AS "from", drive_minutes AS minutes, distance_miles AS miles, drive_bucket AS bucket
     FROM location_drive_time WHERE location_id = ? ORDER BY id`
  );
  const qActs = db.prepare(
    `SELECT la.id, la.title, ac.code AS category, la.description, la.cost_estimate, la.duration_min
     FROM location_activity la LEFT JOIN lk_activity_category ac ON ac.id = la.activity_category_id
     WHERE la.location_id = ? ORDER BY la.id`
  );
  const qVisits = db.prepare(
    `SELECT id, visited_on AS date, with_whom AS "with", cost_actual AS cost, note
     FROM location_activity_history WHERE location_activity_id = ? ORDER BY visited_on DESC, id DESC`
  );
  const qRatings = db.prepare(
    'SELECT id, rating, notes FROM location_activity_history_rating WHERE location_activity_history_id = ? ORDER BY id'
  );

  const serialize = (loc) => ({
    ...loc,
    seasons: qSeasons.all(loc.id).map((r) => r.code),
    drive_times: qDrives.all(loc.id),
    activities: qActs.all(loc.id).map((a) => ({
      ...a,
      visits: qVisits.all(a.id).map((v) => ({ ...v, ratings: qRatings.all(v.id) })),
    })),
  });

  const getPlace = (id) => {
    const loc = getLoc.get(id);
    return loc ? serialize(loc) : null;
  };

  const listPlaces = ({ search, status, season } = {}) => {
    let sql = locBase;
    const where = [];
    const params = [];
    if (search) { where.push('l.title LIKE ?'); params.push(`%${search}%`); }
    if (status) { where.push('ls.code = ?'); params.push(status); }
    if (season) {
      where.push(
        `EXISTS (SELECT 1 FROM location_season lsn JOIN lk_location_season se ON se.id = lsn.season_id
                 WHERE lsn.location_id = l.id AND se.code = ?)`
      );
      params.push(season);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY l.title';
    return db.prepare(sql).all(...params).map(serialize);
  };

  return { getPlace, listPlaces };
}

// Render the frontmatter-contract shape: drop DB ids, stamp contract_version.
function toContract(place) {
  if (!place) return place;
  const strip = (o, k) => { const c = { ...o }; delete c[k]; return c; };
  const p = strip(place, 'id');
  p.activities = place.activities.map((a) => {
    const ac = strip(a, 'id');
    ac.visits = a.visits.map((v) => {
      const vc = strip(v, 'id');
      vc.ratings = v.ratings.map((r) => strip(r, 'id'));
      return vc;
    });
    return ac;
  });
  p.contract_version = CONTRACT_VERSION;
  return p;
}

module.exports = { makePlacesReader, toContract, CONTRACT_VERSION };
