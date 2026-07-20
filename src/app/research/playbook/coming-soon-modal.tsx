'use client';

import { useEffect, useRef } from 'react';
import { Construction, X } from 'lucide-react';
import type { PlaybookModule } from './playbook-modules';

export function ComingSoonModal({ module, onClose }: { module: PlaybookModule | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!module) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previousFocus?.focus();
    };
  }, [module, onClose]);

  if (!module) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="coming-soon-title" aria-describedby="coming-soon-description" className="w-full max-w-lg rounded-[1.75rem] border border-white/60 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><Construction aria-hidden="true" className="h-6 w-6" /></span>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close dialog" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"><X aria-hidden="true" className="h-5 w-5" /></button>
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Module in development</p>
        <h2 id="coming-soon-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{module.title}</h2>
        <p id="coming-soon-description" className="mt-3 leading-7 text-slate-600">{module.comingSoonMessage}</p>
        <div className="mt-6 rounded-2xl bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Future topics include</p>
          <ul className="mt-3 space-y-2.5 text-sm text-slate-600">{module.expectedTopics.map((topic) => <li key={topic} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />{topic}</li>)}</ul>
        </div>
        <p className="mt-5 text-sm text-slate-500">This module will become available in a future update.</p>
        <button type="button" onClick={onClose} className="mt-7 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">Back</button>
      </div>
    </div>
  );
}
