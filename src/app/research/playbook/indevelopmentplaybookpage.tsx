'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FlaskConical,
  BookOpen,
  ClipboardList,
  BarChart3,
  FileSearch,
  PencilRuler,
  Files,
  ArrowRight,
} from 'lucide-react';
import type React from 'react';

const COLORS = {
  bg: '#fbfaf7',                // warmer + “paper”
  text: '#1f2937',
  heading: '#2b2b2b',
  headingSub: '#313131',
  accent: '#3f6f67',            // green-teal (distinct from your Path to Ortho blue)
  accent2: '#7c5b86',           // optional secondary (used subtly)
  border: 'rgba(148,163,184,0.55)',
  card: '#ffffff',
  muted: '#6b7280',
} as const;

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-6 sm:px-8 lg:px-10">{children}</div>;
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="py-12 sm:py-16 lg:py-20">{children}</section>;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border shadow-sm ${className}`}
      style={{ borderColor: COLORS.border, background: COLORS.card }}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 md:p-7 ${className}`}>{children}</div>;
}

function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-base sm:text-lg font-semibold tracking-tight ${className}`} style={{ color: COLORS.headingSub }}>
      {children}
    </h3>
  );
}

function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-6 md:px-7 pb-6 md:pb-7 text-sm leading-relaxed ${className}`} style={{ color: '#4b5563' }}>
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: COLORS.muted }}>
      {children}
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6 sm:mb-8">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: COLORS.heading }}>
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 max-w-2xl leading-relaxed" style={{ color: '#4b5563' }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function Divider() {
  return (
    <div className="border-t" style={{ borderColor: 'rgba(148,163,184,0.35)' }}>
      <Container>
        <div className="h-0" />
      </Container>
    </div>
  );
}

function PillLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:bg-black/[0.03]"
      style={{ borderColor: COLORS.border, color: COLORS.headingSub }}
    >
      <span className="inline-flex items-center" style={{ color: COLORS.accent }}>
        {icon}
      </span>
      {label}
      <ArrowRight className="h-3.5 w-3.5 opacity-60" />
    </Link>
  );
}

