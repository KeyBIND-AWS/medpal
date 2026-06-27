// MedPal Unified Service Worker (Next.js Caching + Web Push Engine)

const CACHE_VERSION = 'v4';
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
    let payload = {};
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }

    // The server may nest routing info under `data`; ensure a click target exists.
    const data = { ...(payload.data || {}) };
    if (!data.url) data.url = '/notifications';

    return self.registration.showNotification(payload.title || '💊 MedPal Reminder', {
      body: payload.body || 'You have a new reminder from MedPal.',
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-72x72.png',
      vibrate: payload.vibrate || [200, 100, 200],
      // `tag` collapses repeat fires of the same reminder into one banner.
      tag: payload.tag,
      requireInteraction: payload.requireInteraction ?? false,
      data,
    });
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
            self.registration.showNotification(title || '💊 MedPal Reminder', {
                body: body || 'Time to take your medication.',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                vibrate: [200, 100, 200],
                requireInteraction: false,
                data: { url: url || '/notifications' },
            })
        );
    }
});

// ============================================================================
// INTERACTION: HANDLE NOTIFICATION TAPS
// ============================================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Reuse an already-open MedPal tab when possible instead of spawning a new one.
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});