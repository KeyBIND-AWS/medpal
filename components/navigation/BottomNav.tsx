"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/config/navigation';

export function BottomNav() {
  const pathname = usePathname();

  return (
      <nav className="h-16 w-full max-w-[480px] mx-auto px-4 flex items-center justify-around bg-white border-t border-slate-200">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
              <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors ${
                      isActive ? 'text-[#2B4BFF]' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                <Icon
                    weight={isActive ? "fill" : "regular"}
                    className="w-6 h-6"
                />
                <span className={`text-[10px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
              {item.name}
            </span>
              </Link>
          );
        })}
      </nav>
  );
}