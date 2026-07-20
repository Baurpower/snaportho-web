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
  GraduationCap,
  Layers3,
  LibraryBig,
  Loader2,
  Search,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import type { LiteratureReviewEvaluation, LiteratureReviewEvaluationInputs } from '@/lib/brobot/research/literature-review';

const card = 'rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)]';
const field = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';

const framework = [
  { number: '01', title: 'Search Broadly', question: 'Where should you look?', body: 'Search more than one source because database coverage and indexing differ. Combine PubMed, Google Scholar, Cochrane, reference lists, and conference proceedings when appropriate to reduce blind spots.', detail: 'Multiple databases make it less likely that terminology, indexing, or publication type hides an important study.' },
  { number: '02', title: 'Critically Evaluate', question: 'How much weight does each study deserve?', body: 'Finding a paper is only the beginning. Examine study design, sample size, bias, follow-up, generalizability, and level of evidence before allowing a result to shape the argument.', detail: 'Published does not mean equally reliable. Strong synthesis reflects evidence quality, not just study count.' },
  { number: '03', title: 'Identify the Knowledge Gap', question: 'What remains worth answering?', body: 'Ask what has been answered, where uncertainty remains, why studies disagree, and which clinically meaningful problem still needs solving.', detail: 'This is where publishable ideas are born: at the boundary between credible evidence and consequential uncertainty.' },
  { number: '04', title: 'Organize the Evidence', question: 'What scientific story does the literature tell?', body: 'Group findings into themes, agreements, disagreements, and methodological patterns. Synthesize across papers instead of devoting one paragraph to every article.', detail: 'The goal is to build an argument—not an annotated bibliography.' },
];

const pitfalls = [
  ['Reading only abstracts', 'Methods, bias, outcome definitions, and important limitations remain hidden.'],
  ['Searching only PubMed', 'No single database captures every relevant journal, specialty, or publication type.'],
  ['Summarizing papers one-by-one', 'Individual summaries obscure the patterns and disagreements that create the scientific narrative.'],
  ['Ignoring conflicting evidence', 'Disagreement is often where the most valuable research questions emerge.'],
  ['Missing recent publications', 'An outdated search can make a project appear novel when the question has already been answered.'],
  ['Confusing quantity with quality', 'Ten weak studies should not automatically outweigh one rigorous, directly relevant study.'],
  ['Collecting data before confirming novelty', 'Months of work can be lost on a question that is settled or unlikely to be publishable.'],
];

const emptyEvaluation: LiteratureReviewEvaluationInputs = { literatureReview: '', researchQuestion: '', targetJournal: '', manuscriptTitle: '', abstract: '', additionalContext: '' };

