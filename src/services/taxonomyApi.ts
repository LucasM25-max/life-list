import { Taxon } from '../types';
import { curatedTaxa } from '../data/curatedTaxa';

export async function searchTaxonomy(query: string): Promise<Taxon[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const q = trimmed.toLowerCase();
  const searchLocal = () => curatedTaxa.filter(t => 
    t.scientificName.toLowerCase().includes(q) ||
    t.vernacularName.toLowerCase().includes(q) ||
    t.family?.toLowerCase().includes(q) ||
    t.order?.toLowerCase().includes(q) ||
    t.genus?.toLowerCase().includes(q) ||
    (t.allVernaculars || []).some(v => v.toLowerCase().includes(q))
  );

  // If browser is offline, return local curated search immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return searchLocal();
  }

  // 1. Try server Catalogue of Life API proxy
  try {
    const res = await fetch(`/api/taxonomy/search?q=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        return data.results;
      }
    }
  } catch (e) {
    // If fetch failed (e.g. offline or network error), continue to local curated search
    console.warn('Network taxonomy search failed, falling back to local database:', e);
  }

  // 2. Client-side local curated fallback
  return searchLocal();
}
