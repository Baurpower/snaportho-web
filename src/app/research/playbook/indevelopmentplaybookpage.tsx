'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Compass, Lightbulb, PlayCircle } from 'lucide-react';
import { ComingSoonModal } from './coming-soon-modal';
import { ModuleCard } from './module-card';
import { playbookModules, type PlaybookModule } from './playbook-modules';

export default function InDevelopmentPlaybookPage() {
  const [selectedModule, setSelectedModule] = useState<PlaybookModule | null>(null);
  const closeModal = useCallback(() => setSelectedModule(null), []);
  const ideaModule = playbookModules[0];
  const currentModule = playbookModules.find((module) => module.status === 'in-progress');

  return (
    <main className="min-h-screen bg-[#f8faf9] text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_75%_10%,rgba(13,148,136,0.09),transparent_30%),radial-gradient(circle_at_15%_90%,rgba(59,130,246,0.06),transparent_28%)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28 lg:px-10 lg:py-32">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">SnapOrtho Learning</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">Research Playbook</h1>
          <p className="mt-7 max-w-2xl text-xl font-medium leading-8 text-slate-700">Learn how experienced researchers take an idea from concept to publication.</p>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">Master literature reviews, manuscript writing, statistics, study design, and publication strategies through practical step-by-step modules.</p>
          <div className="mt-10 flex max-w-md items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="relative h-11 w-11 rounded-full border-[3px] border-slate-200"><span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-500">0%</span></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Overall progress</p><p className="mt-1 text-sm font-semibold text-slate-900">0 / 6 modules complete</p></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20 lg:px-10" aria-labelledby="getting-started-heading">
        <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Choose your path</p><h2 id="getting-started-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Getting started</h2><p className="mt-4 leading-7 text-slate-600">Begin at the start, pick up where you left off, or explore the full curriculum.</p></div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          <button type="button" onClick={() => setSelectedModule(ideaModule)} className="group rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"><Lightbulb aria-hidden="true" className="h-5 w-5 text-teal-700" /><h3 className="mt-5 font-semibold">New Research Project</h3><p className="mt-2 text-sm leading-6 text-slate-600">Learn how to build a project from scratch.</p><span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">Start <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></button>
          {currentModule ? <Link href={currentModule.route} className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"><PlayCircle aria-hidden="true" className="h-5 w-5 text-amber-600" /><h3 className="mt-5 font-semibold">Continue Learning</h3><p className="mt-2 text-sm leading-6 text-slate-600">Resume {currentModule.title}.</p><span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link> : null}
          <Link href="#learning-modules" className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"><Compass aria-hidden="true" className="h-5 w-5 text-blue-700" /><h3 className="mt-5 font-semibold">Browse Modules</h3><p className="mt-2 text-sm leading-6 text-slate-600">Jump into any topic in the curriculum.</p><span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>
        </div>
      </section>

      <section id="learning-modules" className="scroll-mt-8 border-t border-slate-200/70 bg-white" aria-labelledby="modules-heading">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-24 lg:px-10">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">The curriculum</p><h2 id="modules-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Learning modules</h2><p className="mt-4 leading-7 text-slate-600">Follow the research process in order or focus on what your project needs today.</p></div><div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500"><BookOpen aria-hidden="true" className="h-4 w-4" />6 focused lessons</div></div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">{playbookModules.map((module) => <ModuleCard key={module.id} module={module} onComingSoon={setSelectedModule} />)}</div>
        </div>
      </section>
      <ComingSoonModal module={selectedModule} onClose={closeModal} />
    </main>
  );
}
