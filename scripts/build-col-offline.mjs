import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createGzip } from 'node:zlib';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public', 'col-offline');
const DOWNLOAD_URL = 'https://download.checklistbank.org/col/latest_txtree.zip';
const VERSION = 'latest';

async function download(url, destination) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'LifeList/1.0 CoL offline index build' },
    redirect: 'follow'
  });
  if (!response.ok || !response.body) {
    throw new Error(`Catalogue of Life download failed: ${response.status} ${response.statusText}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
}

function canonicalSpeciesName(label) {
  let value = label
    .replace(/^\s+/, '')
    .replace(/^[-+*|]+\s*/, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/^species\s*[:=-]?\s*/i, '')
    .trim();

  // TextTree variants may include IDs, rank markers, subgenera and hybrid markers before
  // the canonical name. Find the first valid genus + species epithet pair instead of
  // assuming the scientific name begins at column 1.
  const match = value.match(/(?:^|\s)(×?)([A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)(?:\s+\([^)]*\))?\s+(?:×\s*)?([a-z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)(?:\s+(?:subsp\.?|ssp\.?|var\.?|f\.?|forma)\s+([a-z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+))?(?=\s|$)/);
  if (!match) return null;

  const hybridGenus = match[1] || '';
  const genus = match[2];
  const epithet = match[3];
  const infra = match[4];
  return infra ? `${hybridGenus}${genus} ${epithet} ${infra}` : `${hybridGenus}${genus} ${epithet}`;
}

function likelySpecies(label) {
  const name = canonicalSpeciesName(label);
  if (!name) return null;
  const parts = name.split(/\s+/);
  if (parts.length < 2 || !/^[a-z]/.test(parts[1])) return null;
  return name;
}

async function main() {
  const temp = await mkdtemp(path.join(tmpdir(), 'lifelist-col-'));
  const zipPath = path.join(temp, 'col-txtree.zip');
  const extractDir = path.join(temp, 'extract');

  try {
    console.log(`Downloading Catalogue of Life TextTree from ${DOWNLOAD_URL}`);
    await download(DOWNLOAD_URL, zipPath);
    await mkdir(extractDir, { recursive: true });
    execFileSync('unzip', ['-q', zipPath, '-d', extractDir]);

    const extractedFiles = execFileSync('find', [extractDir, '-type', 'f', '-printf', '%s %p\\n'], { encoding: 'utf8' })
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => {
        const separator = line.indexOf(' ');
        return { size: Number(line.slice(0, separator)), path: line.slice(separator + 1) };
      })
      .sort((a, b) => b.size - a.size);

    const treeFile = extractedFiles[0]?.path;
    if (!treeFile) throw new Error('No TextTree data file was found in the Catalogue of Life archive.');

    console.log(`Parsing TextTree file: ${path.basename(treeFile)} (${(extractedFiles[0].size / 1024 / 1024).toFixed(1)} MiB)`);
    const input = await readFile(treeFile, 'utf8');
    const shards = new Map();
    const seen = new Set();

    for (const rawLine of input.split(/\r?\n/)) {
      if (!rawLine.trim() || rawLine.trimStart().startsWith('#') || rawLine.trimStart().startsWith('@')) continue;
      const scientificName = likelySpecies(rawLine);
      if (!scientificName) continue;

      const key = scientificName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const bucket = key.replace(/^×/, '')[0];
      if (!/^[a-z]$/i.test(bucket)) continue;
      if (!shards.has(bucket.toLowerCase())) shards.set(bucket.toLowerCase(), []);
      shards.get(bucket.toLowerCase()).push({
        scientificName,
        genus: scientificName.split(/\s+/)[0].replace(/^×/, ''),
        rank: 'species',
        source: 'Catalogue of Life (offline)'
      });
    }

    if (seen.size < 2000000) {
      throw new Error(`Catalogue of Life parser produced only ${seen.size.toLocaleString()} species records; refusing to deploy an incomplete offline index.`);
    }

    await rm(PUBLIC_DIR, { recursive: true, force: true });
    await mkdir(PUBLIC_DIR, { recursive: true });

    const manifest = {
      version: VERSION,
      generatedAt: new Date().toISOString(),
      source: 'Catalogue of Life latest TextTree release',
      sourceUrl: DOWNLOAD_URL,
      records: seen.size,
      shards: {}
    };

    for (const [bucket, records] of [...shards.entries()].sort()) {
      records.sort((a, b) => a.scientificName.localeCompare(b.scientificName));
      const jsonl = records.map(record => JSON.stringify(record)).join('\n') + '\n';
      const compressed = await new Promise((resolve, reject) => {
        const chunks = [];
        const gzip = createGzip({ level: 9 });
        gzip.on('data', chunk => chunks.push(chunk));
        gzip.on('end', () => resolve(Buffer.concat(chunks)));
        gzip.on('error', reject);
        gzip.end(Buffer.from(jsonl));
      });

      const filename = `${bucket}.jsonl.gz`;
      await writeFile(path.join(PUBLIC_DIR, filename), compressed);
      manifest.shards[bucket] = {
        url: `/col-offline/${filename}`,
        records: records.length,
        bytes: compressed.length,
        sha256: createHash('sha256').update(compressed).digest('hex')
      };
    }

    await writeFile(path.join(PUBLIC_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

    const totalBytes = (await Promise.all(
      Object.values(manifest.shards).map(shard => stat(path.join(PUBLIC_DIR, path.basename(shard.url))))
    )).reduce((sum, item) => sum + item.size, 0);

    console.log(`Built CoL offline index: ${manifest.records.toLocaleString()} records, ${(totalBytes / 1024 / 1024).toFixed(1)} MiB compressed.`);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
