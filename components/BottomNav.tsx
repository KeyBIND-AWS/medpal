'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ScanIcon, FileTextIcon, BellIcon, ChatIcon } from '@phosphor-icons/react';

interface TabItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const TABS: TabItem[] = [
  { href: '/scan', label: 'Scan', icon: ScanIcon },
  { href: '/records', label: 'Records', icon: FileTextIcon },
  { href: '/reminders', label: 'Reminders', icon: BellIcon },
  { href: '/chat', label: 'Chat', icon: ChatIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[428px] -translate-x-1/2 border-t border-gray-200 bg-white">
      <ul className="flex justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                  isActive ? 'text-[#1A3AF5]' : 'text-gray-400'
                }`}
              >
                <Icon
                  className="h-6 w-6"
                  weight={isActive ? 'fill' : 'regular'}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}