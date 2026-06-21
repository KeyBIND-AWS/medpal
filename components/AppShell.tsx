'use client';

import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';
import TopBar from './TopBar';

// Onboarding routes render full-screen, without the tab bar / top bar.
const NO_CHROME_ROUTES = ['/', '/login'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showChrome = !NO_CHROME_ROUTES.includes(pathname);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[428px] flex-col bg-white">
      {showChrome && <TopBar />}
      <main className={`flex-1 ${showChrome ? 'pb-16' : ''}`}>{children}</main>
      {showChrome && <BottomNav />}
    </div>
  );
}
