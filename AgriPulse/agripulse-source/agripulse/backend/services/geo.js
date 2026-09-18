// Straight-line distance in km. Multiplied by a road factor so it lands close to real road distance.
const ROAD_FACTOR = 1.25;

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// API-HOOK: swap this for OSRM / Google Directions for true road distance.
function roadDistanceKm(from, to) {
  if (!from || !to || from.lat == null || to.lat == null) return 0;
  return Math.round(haversineKm(from.lat, from.lng, to.lat, to.lng) * ROAD_FACTOR);
}

module.exports = { haversineKm, roadDistanceKm };
