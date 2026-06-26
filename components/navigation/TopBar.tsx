"use client";

import { usePathname, useRouter } from 'next/navigation';
import { CaretLeftIcon } from '@phosphor-icons/react';

export function TopBar() {
    const pathname = usePathname();
    const router = useRouter();

    // Quick dictionary to resolve route to title
    const getPageTitle = () => {
        if (pathname.includes('/records/add')) return 'Add Manually';
        if (pathname.startsWith('/records')) return 'My Records';
        if (pathname.startsWith('/reminders')) return 'Reminders';
        if (pathname.startsWith('/settings')) return 'Settings';
        if (pathname.startsWith('/chat')) return 'Ask MedPal';
        if (pathname.startsWith('/results')) return 'Results';
        return 'Scanner'; // default fallback for /scan
    };

    const isSubPage = pathname.includes('/add') || pathname.includes('/results/') || pathname.split('/').length > 2;

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

            <img
                src="/logo.svg"
                alt="MedPal Logo"
                className="w-9 h-auto shrink-0 drop-shadow-sm"
            />
        </header>
    );
}