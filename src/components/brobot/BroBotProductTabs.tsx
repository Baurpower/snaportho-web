'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  {
    label: 'CasePrep',
    href: '/brobot',
    description: 'Structured case prep',
  },
  {
    label: 'Chat',
    href: '/brobot/chat',
    description: 'Open-ended ortho help',
  },
];

export default function BroBotProductTabs({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  return (
    <div
      className={`inline-flex rounded-full border border-slate-200 bg-white shadow-sm ${
        compact ? 'p-0.5' : 'p-1'
      }`}
    >
      {tabs.map((tab) => {
        const isActive =
          tab.href === '/brobot'
            ? pathname === '/brobot'
            : pathname?.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={[
              compact
                ? 'rounded-full px-3 py-1.5 text-xs font-semibold transition'
                : 'rounded-full px-4 py-2 text-sm font-semibold transition',
              isActive
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            ].join(' ')}
            title={tab.description}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
