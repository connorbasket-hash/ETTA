'use client';

import { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/', label: 'Review Entries' },
  { href: '/keywords', label: 'Keyword Builder' },
  { href: '/routes', label: 'Routes' },
  { href: '/metrics', label: 'Metrics' },
] as const;

export const NavTabs = memo(function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="bg-slate-200 text-slate-600 inline-flex h-14 w-fit items-center justify-center rounded-full p-1.5 gap-2 mb-8">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={true}
            className={cn(
              "inline-flex h-11 w-40 items-center justify-center gap-1.5 rounded-full px-6 py-2.5 text-base font-medium whitespace-nowrap transition-all duration-150",
              isActive
                ? "bg-white text-slate-900"
                : "hover:bg-white/50 hover:text-slate-900"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
});
