"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/navigation/Sidebar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { TopBar } from '@/components/navigation/TopBar';

const NO_CHROME_ROUTES = ['/', '/login'];

export function ShellLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const showChrome = !NO_CHROME_ROUTES.includes(pathname);

    // If on landing or login page, hide all navigation
    if (!showChrome) {
        return <main className="w-full h-full flex items-center justify-center bg-white">{children}</main>;
    }

    // Otherwise, render our responsive MedPal app shell
    return (
        <div className="flex flex-col md:flex-row w-full h-full">
            {/* DESKTOP: Sidebar */}
            <div className="hidden md:flex w-64 h-full bg-white border-r border-slate-200 z-50">
                <Sidebar />
            </div>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 h-full overflow-y-auto bg-white relative flex justify-center pb-16 md:pb-0">
                <div className="w-full md:max-w-120 min-h-full md:border-x md:border-none flex flex-col">

                    {/* MOBILE/APP TOPBAR */}
                    <div className="sticky top-0 z-40">
                        <TopBar />
                    </div>

                    {/* PAGE CONTENT */}
                    <div className="flex-1">
                        {children}
                    </div>

                </div>
            </main>

            {/* MOBILE: Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 w-full bg-white border border-slate-200 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50">
                <BottomNav />
            </div>
        </div>
    );
}