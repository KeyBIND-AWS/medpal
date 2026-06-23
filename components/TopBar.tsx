'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GearIcon } from '@phosphor-icons/react';

const TITLES: Record<string, string> = {
  '/scan': 'Scan',
  '/records': 'My Records',
  '/reminders': 'Reminders',
  '/chat': 'AI Chatbot',
  '/settings': 'Settings',
};

function getTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/records/')) return 'Record';
  if (pathname.startsWith('/results/')) return 'Result';
  return 'HatidDok';
}

export default function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
      <h1 className="text-base font-semibold text-gray-900">{getTitle(pathname)}</h1>
      <Link href="/settings" aria-label="Settings" className="text-gray-500">
        <GearIcon className="h-5 w-5" />
      </Link>
    </header>
  );
}