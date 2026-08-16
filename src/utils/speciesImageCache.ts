import { useEffect, useState } from 'react';
import { Observation } from '../types';

const STORAGE_KEY = 'life_app_species_images_v1';

// Internal memory cache
let imageCache: Record<string, string> = {};

// Load cache from localStorage on init
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    imageCache = JSON.parse(raw);
  }
} catch (e) {
  console.error('Error loading species image cache:', e);
}

function saveCache() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(imageCache));
  } catch (e) {
    console.error('Error saving species image cache:', e);
  }
}

// Global subscribers for reactive UI updates when new species image is fetched
type Listener = (name: string, url: string) => void;
const listeners = new Set<Listener>();

export function subscribeSpeciesImage(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifySubscribers(name: string, url: string) {
  listeners.forEach(l => l(name, url));
}

// In-flight request deduplication
const pendingRequests = new Map<string, Promise<string | null>>();

export function setCachedSpeciesImage(scientificName: string, url: string) {
  if (!scientificName || !url) return;
  const key = scientificName.trim().toLowerCase();
  if (imageCache[key] !== url) {
    imageCache[key] = url;
    saveCache();
    notifySubscribers(key, url);
  }
}

export async function fetchSpeciesImage(scientificName: string): Promise<string | null> {
  if (!scientificName) return null;
  const key = scientificName.trim().toLowerCase();

  if (imageCache[key]) {
    return imageCache[key];
  }

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = (async () => {
    try {
      const res = await fetch(`/api/species-images?q=${encodeURIComponent(scientificName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.images && data.images.length > 0) {
          const mainImg = data.images.find((i: any) => i.isMain) || data.images[0];
          if (mainImg?.url) {
            setCachedSpeciesImage(scientificName, mainImg.url);
            return mainImg.url;
          }
        }
      }
    } catch (e) {
      console.error(`Failed to fetch species image for ${scientificName}`, e);
    } finally {
      pendingRequests.delete(key);
    }
    return null;
  })();

  pendingRequests.set(key, promise);
  return promise;
}

export function getSpeciesImageSync(scientificName: string, observations?: Observation[]): string | undefined {
  if (!scientificName) return undefined;
  const key = scientificName.trim().toLowerCase();

  // 1. Check in-memory cache
  if (imageCache[key]) {
    return imageCache[key];
  }

  // 2. Check if any observation has a photoUrl for this species
  if (observations && observations.length > 0) {
    const match = observations.find(o => 
      o.photoUrl && 
      (o.scientificName.trim().toLowerCase() === key || o.vernacularName?.trim().toLowerCase() === key)
    );
    if (match?.photoUrl) {
      setCachedSpeciesImage(scientificName, match.photoUrl);
      return match.photoUrl;
    }
  }

  return undefined;
}

export function useSpeciesImage(scientificName: string, fallbackPhotoUrl?: string, observations?: Observation[]) {
  const [imageUrl, setImageUrl] = useState<string | undefined>(() => {
    if (fallbackPhotoUrl) return fallbackPhotoUrl;
    return getSpeciesImageSync(scientificName, observations);
  });

  useEffect(() => {
    if (fallbackPhotoUrl) {
      setImageUrl(fallbackPhotoUrl);
      setCachedSpeciesImage(scientificName, fallbackPhotoUrl);
      return;
    }

    const syncUrl = getSpeciesImageSync(scientificName, observations);
    if (syncUrl) {
      setImageUrl(syncUrl);
      return;
    }

    let isMounted = true;
    if (scientificName) {
      fetchSpeciesImage(scientificName).then(url => {
        if (isMounted && url) {
          setImageUrl(url);
        }
      });
    }

    const key = scientificName?.trim().toLowerCase();
    const unsubscribe = subscribeSpeciesImage((updatedKey, url) => {
      if (updatedKey === key && isMounted) {
        setImageUrl(url);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [scientificName, fallbackPhotoUrl, observations]);

  return imageUrl;
}
