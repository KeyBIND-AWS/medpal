// MedPal Unified Service Worker (Next.js Caching + Web Push Engine)

const CACHE_VERSION = 'v3';
const CACHE_NAME = `medpal-cache-${CACHE_VERSION}`;
const PRECACHE_URLS = ['/'];

// ============================================================================
// LIFECYCLE: INSTALL & ACTIVATE (Singular, Unified Listeners)
// ============================================================================
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Take over immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) =>
                Promise.all(
                    names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
                )
            )
            .then(() => self.clients.claim()) // Instantly claim all open browser tabs
    );
});

// ============================================================================
// NETWORK: NEXT.JS STATIC ASSET CACHING
// ============================================================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

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

    if (request.mode === 'navigate') {
        event.respondWith(fetch(request).catch(() => caches.match('/')));
        return;
    }
});

// ============================================================================
// ENGINE 1: STANDARD WEB PUSH (Remote Server Broadcasts)
// ============================================================================
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const displayNotificationPromise = Promise.resolve().then(() => {
    try {
      const metadata = event.data.json();
      return self.registration.showNotification(metadata.title || 'HatidDok', {
        body: metadata.body || 'Adunay ka bag-ong pahibalo gikan sa imong medical companion.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: { url: metadata.url || '/reminders' }
      });
    } catch {
      return self.registration.showNotification('HatidDok', {
        body: event.data.text(),
        icon: '/icons/icon-192x192.png',
        data: { url: '/reminders' }
      });
    }
  });

  event.waitUntil(displayNotificationPromise);
});

// ============================================================================
// ENGINE 2: LOCAL CLIENT TRIGGER (Added event.waitUntil Lock)
// ============================================================================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'TEST_LOCAL_PUSH') {
        const { title, body, url } = event.data.payload;

        // CRITICAL: event.waitUntil guarantees the OS finishes painting the notification banner!
        event.waitUntil(
            self.registration.showNotification(title || 'MedPal Paalala', {
                body: body || 'Oras na para sa iyong Metformin (500mg).',
                icon: '/icons/icon-192x192.png',
                vibrate: [100, 50, 100],
                data: { url: url || '/reminders' },
            })
        );
    }
});

// ============================================================================
// INTERACTION: HANDLE NOTIFICATION TAPS
// ============================================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/reminders')
  );
});