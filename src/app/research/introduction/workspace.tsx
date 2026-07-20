'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleGauge,
  FileSearch,
  GraduationCap,
  Loader2,
  MessageSquareText,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import type { IntroductionReview, IntroductionReviewInputs } from '@/lib/brobot/research/introduction-writer';

const card = 'rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)]';
const field = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';

const framework = [
  { number: '01', title: 'Start Broad', question: 'Why should anyone care?', body: 'Introduce the clinical problem and establish its importance. Give readers enough context to understand the stakes without turning the opening into a textbook chapter.' },
  { number: '02', title: 'Narrow the Focus', question: 'What is already known?', body: 'Synthesize only the evidence that moves the argument forward. Experienced writers connect findings into a narrative instead of listing studies one at a time.' },
  { number: '03', title: 'Identify the Gap', question: 'What remains unanswered?', body: 'Show precisely why existing evidence is insufficient. This is the intellectual center of the introduction and the reason the study deserves to exist.' },
  { number: '04', title: 'Finish with the Objective', question: 'What will this study answer?', body: 'State the study aim clearly and make sure it follows naturally from the gap. No surprises, unnecessary methods, or claims about results.' },
];

const pitfalls = [
  ['Literature dump without a narrative', 'A list of citations demonstrates reading, but not reasoning.'],
  ['Starting too narrowly', 'Readers need the clinical stakes before they can value the specific question.'],
  ['No clearly defined knowledge gap', 'Without a credible unknown, another study feels unnecessary.'],
  ['Objective does not match the argument', 'The final aim must resolve the uncertainty the introduction establishes.'],
  ['Repeating the Discussion', 'Interpretation and implications belong later in the manuscript.'],
  ['Excessive length', 'Extra background dilutes the rationale and makes reviewers find the point themselves.'],
];

const emptyReview: IntroductionReviewInputs = { introduction: '', targetJournal: '', manuscriptTitle: '', abstract: '', additionalContext: '' };

