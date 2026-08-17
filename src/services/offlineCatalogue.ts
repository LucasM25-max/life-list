import { Taxon } from '../types';

type OfflineRecord = {
  scientificName: string;
  genus: string;
  rank: 'species';
  source: string;
};

type Manifest = {
  version: string;
  generatedAt: string;
  source: string;
  sourceUrl: string;
  records: number;
  shards: Record<string, { url: string; records: number; bytes: number; sha256: string }>;
};

let manifestPromise: Promise<Manifest | null> | null = null;
const shardPromises = new Map<string, Promise<OfflineRecord[]>>();

function loadManifest(): Promise<Manifest | null> {
  if (manifestPromise) return manifestPromise;

  manifestPromise = fetch('/col-offline/manifest.json', { cache: 'force-cache' })
    .then(async response => {
      if (!response.ok) return null;
      return (await response.json()) as Manifest;
    })
    .catch(() => null);

  return manifestPromise;
}

async function decompressGzip(response: Response): Promise<string> {
  if (!response.body) throw new Error('Offline catalogue response has no body');
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser does not support gzip decompression streams');
  }

  const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

async function loadShard(bucket: string): Promise<OfflineRecord[]> {
  const existing = shardPromises.get(bucket);
  if (existing) return existing;

  const promise = (async () => {
    const manifest = await loadManifest();
    const shard = manifest?.shards[bucket];
    if (!shard) return [];

    const response = await fetch(shard.url, { cache: 'force-cache' });
    if (!response.ok) return [];

    const text = await decompressGzip(response);
    const records: OfflineRecord[] = [];
    for (const line of text.split('\n')) {
      if (!line) continue;
      try {
        const record = JSON.parse(line) as OfflineRecord;
        if (record.scientificName) records.push(record);
      } catch {
        // Ignore malformed lines rather than taking the whole offline search down.
      }
    }
    return records;
  })().catch(() => []);

  shardPromises.set(bucket, promise);
  return promise;
}

function toTaxon(record: OfflineRecord): Taxon {
  const lower = record.scientificName.toLowerCase();
  return {
    id: `col-offline-${lower.replace(/[^a-z0-9]+/g, '-')}`,
    scientificName: record.scientificName,
    vernacularName: record.scientificName,
    rank: 'species',
    status: 'accepted',
    kingdom: '',
    phylum: '',
    class: '',
    order: '',
    family: '',
    genus: record.genus,
    iconicGroup: 'Other',
    source: 'Catalogue of Life (Offline index)'
  };
}

export async function searchOfflineCatalogue(query: string): Promise<Taxon[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const bucket = trimmed[0].toLowerCase();
  if (!/^[a-z]$/.test(bucket)) return [];

  const records = await loadShard(bucket);
  const q = trimmed.toLowerCase();
  const matched: Taxon[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    const scientific = record.scientificName.toLowerCase();
    if (!scientific.includes(q)) continue;
    if (seen.has(scientific)) continue;
    seen.add(scientific);
    matched.push(toTaxon(record));
    if (matched.length >= 20) break;
  }

  return matched;
}

export async function getOfflineCatalogueStats(): Promise<{ records: number; generatedAt: string } | null> {
  const manifest = await loadManifest();
  if (!manifest) return null;
  return { records: manifest.records, generatedAt: manifest.generatedAt };
}

export async function warmOfflineCatalogue(): Promise<void> {
  const manifest = await loadManifest();
  if (!manifest) return;

  // The Service Worker handles persistent precaching. This warms the manifest only and
  // deliberately avoids parsing 2M+ records into the main thread on every app launch.
  void manifest;
}
