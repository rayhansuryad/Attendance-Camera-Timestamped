const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

/**
 * Best-effort reverse geocoding via OpenStreetMap Nominatim (free, no API key).
 * Returns a human-readable address string, or null on any failure.
 */
export async function reverseGeocode(lat, lon) {
  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "attendance-app/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}