export default function IntroductionWriterWorkspace() {
  const [form, setForm] = useState<IntroductionReviewInputs>(emptyReview);
  const [analysis, setAnalysis] = useState<IntroductionReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function update(key: keyof IntroductionReviewInputs, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function evaluate() {
    setBusy(true);
    setError('');
    setAnalysis(null);
    try {
      const response = await fetch('/api/research/introduction/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'BroBot could not complete the evaluation.');
      setAnalysis(data as IntroductionReview);
      window.setTimeout(() => document.getElementById('evaluation-results')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'BroBot could not complete the evaluation.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8faf9] text-slate-950">
      <section className="relative overflow-hidden bg-white px-6 py-20 sm:py-28">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(13,148,136,.10),transparent_32%),radial-gradient(circle_at_10%_85%,rgba(59,130,246,.06),transparent_28%)]" />
        <div className="relative mx-auto max-w-5xl">
          <Link href="/research/playbook" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Research Playbook</Link>
          <p className="mt-14 text-xs font-bold uppercase tracking-[.2em] text-teal-700">Introduction · Mini masterclass</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-[-.045em] sm:text-6xl lg:text-7xl">Writing a Great Introduction</h1>
          <div className="mt-8 max-w-3xl space-y-5 text-lg leading-8 text-slate-600">
            <p>A strong introduction is one of the highest-leverage skills a researcher can develop. Whether this is your first manuscript or your fiftieth, the goal is the same: guide the reader from a broad clinical problem to the specific gap your study addresses.</p>
            <p>A well-written introduction builds credibility, demonstrates command of the literature, and convinces reviewers that the study is relevant and necessary.</p>
            <p className="font-semibold text-slate-950">Every sentence should move the reader toward one question: Why did this study need to be performed?</p>
          </div>
          <div className="mt-10 max-w-3xl rounded-2xl border border-teal-100 bg-teal-50/70 p-6 sm:p-7">
            <p className="text-lg font-semibold text-teal-950">Writing great introductions is a learnable skill.</p>
            <p className="mt-2 leading-7 text-teal-900/80">It is not about sounding more academic—it is about communicating clearly and logically.</p>
          </div>
          <a href="#framework" className="mt-10 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Learn the framework <ArrowDown className="h-4 w-4" /></a>
        </div>
      </section>

      <LessonSection id="framework" eyebrow="The core framework" title="Four moves. One narrowing argument." description="Experienced researchers do not begin by filling sections. They build a sequence of ideas in which each paragraph earns the next.">
        <div className="grid gap-5 md:grid-cols-2">
          {framework.map((step) => <article key={step.number} className={`${card} p-7 sm:p-8`}><div className="flex items-center justify-between"><span className="text-sm font-bold text-teal-700">STEP {step.number}</span><ArrowRight className="h-4 w-4 text-slate-300" /></div><h3 className="mt-6 text-2xl font-semibold tracking-tight">{step.title}</h3><p className="mt-2 text-sm font-semibold text-teal-700">{step.question}</p><p className="mt-4 leading-7 text-slate-600">{step.body}</p></article>)}
        </div>
      </LessonSection>

      <LessonSection muted eyebrow="Reviewer mindset" title="The introduction is an argument, not a background section." description="A reviewer is deciding whether the question is important, whether you understand the field, and whether the study is the logical next step.">
        <div className={`${card} overflow-hidden`}>
          <div className="grid lg:grid-cols-[.8fr_1.2fr]">
            <div className="bg-slate-950 p-8 text-white sm:p-10"><GraduationCap className="h-10 w-10 text-teal-300" /><h3 className="mt-7 text-2xl font-semibold">What confidence sounds like</h3><p className="mt-4 leading-7 text-slate-300">The writer understands the clinical problem, has synthesized the right evidence, describes uncertainty honestly, and asks a question the study can actually answer.</p></div>
            <div className="grid gap-4 p-8 sm:grid-cols-2 sm:p-10">{[['Clinical importance','The problem has meaningful consequences.'],['Literature mastery','Evidence is synthesized, not displayed.'],['Gap credibility','The unknown is specific and defensible.'],['Objective alignment','The study directly addresses that unknown.']].map(([title, body]) => <div key={title} className="rounded-xl bg-slate-50 p-5"><CheckCircle2 className="h-5 w-5 text-teal-700" /><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></div>)}</div>
          </div>
        </div>
      </LessonSection>

      <LessonSection eyebrow="Common pitfalls" title="Recognize what weakens reviewer confidence." description="Most weak introductions fail because the reasoning is unclear—not because the prose is insufficiently academic.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{pitfalls.map(([title, body]) => <article key={title} className="rounded-2xl border border-rose-100 bg-white p-6"><X className="h-5 w-5 text-rose-600" /><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></article>)}</div>
      </LessonSection>

      <section id="evaluate" className="scroll-mt-8 border-t border-slate-200 bg-[#f1f5f3] px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">Capstone exercise</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.03em] sm:text-5xl">Evaluate with BroBot</h2><p className="mt-5 text-lg leading-8 text-slate-600">Apply the framework to your own writing. BroBot reviews your introduction like an experienced mentor—testing the argument, journal fit, clarity, and credibility rather than merely correcting grammar.</p></div>
          <div className={`${card} mt-10 p-6 sm:p-10`}>
            <div className="flex items-start gap-4 border-b border-slate-100 pb-7"><span className="rounded-xl bg-teal-50 p-3 text-teal-700"><FileSearch className="h-6 w-6" /></span><div><h3 className="text-xl font-semibold">Introduction review workspace</h3><p className="mt-1 text-sm leading-6 text-slate-500">Only your introduction is required. Context helps make the feedback more specific.</p></div></div>
            <div className="mt-8 space-y-7">
              <TextArea label="Introduction" required value={form.introduction} onChange={(value) => update('introduction', value)} placeholder="Paste your introduction here." rows={14} help={`${wordCount(form.introduction)} words`} />
              <div className="grid gap-6 md:grid-cols-2"><Field label="Target Journal" value={form.targetJournal} onChange={(value) => update('targetJournal', value)} placeholder="e.g., JBJS, JAAOS, CORR, Spine" /><Field label="Manuscript Title" optional value={form.manuscriptTitle} onChange={(value) => update('manuscriptTitle', value)} placeholder="Provide context for the reviewer" /></div>
              <TextArea label="Abstract" optional value={form.abstract} onChange={(value) => update('abstract', value)} placeholder="Paste the abstract to assess manuscript alignment." rows={6} />
              <TextArea label="Additional Context" optional value={form.additionalContext} onChange={(value) => update('additionalContext', value)} placeholder="Intended audience, study design, desired tone, word limit, reviewer concerns, or special instructions." rows={5} />
            </div>
            {error ? <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div> : null}
            <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-slate-100 pt-7 sm:flex-row sm:items-center"><p className="max-w-lg text-xs leading-5 text-slate-500">BroBot provides educational editorial feedback. Verify journal-specific requirements directly before submission.</p><button type="button" onClick={evaluate} disabled={busy || form.introduction.trim().length < 80} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{busy ? 'Evaluating…' : 'Evaluate with BroBot'}</button></div>
          </div>
          {analysis ? <EvaluationResults analysis={analysis} /> : null}
        </div>
      </section>
    </main>
  );
}

function LessonSection({ id, eyebrow, title, description, children, muted = false }: { id?: string; eyebrow: string; title: string; description: string; children: React.ReactNode; muted?: boolean }) {
  return <section id={id} className={`scroll-mt-8 border-t border-slate-200/70 px-6 py-20 sm:py-24 ${muted ? 'bg-slate-50' : 'bg-white'}`}><div className="mx-auto max-w-6xl"><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">{eyebrow}</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.03em] sm:text-4xl">{title}</h2><p className="mt-4 text-lg leading-8 text-slate-600">{description}</p></div><div className="mt-10">{children}</div></div></section>;
}

function Field({ label, value, onChange, placeholder, optional = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; optional?: boolean }) {
  return <label className="block text-sm font-semibold text-slate-900">{label}{optional ? <span className="ml-2 font-normal text-slate-400">Optional</span> : null}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={field} /></label>;
}

function TextArea({ label, value, onChange, placeholder, rows, required = false, optional = false, help }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; rows: number; required?: boolean; optional?: boolean; help?: string }) {
  return <label className="block text-sm font-semibold text-slate-900">{label}{required ? <span className="ml-1 text-rose-600">*</span> : null}{optional ? <span className="ml-2 font-normal text-slate-400">Optional</span> : null}<textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className={`${field} resize-y leading-7`} />{help ? <span className="mt-2 block text-xs font-normal text-slate-400">{help}</span> : null}</label>;
}

