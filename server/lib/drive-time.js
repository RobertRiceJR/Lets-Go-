// Shared drive-time math: straight-line distance from an origin -> a coarse
// drive-time bucket. Extracted from import.js (Phase 0) so the importer, the
// API, and any future recompute all agree on one implementation. No deps.

// Great-circle distance in miles between two lat/lon points.
function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius, miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Straight-line miles from (homeLat, homeLon) -> ~road miles (x1.3) -> one of
// the four DRIVE_TIMES buckets. Origin is now a parameter (was a module-level
// HOME_* constant) so it works for any saved origin, not just Home.
function driveTimeBucket(homeLat, homeLon, lat, lon) {
  if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) return '2+ hours';
  const roadMiles = haversineMiles(homeLat, homeLon, lat, lon) * 1.3; // straight-line -> ~road
  if (roadMiles <= 20) return 'under 30 min';
  if (roadMiles <= 45) return '30-60 min';
  if (roadMiles <= 90) return '1-2 hours';
  return '2+ hours';
}

module.exports = { haversineMiles, driveTimeBucket };
