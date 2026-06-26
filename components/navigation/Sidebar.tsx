"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/config/navigation';
import { useTranslation } from '@/contexts/LanguageContext';

export function Sidebar() {
    const pathname = usePathname();
    const { t } = useTranslation();

    return (
        <aside className="w-full h-full bg-white flex flex-col py-8 select-none">

            {/* Brand Header */}
            <div className="flex items-center gap-3 px-6 mb-12">
                <img
                    src="/logo.svg"
                    alt="MedPal Logo"
                    className="w-14 h-auto shrink-0 drop-shadow-sm"
                />
                <span className="font-sans font-extrabold text-2xl tracking-tight text-ink">
          MedPal
        </span>
            </div>

            {/* Nav Links */}
            {/* FIXED: Changed 'pr-6' to 'pl-[18px] pr-6' to match Figma's X:18 position */}
            <div className="flex flex-col gap-2 pl-[18px] pr-6">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            // FIXED: h-12 (48px), rounded-xl (12px), pl-4 (16px), gap-3 (13px)
                            className={`relative overflow-hidden flex items-center h-12 gap-3 pl-4 transition-all rounded-xl font-medium ${
                                isActive
                                    ? 'bg-tint text-primary font-bold'
                                    : 'text-muted hover:text-ink hover:bg-slate-50'
                            }`}
                        >
                            {isActive && (
                                // FIXED: Width dialed down from 6px to Figma's 3.33px
                                <div className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-primary" />
                            )}

                            <Icon
                                weight={isActive ? "fill" : "regular"}
                                className="w-6 h-6 shrink-0"
                            />
                            <span className="text-[15px] tracking-wide">
                                {t.nav[item.nameKey]}
                            </span>
                        </Link>
                    );
                })}
            </div>

        </aside>
    );
}