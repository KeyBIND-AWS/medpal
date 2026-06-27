"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Toggle } from '@/components/ui/Toggle';
import { EmptyState } from '@/components/ui/EmptyState';
import { BellIcon, PillIcon, WarningIcon } from '@phosphor-icons/react';

type NotificationLog = {
    id: string;
    title: string;
    body: string;
    type: string;
    reminder_id: string | null;
    sent_at: string;
    read_at: string | null;
};

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'now';
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { isSupported, permission, isSubscribed, isLoading: pushLoading, error, subscribe, unsubscribe } =
        usePushNotifications();

    const [notifications, setNotifications] = useState<NotificationLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/notifications');
                const data = await res.json();
                if (!cancelled && res.ok) setNotifications(Array.isArray(data) ? data : []);
            } catch {
                if (!cancelled) setNotifications([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const handleToggle = async (next: boolean) => {
        if (next) await subscribe();
        else await unsubscribe();
    };

    const handleCardTap = async (n: NotificationLog) => {
        if (!n.read_at) {
            setNotifications(prev =>
                prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
            fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [n.id] }),
            }).catch(() => {});
        }
        router.push('/reminders');
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(x => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
        fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ all: true }),
        }).catch(() => {});
    };

    const hasUnread = notifications.some(n => !n.read_at);

    const statusLabel = !isSupported
        ? 'Not supported on this device'
        : permission === 'denied'
            ? t.notificationsPage.pushDenied
            : isSubscribed
                ? t.notificationsPage.pushEnabled
                : 'Off';

    return (
        <div className="w-full flex flex-col p-4 md:p-6 gap-5 pb-24 animate-in fade-in duration-300">

            {/* Enable push row */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-tint text-primary flex items-center justify-center shrink-0">
                        <BellIcon className="w-5 h-5" weight="fill" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-ink">{t.notificationsPage.enablePush}</span>
                        <span className="text-xs text-muted truncate">{statusLabel}</span>
                    </div>
                </div>
                {isSupported && permission !== 'denied' && (
                    <Toggle enabled={isSubscribed} onChange={handleToggle} />
                )}
            </div>

            {/* Blocked-in-browser banner */}
            {permission === 'denied' && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                    <WarningIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" weight="fill" />
                    <p className="text-xs text-amber-800 font-medium leading-snug">
                        {t.notificationsPage.pushDenied}. Enable notifications for this site in your browser
                        or phone settings, then reload.
                    </p>
                </div>
            )}

            {/* Hook error */}
            {error && permission !== 'denied' && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
                    {error}
                </div>
            )}

            {/* Feed header */}
            {notifications.length > 0 && (
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                        {t.notificationsPage.title}
                    </h2>
                    {hasUnread && (
                        <button
                            onClick={handleMarkAllRead}
                            className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                        >
                            {t.notificationsPage.markAllRead}
                        </button>
                    )}
                </div>
            )}

            {/* Feed / empty / loading */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                </div>
            ) : notifications.length === 0 ? (
                <EmptyState
                    title={t.notificationsPage.emptyTitle}
                    description={t.notificationsPage.emptyDesc}
                    icon={<BellIcon className="w-8 h-8 text-slate-400" />}
                />
            ) : (
                <div className="flex flex-col gap-2">
                    {notifications.map((n) => {
                        const unread = !n.read_at;
                        return (
                            <button
                                key={n.id}
                                onClick={() => handleCardTap(n)}
                                className={`text-left w-full flex items-start gap-3 rounded-2xl border bg-white p-4 transition-colors hover:bg-slate-50 ${
                                    unread ? 'border-l-4 border-l-primary border-y-blue-100 border-r-blue-100' : 'border-slate-200'
                                }`}
                            >
                                <div className="w-9 h-9 rounded-xl bg-tint text-primary flex items-center justify-center shrink-0">
                                    <PillIcon className="w-4 h-4" weight="fill" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-bold text-ink truncate">{n.title}</span>
                                        <span className="text-[10px] text-muted shrink-0">{timeAgo(n.sent_at)}</span>
                                    </div>
                                    <p className="text-xs text-muted mt-0.5 break-words leading-snug">{n.body}</p>
                                </div>
                                {unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
