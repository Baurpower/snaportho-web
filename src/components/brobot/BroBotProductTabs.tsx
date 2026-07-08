'use client';

import { usePathname, useRouter } from 'next/navigation';
import { broBotProductTabs, isBroBotProductTabActive } from './BroBotProductTabs.config';

export default function BroBotProductTabs({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      role="group"
      aria-label="BroBot mode"
      className={`inline-flex rounded-full border border-slate-200 bg-white shadow-sm ${
        compact ? 'p-0.5' : 'p-1'
      }`}
    >
      {broBotProductTabs.map((tab) => {
        const isActive = isBroBotProductTabActive(pathname, tab);

        return (
          <button
            key={tab.href}
            type="button"
            onClick={() => {
              if (!isActive) {
                router.push(tab.href);
              }
            }}
            aria-current={isActive ? 'page' : undefined}
            aria-pressed={isActive}
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
          </button>
        );
      })}
    </div>
  );
}
