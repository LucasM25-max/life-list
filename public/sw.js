const CACHE_NAME = 'life-app-cache-v2';
const COL_CACHE_NAME = 'life-col-offline-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/col-offline/manifest.json'
];

async function precacheCatalogueOfLife() {
  const cache = await caches.open(COL_CACHE_NAME);
  try {
    const manifestResponse = await fetch('/col-offline/manifest.json', { cache: 'no-store' });
    if (!manifestResponse.ok) return;
    const manifest = await manifestResponse.json();

    // Download every shard once while online. The individual shards are small compressed
    // files, so the browser only pays the transfer cost once and can search them offline.
    for (const shard of Object.values(manifest.shards || {})) {
      try {
        const response = await fetch(shard.url, { cache: 'no-store' });
        if (response.ok) await cache.put(shard.url, response.clone());
      } catch {
        // One failed shard must not prevent the rest of the app from installing.
      }
    }
  } catch {
    // The normal app cache still installs if the CoL index cannot be fetched.
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => precacheCatalogueOfLife())
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME && key !== COL_CACHE_NAME) return caches.delete(key);
        return undefined;
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // CoL shards are immutable for a deployment. Always prefer the offline cache.
  if (url.pathname.startsWith('/col-offline/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok && request.method === 'GET') {
          const clone = response.clone();
          caches.open(COL_CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }))
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ offline: true, error: 'You are currently offline. Local data and logging remain fully available.' }),
        { headers: { 'Content-Type': 'application/json' }, status: 503 }
      ))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(request).then((networkResponse) => {
          if (networkResponse?.status === 200 && request.method === 'GET') {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse?.status === 200 && request.method === 'GET') {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => {
        if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html') || caches.match('/');
        }
      });
    })
  );
});
