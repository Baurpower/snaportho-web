'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  FileText,
  Timer,
  Presentation,
  Users,
  Wrench,
  ShieldAlert,
} from 'lucide-react';
import type React from 'react';

const COLORS = {
  bg: '#f9f7f4',
  text: '#1f2937',
  heading: '#444444',
  headingSub: '#333333',
  accent: '#597498',
  border: 'rgba(148,163,184,0.6)',
} as const;

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-6 sm:px-8 lg:px-10">{children}</div>;
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="py-6 sm:py-10 lg:py-12">{children}</section>;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm" style={{ borderColor: COLORS.border }}>
      {children}
    </div>
  );
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="p-6 pb-3">{children}</div>;
}

function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3
      className={`text-base sm:text-lg font-semibold tracking-tight ${className}`}
      style={{ color: COLORS.headingSub }}
    >
      {children}
    </h3>
  );
}

function CardContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 pb-6 text-sm leading-relaxed" style={{ color: '#4b5563' }}>
      {children}
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: COLORS.heading }}>
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 max-w-2xl" style={{ color: '#4b5563' }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function Callout({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white/70 p-5" style={{ borderColor: COLORS.border }}>
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.headingSub }}>
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white"
          style={{ borderColor: COLORS.border }}
        >
          {icon}
        </span>
        {title}
      </div>
      <div className="mt-3 text-sm leading-relaxed" style={{ color: '#4b5563' }}>
        {children}
      </div>
    </div>
  );
}

