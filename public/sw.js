const CACHE_NAME = 'life-app-cache-v1';

// Static core assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-while-revalidate for static files, Network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // For API endpoints, try network first; if offline, catch error
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ offline: true, error: "You are currently offline. Local data and logging remain fully available." }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        );
      })
    );
    return;
  }

  // For static assets, HTML, JS, CSS, fonts, images: Stale-While-Revalidate or Cache-First
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update for cache freshness
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {/* Silent offline fail for background revalidation */});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // If HTML page request fails offline, fallback to cached index.html
        if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html') || caches.match('/');
        }
      });
    })
  );
});
