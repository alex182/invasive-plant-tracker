export type LatLng = [number, number];

const EARTH_RADIUS_M = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two [lat, lng] points, in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "820 m" under 1 km, "1.4 km" otherwise. */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

/** 8-point compass label for the direction from `from` to `to`. */
export function bearingLabel(from: LatLng, to: LatLng): string {
  const y = Math.sin(toRad(to[1] - from[1])) * Math.cos(toRad(to[0]));
  const x =
    Math.cos(toRad(from[0])) * Math.sin(toRad(to[0])) -
    Math.sin(toRad(from[0])) * Math.cos(toRad(to[0])) * Math.cos(toRad(to[1] - from[1]));
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return COMPASS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

/** A universal maps-directions URL (opens the maps app on iOS/Android, maps.google.com on desktop). */
export function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Approximate area of a polygon of [lat, lng] vertices, in square metres.
 * Equirectangular projection about the polygon's mean latitude + shoelace formula —
 * accurate to well under 1% for the patch-sized areas this app records.
 */
export function polygonAreaSqMeters(ring: LatLng[]): number {
  if (ring.length < 3) return 0;
  const meanLat = ring.reduce((sum, p) => sum + p[0], 0) / ring.length;
  const cosLat = Math.cos(toRad(meanLat));
  const pts = ring.map(([lat, lng]) => [
    toRad(lng) * EARTH_RADIUS_M * cosLat,
    toRad(lat) * EARTH_RADIUS_M,
  ]);
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

const SQM_PER_ACRE = 4046.8564224;

/** "0.42 ha (1.04 acres)" — patch area in the two units field crews use. */
export function formatArea(sqMeters: number): string {
  const ha = sqMeters / 10000;
  const acres = sqMeters / SQM_PER_ACRE;
  return `${ha.toFixed(ha < 1 ? 2 : 1)} ha (${acres.toFixed(acres < 1 ? 2 : 1)} acres)`;
}
