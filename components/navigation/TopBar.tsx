"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CaretLeftIcon, BellIcon } from '@phosphor-icons/react';
import { useTranslation } from '@/contexts/LanguageContext';

export function TopBar() {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useTranslation();
    const [unread, setUnread] = useState(0);

    // Quick dictionary to resolve route to title
    const getPageTitle = () => {
        if (pathname.includes('/records/add')) return 'Add Manually';
        if (pathname.startsWith('/records')) return 'My Records';
        if (pathname.startsWith('/reminders')) return 'Reminders';
        if (pathname.startsWith('/notifications')) return 'Notifications';
        if (pathname.startsWith('/settings')) return 'Settings';
        if (pathname.startsWith('/chat')) return 'Ask MedPal';
        if (pathname.startsWith('/results')) return 'Results';
        return 'Scanner'; // default fallback for /scan
    };

    const isSubPage = pathname.includes('/add') || pathname.includes('/results/') || pathname.split('/').length > 2;
    const onNotifications = pathname.startsWith('/notifications');

    // Refresh the unread badge on every navigation (e.g. after the user reads
    // notifications and leaves the tab). Fails silent if the table isn't set up.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/notifications');
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled && Array.isArray(data)) {
                    setUnread(data.filter((n: { read_at: string | null }) => !n.read_at).length);
                }
            } catch {
                /* ignore */
            }
        })();
        return () => { cancelled = true; };
    }, [pathname]);

    return (
        <header className="w-full bg-primary text-white px-6 py-5 rounded-b-3xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
                {isSubPage && (
                    <button
                        onClick={() => router.back()}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        aria-label="Go back"
                    >
                        <CaretLeftIcon className="w-6 h-6 weight-bold" />
                    </button>
                )}
                <h1 className="font-sans font-extrabold text-2xl tracking-tight">
                    {getPageTitle()}
                </h1>
            </div>

            <div className="flex items-center gap-1.5">
                {!onNotifications && (
                    <button
                        onClick={() => router.push('/notifications')}
                        className="relative p-1.5 hover:bg-white/10 rounded-full transition-colors"
                        aria-label={t.nav.notifications}
                    >
                        <BellIcon className="w-6 h-6" weight={unread > 0 ? 'fill' : 'regular'} />
                        {unread > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-primary">
                                {unread > 9 ? '9+' : unread}
                            </span>
                        )}
                    </button>
                )}

                <img
                    src="/logo.svg"
                    alt="MedPal Logo"
                    className="w-9 h-auto shrink-0 drop-shadow-sm"
                />
            </div>
        </header>
    );
}
