'use client';

import { usePathname } from 'next/navigation';
import { getPageTitle } from '@/lib/page-titles';

export default function DesktopContentHeader() {
    const pathname = usePathname();

    return (
        <header className="hidden lg:flex h-16 shrink-0 items-center justify-between bg-[#1A3AF5] px-6">
            <h1 className="text-lg font-bold text-white">{getPageTitle(pathname)}</h1>
            {/* TODO(Luis): swap for real asset once provided */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <span className="text-xs font-bold text-white">M</span>
            </div>
        </header>
    );
}