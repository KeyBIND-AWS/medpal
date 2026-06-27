"use client";

import { useCallback, useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// VAPID public keys are base64url strings; PushManager.subscribe wants raw bytes.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const output = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
    return output;
}

// register() is idempotent and self-sufficient, so push works even though the
// app only auto-registers the SW in production (see ServiceWorkerRegistration).
async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
    await navigator.serviceWorker.register('/sw.js');
    return navigator.serviceWorker.ready;
}

interface UsePushNotifications {
    isSupported: boolean;
    permission: NotificationPermission;
    isSubscribed: boolean;
    isLoading: boolean;
    error: string | null;
    subscribe: () => Promise<boolean>;
    unsubscribe: () => Promise<boolean>;
}

export function usePushNotifications(): UsePushNotifications {
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Detect support + reconcile with any existing subscription on mount.
    useEffect(() => {
        const supported =
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window;

        setIsSupported(supported);
        if (!supported) {
            setIsLoading(false);
            return;
        }

        setPermission(Notification.permission);

        let cancelled = false;
        (async () => {
            try {
                // Don't force registration here (avoids hanging on serviceWorker.ready
                // in dev) — only inspect an existing one.
                const reg = await navigator.serviceWorker.getRegistration();
                const sub = reg ? await reg.pushManager.getSubscription() : null;
                if (!cancelled) setIsSubscribed(!!sub);
            } catch {
                if (!cancelled) setIsSubscribed(false);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const subscribe = useCallback(async (): Promise<boolean> => {
        setError(null);
        if (!isSupported) {
            setError('Push notifications are not supported on this device.');
            return false;
        }
        if (!VAPID_PUBLIC_KEY) {
            setError('Push is not configured (missing VAPID public key).');
            return false;
        }

        setIsLoading(true);
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== 'granted') {
                setError(perm === 'denied' ? 'Notifications are blocked in your browser settings.' : 'Permission was not granted.');
                return false;
            }

            const reg = await getReadyRegistration();
            // Reuse an existing subscription if one is already registered.
            const existing = await reg.pushManager.getSubscription();
            const subscription =
                existing ??
                (await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
                }));

            const json = subscription.toJSON();
            const res = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: json.endpoint,
                    p256dh: json.keys?.p256dh,
                    auth: json.keys?.auth,
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to save subscription.');
            }

            setIsSubscribed(true);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to enable notifications.');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [isSupported]);

    const unsubscribe = useCallback(async (): Promise<boolean> => {
        setError(null);
        setIsLoading(true);
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            const subscription = reg ? await reg.pushManager.getSubscription() : null;
            if (subscription) {
                await fetch('/api/notifications/subscribe', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: subscription.endpoint }),
                }).catch(() => {});
                await subscription.unsubscribe();
            }
            setIsSubscribed(false);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to disable notifications.');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