export default function InDevelopmentPlaybookPage() {
  const title = 'Research Playbook'; // rename to any option you like
  const subtitle =
    'A practical, step-by-step system for turning an idea into a clean dataset, a strong manuscript, and a real submission.';

  return (
    <main className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
      {/* Background glow + subtle “paper” vibe */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute left-1/2 top-[-16%] h-[54vh] w-[86vw] -translate-x-1/2 rounded-[999px] blur-3xl"
          style={{ background: 'radial-gradient(ellipse at center, rgba(63,111,103,0.10), transparent 60%)' }}
        />
        <div
          className="absolute right-[-14%] bottom-[-18%] h-[42vh] w-[52vw] rounded-[999px] blur-3xl"
          style={{ background: 'radial-gradient(ellipse at center, rgba(124,91,134,0.06), transparent 60%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(31,41,55,0.6) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      {/* Hero */}
      <Section>
        <Container>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.45 }}
              >
                <Eyebrow>Research · start here</Eyebrow>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ color: COLORS.heading }}>
                  {title.split(' ')[0]}{' '}
                  <span style={{ color: COLORS.accent }}>{title.split(' ').slice(1).join(' ')}</span>
                </h1>
                <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: '#4b5563' }}>
                  {subtitle}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <PillLink href="/research/idea-to-irb" label="Idea → IRB" icon={<FlaskConical className="h-4 w-4" />} />
                  <PillLink href="/research/lit-review" label="Literature Review" icon={<BookOpen className="h-4 w-4" />} />
                  <PillLink href="/research/methods" label="Methods + Data" icon={<ClipboardList className="h-4 w-4" />} />
                  <PillLink href="/research/stats" label="Stats Basics" icon={<BarChart3 className="h-4 w-4" />} />
                </div>
              </motion.div>
            </div>

            {/* Quick Start card */}
            <div className="lg:col-span-5">
              <Card className="relative overflow-hidden">
                <div
                  className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(63,111,103,0.12), transparent 60%)' }}
                />
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5" style={{ color: COLORS.accent }} />
                    Quick Start (15 minutes)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ol className="space-y-3">
                    {[
                      { t: 'Pick your question', d: 'Use PICO and define your primary outcome.' },
                      { t: 'Decide study type', d: 'Case series, retrospective, SR/MA, database study, etc.' },
                      { t: 'Build the skeleton', d: 'Draft a 1-page protocol: methods, variables, analysis plan.' },
                      { t: 'Start the writing early', d: 'Create the manuscript file before your dataset is “perfect.”' },
                    ].map((x) => (
                      <li key={x.t} className="flex gap-3">
                        <span
                          className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold"
                          style={{ borderColor: COLORS.border, color: COLORS.accent }}
                        >
                          ✓
                        </span>
                        <div>
                          <div className="font-medium" style={{ color: COLORS.headingSub }}>
                            {x.t}
                          </div>
                          <div className="text-xs" style={{ color: COLORS.muted }}>
                            {x.d}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href="/research/quickstart"
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-black/[0.03]"
                      style={{ borderColor: COLORS.border, color: COLORS.headingSub }}
                    >
                      Open Quickstart
                      <ArrowRight className="h-4 w-4 opacity-60" />
                    </Link>
                    <span
                      className="inline-flex items-center rounded-xl border px-3 py-2 text-xs font-semibold"
                      style={{ borderColor: COLORS.border, color: COLORS.accent }}
                    >
                      Built for ortho projects
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </Section>

      <Divider />

      {/* Modules grid */}
      <Section>
        <Container>
          <SectionHeading
            title="Modules"
            subtitle="Work top-to-bottom if you’re new. Jump around if you’re mid-project."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                href: '/research/idea-to-irb',
                icon: <FlaskConical className="h-5 w-5" />,
                title: 'Module 1: Idea → Protocol',
                badge: 'Start',
                body: 'PICO, endpoints, feasibility checks, IRB basics, and a protocol template you can reuse.',
              },
              {
                href: '/research/lit-review',
                icon: <BookOpen className="h-5 w-5" />,
                title: 'Module 2: Literature Review',
                badge: 'Core',
                body: 'Search strategy, screening workflow, citation hygiene, and how to avoid “narrative mush.”',
              },
              {
                href: '/research/methods',
                icon: <ClipboardList className="h-5 w-5" />,
                title: 'Module 3: Methods + Data',
                badge: 'Core',
                body: 'Variable design, data dictionaries, cleaning, missingness, and reproducible exports.',
              },
              {
                href: '/research/stats',
                icon: <BarChart3 className="h-5 w-5" />,
                title: 'Module 4: Stats Basics',
                badge: 'Practical',
                body: 'Choosing tests, regression intuition, interpreting effect sizes, and common pitfalls.',
              },
              {
                href: '/research/writing',
                icon: <PencilRuler className="h-5 w-5" />,
                title: 'Module 5: Writing + Submission',
                badge: 'Finish',
                body: 'Manuscript structure, tables/figures, journal fit, cover letters, and revision strategy.',
              },
              {
                href: '/research/systematic-reviews',
                icon: <Files className="h-5 w-5" />,
                title: 'Module 6: Systematic Reviews',
                badge: 'Bonus',
                body: 'PRISMA flow, risk of bias, extraction templates, and how to keep scope under control.',
              },
            ].map((m) => (
              <Link key={m.href} href={m.href} className="block">
                <Card className="h-full transition-transform hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <span style={{ color: COLORS.accent }}>{m.icon}</span>
                      {m.title}
                      <span
                        className="ml-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ borderColor: COLORS.border, color: COLORS.accent }}
                      >
                        {m.badge}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">{m.body}</CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      <Divider />

      {/* Templates strip */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Templates"
            title="Copy, paste, and keep moving"
            subtitle="Lightweight assets that save hours and keep projects consistent."
          />

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                href: '/research/templates/protocol',
                title: '1-page Protocol Template',
                body: 'A minimal protocol that prevents scope creep and makes IRB easier.',
              },
              {
                href: '/research/templates/data-dictionary',
                title: 'Data Dictionary Template',
                body: 'Variable names, types, coding rules, and a “future you” sanity check.',
              },
              {
                href: '/research/templates/manuscript',
                title: 'Manuscript Skeleton',
                body: 'Pre-built headings + table shells so writing starts on day one.',
              },
            ].map((t) => (
              <Link key={t.href} href={t.href} className="block">
                <Card className="h-full transition-transform hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span>{t.title}</span>
                      <ArrowRight className="h-4 w-4 opacity-60" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm leading-relaxed">{t.body}</CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      <Divider />

      {/* About */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Philosophy" title="Simple, repeatable, and actually usable" />

          <Card className="relative overflow-hidden">
            <div
              className="pointer-events-none absolute -left-12 -bottom-12 h-56 w-56 rounded-full"
              style={{ background: 'radial-gradient(ellipse at center, rgba(124,91,134,0.10), transparent 60%)' }}
            />
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { k: 'Practical', v: 'Built for real ortho projects with real constraints.' },
                  { k: 'Reusable', v: 'Templates + workflows you can repeat every study.' },
                  { k: 'Clean', v: 'Consistent style, minimal clutter, fast to navigate.' },
                ].map((x) => (
                  <div key={x.k} className="rounded-xl border p-4" style={{ borderColor: COLORS.border }}>
                    <div className="font-medium" style={{ color: COLORS.headingSub }}>
                      {x.k}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: COLORS.muted }}>
                      {x.v}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Container>
      </Section>
    </main>
  );
}