function wordCount(value: string) { return value.trim() ? value.trim().split(/\s+/).length : 0; }

function EvaluationResults({ analysis }: { analysis: IntroductionReview }) {
  const dimensions = [
    ['Narrative Flow', analysis.narrativeFlow, MessageSquareText],
    ['Knowledge Gap', analysis.knowledgeGap, FileSearch],
    ['Study Objective', analysis.studyObjective, Target],
    ['Journal Fit', analysis.journalFit, BookOpenCheck],
    ['Clarity & Conciseness', analysis.clarityConciseness, CircleGauge],
    ['Credibility', analysis.credibility, GraduationCap],
  ] as const;
  return <div id="evaluation-results" className="scroll-mt-8 mt-10 space-y-5"><section className={`${card} p-7 sm:p-9`}><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-700">Overall impression</p><h2 className="mt-3 text-2xl font-semibold">{analysis.overallImpression.verdict}</h2><p className="mt-4 leading-7 text-slate-600">{analysis.overallImpression.assessment}</p></div><div className="shrink-0 rounded-2xl bg-slate-950 px-6 py-5 text-center text-white"><strong className="text-4xl">{analysis.overallScore}</strong><span className="text-slate-400">/100</span><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Reviewer confidence</p></div></div></section><div className="grid gap-5 md:grid-cols-2">{dimensions.map(([title, dimension, Icon]) => <section key={title} className={`${card} p-7`}><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-teal-700" /><span className="text-sm font-bold text-teal-700">{dimension.score}/100</span></div><h3 className="mt-5 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{dimension.assessment}</p>{dimension.recommendations.length ? <ul className="mt-5 space-y-2 text-sm text-slate-600">{dimension.recommendations.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />{item}</li>)}</ul> : null}</section>)}</div><section className={`${card} p-7 sm:p-9`}><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-700">Actionable revisions</p><h2 className="mt-3 text-2xl font-semibold">What to improve first</h2><div className="mt-7 grid gap-5 md:grid-cols-3"><Priority title="High Impact" tone="rose" items={analysis.revisionPriorities.highImpact} /><Priority title="Medium Impact" tone="amber" items={analysis.revisionPriorities.mediumImpact} /><Priority title="Minor Edits" tone="slate" items={analysis.revisionPriorities.minorEdits} /></div></section></div>;
}

function Priority({ title, tone, items }: { title: string; tone: 'rose' | 'amber' | 'slate'; items: string[] }) {
  const tones = { rose: 'bg-rose-50 text-rose-800', amber: 'bg-amber-50 text-amber-800', slate: 'bg-slate-50 text-slate-700' };
  return <div className={`rounded-2xl p-5 ${tones[tone]}`}><h3 className="font-semibold">{title}</h3><ul className="mt-4 space-y-3 text-sm leading-6">{items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>No revisions in this category.</li>}</ul></div>;
}
