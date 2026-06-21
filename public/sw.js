// HatidDok service worker — Day 1 stub (PWA shell caching only).
// Day 3 TODO (Kaiyou): add push/notification handlers here for medication reminders.

const CACHE_VERSION = 'v1';
const CACHE_NAME = `hatiddok-cache-${CACHE_VERSION}`;

// Core routes to pre-cache so the app shell loads offline.
const urlsToCache = ['/', '/scan'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // activate this version immediately, don't wait for old tabs to close
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim()) // take control of already-open tabs right away
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET requests. POST/PUT/DELETE (e.g. /api/scan, /api/chat)
  // must always go to the network — the Cache API can't store them anyway.
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).catch(() => {
        // Offline and not cached: fall back to the app shell for page navigations.
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        return Response.error();
      });
    })
  );
});
