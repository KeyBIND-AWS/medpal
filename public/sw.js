// MedPal service worker
// Day 3 TODO (Kaiyou): add push/notification handlers here for medication reminders.

const CACHE_VERSION = 'v3';
const CACHE_NAME = `medpal-cache-${CACHE_VERSION}`;

// Only the app shell root — used as the offline fallback for all page navigations.
// We intentionally do NOT pre-cache other page routes: Next.js pages are
// server-rendered on Vercel, so their HTML changes on every deploy. Caching
// stale page HTML would cause blank screens after a redeployment.
const PRECACHE_URLS = ['/'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((names) =>
                Promise.all(
                    names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // /_next/static/ assets: cache-first.
    // Next.js content-hashes every file under this path, so a cached copy
    // is always valid for the lifetime of that build.
    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(
            caches.match(request).then(
                (cached) =>
                    cached ??
                    fetch(request).then((res) => {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then((c) => c.put(request, clone));
                        return res;
                    })
            )
        );
        return;
    }

    // Page navigations: network-first.
    // Always fetch fresh HTML from Vercel so we don't serve stale server-rendered
    // output after a deployment. Only fall back to cached app shell when offline.
    if (request.mode === 'navigate') {
        event.respondWith(fetch(request).catch(() => caches.match('/')));
        return;
    }

    // Everything else (API calls, Supabase, etc.): let the browser handle normally.
});