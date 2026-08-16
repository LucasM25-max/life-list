import { Coordinates, EnclosureRecord } from '../types';

export type GpsStatus = 'idle' | 'acquiring' | 'locked' | 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'manual';

// In-memory cache for the most recent valid GPS fix
let cachedRecentGps: Coordinates | null = null;

export function getCachedGps(): Coordinates | null {
  if (cachedRecentGps && (Date.now() - (cachedRecentGps.capturedAt || 0) < 15 * 60 * 1000)) {
    return cachedRecentGps;
  }
  try {
    const raw = sessionStorage.getItem('life_app_last_gps');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        if (Date.now() - (parsed.capturedAt || 0) < 15 * 60 * 1000) {
          cachedRecentGps = parsed;
          return parsed;
        }
      }
    }
  } catch {}
  return null;
}

export function setCachedGps(coords: Coordinates) {
  cachedRecentGps = coords;
  try {
    sessionStorage.setItem('life_app_last_gps', JSON.stringify(coords));
  } catch {}
}

/**
 * Robust device location fetcher.
 * 1. Tries high accuracy (satellites / Wi-Fi) with 8s timeout.
 * 2. If it fails or times out, falls back to standard accuracy (cellular / IP) with 10s timeout.
 * 3. Returns the Coordinates or throws an error with a clear reason code.
 */
export async function getAccurateDeviceLocation(): Promise<Coordinates> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new Error('unsupported');
  }

  const tryGetPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  // Attempt 1: High Accuracy
  try {
    const pos = await tryGetPosition({
      enableHighAccuracy: true,
      timeout: 9000,
      maximumAge: 15000
    });
    const coords: Coordinates = {
      latitude: Number(pos.coords.latitude.toFixed(6)),
      longitude: Number(pos.coords.longitude.toFixed(6)),
      accuracy: Math.round(pos.coords.accuracy),
      capturedAt: Date.now()
    };
    setCachedGps(coords);
    return coords;
  } catch (err: any) {
    // If explicitly denied, do not retry
    if (err?.code === 1) { // PERMISSION_DENIED
      throw new Error('denied');
    }
  }

  // Attempt 2: Fallback Standard Accuracy (works on laptops/desktops & poor signal areas)
  try {
    const pos = await tryGetPosition({
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 120000
    });
    const coords: Coordinates = {
      latitude: Number(pos.coords.latitude.toFixed(6)),
      longitude: Number(pos.coords.longitude.toFixed(6)),
      accuracy: Math.round(pos.coords.accuracy),
      capturedAt: Date.now()
    };
    setCachedGps(coords);
    return coords;
  } catch (err: any) {
    if (err?.code === 1) throw new Error('denied');
    if (err?.code === 2) throw new Error('unavailable');
    if (err?.code === 3) throw new Error('timeout');
    
    // Check if we have a recent cached position as ultimate fallback
    const cached = getCachedGps();
    if (cached) return cached;

    throw new Error('unavailable');
  }
}

/**
 * Calculates the exact geographical centroid from a collection of real GPS coordinates.
 * Returns undefined if no valid coordinates are provided.
 */
export function computeCentroid(coordsList: (Coordinates | undefined | null)[]): Coordinates | undefined {
  const valid = coordsList.filter((c): c is Coordinates => 
    c !== null && 
    c !== undefined && 
    typeof c.latitude === 'number' && 
    typeof c.longitude === 'number' && 
    !isNaN(c.latitude) && 
    !isNaN(c.longitude)
  );

  if (valid.length === 0) return undefined;

  let totalLat = 0;
  let totalLng = 0;
  let totalAccuracy = 0;
  let hasAccuracy = false;

  for (const c of valid) {
    totalLat += c.latitude;
    totalLng += c.longitude;
    if (typeof c.accuracy === 'number') {
      totalAccuracy += c.accuracy;
      hasAccuracy = true;
    }
  }

  return {
    latitude: Number((totalLat / valid.length).toFixed(6)),
    longitude: Number((totalLng / valid.length).toFixed(6)),
    accuracy: hasAccuracy ? Math.round(totalAccuracy / valid.length) : undefined,
    capturedAt: Math.max(...valid.map(c => c.capturedAt || Date.now()))
  };
}

/**
 * Formats coordinates for display (e.g. "51.5074° N, 0.1278° W")
 */
export function formatCoordinates(coords: Coordinates): string {
  const latStr = `${Math.abs(coords.latitude).toFixed(4)}° ${coords.latitude >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(coords.longitude).toFixed(4)}° ${coords.longitude >= 0 ? 'E' : 'W'}`;
  const accStr = coords.accuracy ? ` (±${coords.accuracy}m)` : '';
  return `${latStr}, ${lngStr}${accStr}`;
}

/**
 * Calculates distance in meters between two GPS coordinates using the Haversine formula.
 */
export function getDistanceMeters(c1: Coordinates, c2: Coordinates): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((c2.latitude - c1.latitude) * Math.PI) / 180;
  const dLon = ((c2.longitude - c1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.latitude * Math.PI) / 180) *
      Math.cos((c2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
