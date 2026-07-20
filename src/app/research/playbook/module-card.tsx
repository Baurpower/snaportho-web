import Link from 'next/link';
import { ArrowRight, Clock3, Gauge } from 'lucide-react';
import type { PlaybookModule } from './playbook-modules';

const statusStyles = {
  ready: { label: 'Ready', badge: 'bg-teal-50 text-teal-700 ring-teal-600/15', icon: 'bg-teal-50 text-teal-700', cta: 'Start Module' },
  'in-progress': { label: 'In Progress', badge: 'bg-amber-50 text-amber-700 ring-amber-600/15', icon: 'bg-amber-50 text-amber-700', cta: 'Continue' },
  'coming-soon': { label: 'Coming Soon', badge: 'bg-slate-100 text-slate-600 ring-slate-500/15', icon: 'bg-slate-100 text-slate-500', cta: 'Preview Module' },
} as const;

export function ModuleCard({ module, onComingSoon }: { module: PlaybookModule; onComingSoon: (module: PlaybookModule) => void }) {
  const style = statusStyles[module.status];
  const Icon = module.icon;
  const content = (
    <>
      <div className="flex items-start justify-between gap-5">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.icon}`}><Icon aria-hidden="true" className="h-6 w-6" /></span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${style.badge}`}>{style.label}</span>
      </div>
      <div className="mt-6 flex-1">
        <h3 className="text-xl font-semibold tracking-[-0.02em] text-slate-950">{module.title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{module.description}</p>
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-5 text-xs font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />{module.duration}</span>
        <span className="inline-flex items-center gap-1.5"><Gauge aria-hidden="true" className="h-3.5 w-3.5" />{module.difficulty}</span>
      </div>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">{style.cta}<ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
    </>
  );
  const classes = "group flex min-h-[330px] w-full flex-col rounded-[1.5rem] border border-slate-200/80 bg-white p-6 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-4 sm:p-7";

  return module.status === 'coming-soon' ? (
    <button type="button" className={classes} onClick={() => onComingSoon(module)} aria-haspopup="dialog">{content}</button>
  ) : (
    <Link href={module.route} className={classes}>{content}</Link>
  );
}