export default function LiteratureReviewWorkspace() {
  const [form, setForm] = useState<LiteratureReviewEvaluationInputs>(emptyEvaluation);
  const [analysis, setAnalysis] = useState<LiteratureReviewEvaluation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function update(key: keyof LiteratureReviewEvaluationInputs, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function evaluate() {
    setBusy(true); setError(''); setAnalysis(null);
    try {
      const response = await fetch('/api/research/literature/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'BroBot could not complete the evaluation.');
      setAnalysis(data as LiteratureReviewEvaluation);
      window.setTimeout(() => document.getElementById('evaluation-results')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'BroBot could not complete the evaluation.');
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#f8faf9] text-slate-950">
    <section className="relative overflow-hidden bg-white px-6 py-20 sm:py-28">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(13,148,136,.10),transparent_32%),radial-gradient(circle_at_10%_85%,rgba(59,130,246,.06),transparent_28%)]" />
      <div className="relative mx-auto max-w-5xl">
        <Link href="/research/playbook" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Research Playbook</Link>
        <p className="mt-14 text-xs font-bold uppercase tracking-[.2em] text-teal-700">Literature Review · Mini masterclass</p>
        <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-[-.045em] sm:text-6xl lg:text-7xl">Literature Review</h1>
        <div className="mt-8 max-w-3xl space-y-5 text-lg leading-8 text-slate-600"><p>A high-quality literature review is the foundation of every successful research project. It determines whether your question is truly novel, clinically relevant, and worth pursuing.</p><p>A thoughtful review saves time, prevents duplication, and provides the scientific foundation for every section that follows.</p></div>
        <div className="mt-10 max-w-3xl rounded-2xl border border-teal-100 bg-teal-50/70 p-6 sm:p-7"><p className="text-lg font-semibold text-teal-950">A great literature review is not about finding the most papers.</p><p className="mt-2 leading-7 text-teal-900/80">It is about finding the right evidence and using it to tell a convincing scientific story.</p></div>
        <a href="#framework" className="mt-10 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Learn the framework <ArrowDown className="h-4 w-4" /></a>
      </div>
    </section>

    <LessonSection id="framework" eyebrow="The core framework" title="Four steps from search to scientific argument." description="An effective review is a sequence of judgments: where to search, which evidence to trust, what remains unknown, and how the findings fit together.">
      <div className="grid gap-5 md:grid-cols-2">{framework.map((step) => <article key={step.number} className={`${card} p-7 sm:p-8`}><div className="flex items-center justify-between"><span className="text-sm font-bold text-teal-700">STEP {step.number}</span><ArrowRight className="h-4 w-4 text-slate-300" /></div><h3 className="mt-6 text-2xl font-semibold tracking-tight">{step.title}</h3><p className="mt-2 text-sm font-semibold text-teal-700">{step.question}</p><p className="mt-4 leading-7 text-slate-600">{step.body}</p><p className="mt-5 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-500">{step.detail}</p></article>)}</div>
    </LessonSection>

    <LessonSection muted eyebrow="Research judgment" title="Decide whether the project deserves to move forward." description="The best literature review may reveal that a proposed project should change—or should not be pursued at all. That is a successful review, not a failed idea.">
      <div className={`${card} overflow-hidden`}><div className="grid lg:grid-cols-[.8fr_1.2fr]"><div className="bg-slate-950 p-8 text-white sm:p-10"><GraduationCap className="h-10 w-10 text-teal-300" /><h3 className="mt-7 text-2xl font-semibold">The highest-value decision often happens before data collection.</h3><p className="mt-4 leading-7 text-slate-300">Experienced researchers test novelty, feasibility, and clinical meaning before committing resources to a study.</p></div><div className="grid gap-4 p-8 sm:grid-cols-2 sm:p-10">{[['Coverage','Did we search broadly enough?'],['Quality','Which findings deserve the most weight?'],['Uncertainty','Where does the evidence remain unsettled?'],['Opportunity','Would answering the gap change knowledge or care?']].map(([title, body]) => <div key={title} className="rounded-xl bg-slate-50 p-5"><CheckCircle2 className="h-5 w-5 text-teal-700" /><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></div>)}</div></div></div>
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-7 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-800">Research tip</p><p className="mt-3 text-lg font-semibold leading-8 text-amber-950">Experienced researchers often spend more time deciding whether a project is worth pursuing than actually collecting data.</p><p className="mt-3 leading-7 text-amber-900/80">Several extra hours spent on a thorough literature review can save weeks—or months—of work on a project that has already been answered or is unlikely to be publishable.</p></div>
    </LessonSection>

    <LessonSection eyebrow="Common pitfalls" title="Recognize what weakens a literature review." description="Most weak reviews fail because the search is narrow, evidence is treated equally, or the writing never advances beyond summary.">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{pitfalls.map(([title, body]) => <article key={title} className="rounded-2xl border border-rose-100 bg-white p-6"><X className="h-5 w-5 text-rose-600" /><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></article>)}</div>
    </LessonSection>

    <section id="evaluate" className="scroll-mt-8 border-t border-slate-200 bg-[#f1f5f3] px-6 py-20 sm:py-28"><div className="mx-auto max-w-5xl">
      <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">Capstone exercise</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.03em] sm:text-5xl">Evaluate with BroBot</h2><p className="mt-5 text-lg leading-8 text-slate-600">Apply the framework to your current review. BroBot acts as an experienced research mentor—testing completeness, scientific narrative, evidence appraisal, and the credibility of your proposed gap.</p></div>
      <div className={`${card} mt-10 p-6 sm:p-10`}><div className="flex items-start gap-4 border-b border-slate-100 pb-7"><span className="rounded-xl bg-teal-50 p-3 text-teal-700"><LibraryBig className="h-6 w-6" /></span><div><h3 className="text-xl font-semibold">Literature review workspace</h3><p className="mt-1 text-sm leading-6 text-slate-500">Only your review is required. Additional context helps BroBot evaluate scope and manuscript alignment.</p></div></div>
        <div className="mt-8 space-y-7"><TextArea label="Literature Review" required value={form.literatureReview} onChange={(value) => update('literatureReview', value)} placeholder="Paste your current literature review, summary, or notes." rows={14} help={`${wordCount(form.literatureReview)} words`} /><TextArea label="Research Question" optional value={form.researchQuestion} onChange={(value) => update('researchQuestion', value)} placeholder="Provide your clinical question or hypothesis." rows={3} /><div className="grid gap-6 md:grid-cols-2"><Field label="Target Journal" optional value={form.targetJournal} onChange={(value) => update('targetJournal', value)} placeholder="e.g., JBJS, JAAOS, CORR, Spine" /><Field label="Manuscript Title" optional value={form.manuscriptTitle} onChange={(value) => update('manuscriptTitle', value)} placeholder="Provide context for the reviewer" /></div><TextArea label="Abstract" optional value={form.abstract} onChange={(value) => update('abstract', value)} placeholder="Paste the abstract to assess study-rationale alignment." rows={6} /><TextArea label="Additional Context" optional value={form.additionalContext} onChange={(value) => update('additionalContext', value)} placeholder="Study design, desired scope, inclusion criteria, search strategy, reviewer concerns, PRISMA intent, or word limit." rows={5} /></div>
        {error ? <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div> : null}
        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-slate-100 pt-7 sm:flex-row sm:items-center"><p className="max-w-lg text-xs leading-5 text-slate-500">BroBot can flag likely evidence gaps but cannot verify search completeness without a reproducible search and source set.</p><button type="button" onClick={evaluate} disabled={busy || form.literatureReview.trim().length < 80} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{busy ? 'Evaluating…' : 'Evaluate with BroBot'}</button></div>
      </div>
      {analysis ? <EvaluationResults analysis={analysis} /> : null}
    </div></section>
  </main>;
}

function LessonSection({ id, eyebrow, title, description, children, muted = false }: { id?: string; eyebrow: string; title: string; description: string; children: React.ReactNode; muted?: boolean }) { return <section id={id} className={`scroll-mt-8 border-t border-slate-200/70 px-6 py-20 sm:py-24 ${muted ? 'bg-slate-50' : 'bg-white'}`}><div className="mx-auto max-w-6xl"><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">{eyebrow}</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.03em] sm:text-4xl">{title}</h2><p className="mt-4 text-lg leading-8 text-slate-600">{description}</p></div><div className="mt-10">{children}</div></div></section>; }
function Field({ label, value, onChange, placeholder, optional = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; optional?: boolean }) { return <label className="block text-sm font-semibold text-slate-900">{label}{optional ? <span className="ml-2 font-normal text-slate-400">Optional</span> : null}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={field} /></label>; }
function TextArea({ label, value, onChange, placeholder, rows, required = false, optional = false, help }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; rows: number; required?: boolean; optional?: boolean; help?: string }) { return <label className="block text-sm font-semibold text-slate-900">{label}{required ? <span className="ml-1 text-rose-600">*</span> : null}{optional ? <span className="ml-2 font-normal text-slate-400">Optional</span> : null}<textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className={`${field} resize-y leading-7`} />{help ? <span className="mt-2 block text-xs font-normal text-slate-400">{help}</span> : null}</label>; }
function wordCount(value: string) { return value.trim() ? value.trim().split(/\s+/).length : 0; }

function EvaluationResults({ analysis }: { analysis: LiteratureReviewEvaluation }) {
  const dimensions = [['Completeness', analysis.completeness, Search], ['Scientific Narrative', analysis.scientificNarrative, Layers3], ['Knowledge Gap', analysis.knowledgeGap, Target], ['Critical Appraisal', analysis.criticalAppraisal, CircleGauge], ['Journal Fit', analysis.journalFit, BookOpenCheck]] as const;
  return <div id="evaluation-results" className="scroll-mt-8 mt-10 space-y-5"><section className={`${card} p-7 sm:p-9`}><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-700">Overall impression</p><h2 className="mt-3 text-2xl font-semibold">{analysis.overallImpression.verdict}</h2><p className="mt-4 leading-7 text-slate-600">{analysis.overallImpression.assessment}</p></div><div className="shrink-0 rounded-2xl bg-slate-950 px-6 py-5 text-center text-white"><strong className="text-4xl">{analysis.overallScore}</strong><span className="text-slate-400">/100</span><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Reviewer confidence</p></div></div></section><div className="grid gap-5 md:grid-cols-2">{dimensions.map(([title, dimension, Icon]) => <section key={title} className={`${card} p-7`}><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-teal-700" /><span className="text-sm font-bold text-teal-700">{dimension.score}/100</span></div><h3 className="mt-5 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{dimension.assessment}</p>{dimension.recommendations.length ? <ul className="mt-5 space-y-2 text-sm text-slate-600">{dimension.recommendations.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />{item}</li>)}</ul> : null}</section>)}</div>{analysis.evidenceLimitations.length ? <section className={`${card} p-7`}><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-700">Limits of this evaluation</p><ul className="mt-4 space-y-2 text-sm text-slate-600">{analysis.evidenceLimitations.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}<section className={`${card} p-7 sm:p-9`}><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-700">Actionable recommendations</p><h2 className="mt-3 text-2xl font-semibold">What to improve first</h2><div className="mt-7 grid gap-5 md:grid-cols-3"><Priority title="High Impact" tone="rose" items={analysis.revisionPriorities.highImpact} /><Priority title="Medium Impact" tone="amber" items={analysis.revisionPriorities.mediumImpact} /><Priority title="Minor Improvements" tone="slate" items={analysis.revisionPriorities.minorImprovements} /></div></section></div>;
}
function Priority({ title, tone, items }: { title: string; tone: 'rose' | 'amber' | 'slate'; items: string[] }) { const tones = { rose: 'bg-rose-50 text-rose-800', amber: 'bg-amber-50 text-amber-800', slate: 'bg-slate-50 text-slate-700' }; return <div className={`rounded-2xl p-5 ${tones[tone]}`}><h3 className="font-semibold">{title}</h3><ul className="mt-4 space-y-3 text-sm leading-6">{items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>No recommendations in this category.</li>}</ul></div>; }