export default function ImgPortfolioPage() {
  return (
    <main className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
      {/* Hero (same style as Step 1/2) */}
      <Section>
        <Container>
          <div
            className="relative overflow-hidden rounded-3xl border bg-white/60 px-6 py-8 sm:px-10 sm:py-10"
            style={{ borderColor: COLORS.border }}
          >
            {/* soft glow */}
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl"
              style={{ background: 'radial-gradient(ellipse at center, rgba(89,116,152,0.18), transparent 60%)' }}
            />
            <div
              className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full blur-3xl"
              style={{ background: 'radial-gradient(ellipse at center, rgba(89,116,152,0.12), transparent 60%)' }}
            />

            <div className="relative">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase"
                  style={{ borderColor: COLORS.border, color: '#6b7280', background: 'rgba(255,255,255,0.7)' }}
                >
                  IMG Path to Ortho
                </span>

                <span className="text-xs" style={{ color: '#9ca3af' }}>
                  Step 3 of 7
                </span>
              </div>

              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-3xl sm:text-5xl font-bold tracking-tight"
                style={{ color: COLORS.heading }}
              >
                Step 3: Build a <span style={{ color: COLORS.accent }}>VERY strong CV</span>
              </motion.h1>

              <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed" style={{ color: '#4b5563' }}>
                For IMGs, orthopaedics is an uphill battle. Your CV has to do more than look “good” — it has to prove you
                can perform at a U.S. resident level, contribute meaningfully to orthopaedic teams, and bring value on day
                one.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Quality &gt; quantity
                </span>
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Build a pipeline
                </span>
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Be reliable, not flashy
                </span>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/imgpathtoortho/exams"
                  className="text-sm font-semibold underline underline-offset-4"
                  style={{ color: COLORS.accent }}
                >
                  ← Back to Step 2 (Exams)
                </Link>

                <Link
                  href="/imgpathtoortho"
                  className="text-sm font-semibold underline underline-offset-4"
                  style={{ color: COLORS.accent }}
                >
                  Back to IMG Start Here
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Reality check */}
      <Section>
        <Container>
          <SectionHeading
            title="The reality check (so you don’t waste time)"
            subtitle="This is not meant to discourage you. It’s meant to help you build the strongest version of your application."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<ShieldAlert className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Why CV strength matters more for IMGs">
              Many programs receive hundreds of strong U.S. applications. An IMG CV often needs extra “proof” to overcome
              uncertainty about training systems, letters, and clinical exposure. Your goal is to make the decision easy:
              <strong> this person is excellent, productive, and safe to train.</strong>
            </Callout>

            <Callout icon={<CheckCircle2 className="h-5 w-5" style={{ color: COLORS.accent }} />} title="What “strong” actually means">
              Strong doesn’t mean “a long list.” It means <strong>credible output, recognizable venues, and clear contribution</strong>.
              A smaller number of high-quality projects beats a large number of weak ones every time.
            </Callout>
          </div>
        </Container>
      </Section>

      {/* 1. Publications */}
      <Section>
        <Container>
          <SectionHeading
            title="1. Publications"
            subtitle="Aim for credible work that signals you can think, write, and finish projects."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" style={{ color: COLORS.accent }} />
                  What types count (and how they’re viewed)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li>• <strong>Original clinical research:</strong> Highest signal when well-designed and well-written.</li>
                  <li>• <strong>Systematic reviews / meta-analyses:</strong> Strong if done properly (clear methods, quality assessment, real question).</li>
                  <li>• <strong>Case series:</strong> Can help if meaningful, rare, or tied to a strong institution/team.</li>
                  <li>• <strong>Avoid:</strong> low-quality “pay to publish” outlets and projects with unclear rigor.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Choose projects strategically
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3">
                  Your time is limited. Choose projects that balance <strong>impact</strong> and <strong>feasibility</strong>.
                </p>
                <ul className="space-y-2">
                  <li>• High-impact question + realistic dataset + mentor who publishes</li>
                  <li>• Clear authorship expectations from day 1</li>
                  <li>• Projects that can become: <strong>abstract → poster → manuscript</strong></li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" style={{ color: COLORS.accent }} />
                  The pipeline mindset
                </CardTitle>
              </CardHeader>
              <CardContent>
                Don’t chase one “perfect” paper. Build a pipeline where you’re always working on 2–4 things at different
                stages: data extraction, analysis, abstract submission, manuscript writing, revisions.
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* 2. Presentations */}
      <Section>
        <Container>
          <SectionHeading
            title="2. Presentations"
            subtitle="Recognized meetings help because they are visible, time-stamped, and often lead to publications."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<Presentation className="h-5 w-5" style={{ color: COLORS.accent }} />} title="What counts">
              Posters and podium presentations at reputable regional or national meetings are strong CV signals — especially
              if they convert into manuscripts.
            </Callout>

            <Callout icon={<Timer className="h-5 w-5" style={{ color: COLORS.accent }} />} title="How to build a presentation pipeline">
              Target abstract deadlines early. Use presentations as a forcing function: submit abstracts, present, then
              turn the same work into a full manuscript quickly.
            </Callout>
          </div>
        </Container>
      </Section>

      {/* 3. Teaching & leadership */}
      <Section>
        <Container>
          <SectionHeading
            title="3. Teaching & leadership"
            subtitle="Programs want residents who elevate the people around them."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Teaching that signals credibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li>• Formal teaching roles (tutoring, TA roles, skills labs)</li>
                  <li>• Mentorship of junior students (with real structure and outcomes)</li>
                  <li>• Content creation only if it’s high-quality and consistent (not random posts)</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Leadership that matters
                </CardTitle>
              </CardHeader>
              <CardContent>
                Leadership should show maturity, teamwork, and responsibility:
                <ul className="mt-3 space-y-2">
                  <li>• Leading research teams or coordinating multi-author projects</li>
                  <li>• Organizing teaching efforts or academic groups</li>
                  <li>• Roles where you were accountable for deliverables</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* 4. Skills that make you valuable */}
      <Section>
        <Container>
          <SectionHeading
            title="4. Skills that make you valuable"
            subtitle="You don’t need to be a genius. You need to be the person teams can count on."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<Wrench className="h-5 w-5" style={{ color: COLORS.accent }} />} title="High-yield technical skills">
              Stats basics, REDCap, data extraction, study design, literature searching, and clean writing are the skills
              that make mentors want to keep working with you.
            </Callout>

            <Callout icon={<CheckCircle2 className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Reliability beats brilliance">
              People remember who shows up, meets deadlines, communicates clearly, and finishes the project. Those traits
              turn into strong letters and real advocacy — the currency IMGs need most.
            </Callout>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Quick checklist: are you building the right CV?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {[
                    'At least one project with a credible mentor who publishes',
                    'A pipeline (not a single one-off paper)',
                    'Abstracts targeted to recognized meetings',
                    'Clear authorship expectations before you start',
                    'Evidence you can write and finish (not just “helped”)',
                    'Skills that make you useful on day one (REDCap, stats, writing)',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: COLORS.accent }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Next step */}
      <Section>
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/imgpathtoortho/exams"
              className="text-sm font-semibold underline underline-offset-4"
              style={{ color: COLORS.accent }}
            >
              ← Previous: Exams & ECFMG
            </Link>

            <Link
              href="/imgpathtoortho/usexperiences"
              className="inline-flex items-center rounded-xl border px-5 py-3 text-sm font-semibold transition hover:shadow-sm"
              style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
            >
              Next: Secure US experiences →
            </Link>
          </div>
        </Container>
      </Section>
    </main>
  );
}
