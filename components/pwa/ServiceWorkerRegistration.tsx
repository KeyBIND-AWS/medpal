"use client";

import { useEffect } from 'react';

/**
 * Registers public/sw.js. Skipped outside production — registering it in dev
 * means every code change gets served from a stale cache until you manually
 * unregister.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.error('Service worker registration failed:', err));
  }, []);

  return null;
}