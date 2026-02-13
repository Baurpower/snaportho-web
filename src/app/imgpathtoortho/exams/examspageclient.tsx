'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, FileText, Globe2, Timer } from 'lucide-react';
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
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white"
              style={{ borderColor: COLORS.border }}>
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

export default function ImgExamsPage() {
  return (
    <main className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
      {/* Hero (same style as Step 1) */}
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
                  Step 2 of 7
                </span>
              </div>

              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-3xl sm:text-5xl font-bold tracking-tight"
                style={{ color: COLORS.heading }}
              >
                Step 2: <span style={{ color: COLORS.accent }}>Exams</span> & ECFMG
              </motion.h1>

              <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed" style={{ color: '#4b5563' }}>
                Your scores and certification timeline drive everything else. This page keeps it high-level and practical
                so you can plan backward from your target application cycle.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Step 2 is the differentiator
                </span>
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  ECFMG timing matters
                </span>
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Plan backward from ERAS
                </span>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/imgpathtoortho/timeline"
                  className="text-sm font-semibold underline underline-offset-4"
                  style={{ color: COLORS.accent }}
                >
                  ← Back to Step 1 (Timeline)
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

      {/* USMLE essentials */}
      <Section>
        <Container>
          <SectionHeading
            title="1. USMLE essentials"
            subtitle="Think of this as your exam stack. Step 2 usually carries the most weight for IMG applicants."
          />

          <div className="grid gap-6 md:grid-cols-3">
            <Callout
              icon={<FileText className="h-5 w-5" style={{ color: COLORS.accent }} />}
              title="Step 1 (Pass/Fail)"
            >
              Baseline requirement. A pass gets you in the game, but it rarely separates applicants.
            </Callout>

            <Callout
              icon={<Timer className="h-5 w-5" style={{ color: COLORS.accent }} />}
              title="Step 2 CK (Score)"
            >
              Often your biggest differentiator. Strong Step 2 can compensate for limited U.S. clinical time early on and
              helps convince programs you’ll perform well on boards.
            </Callout>

            <Callout
              icon={<Globe2 className="h-5 w-5" style={{ color: COLORS.accent }} />}
              title="Step 3 (Strategic)"
            >
              Optional. Sometimes useful for visa planning or specific programs, and can strengthen credibility if you’re
              further out from graduation.
            </Callout>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Practical rule of thumb
                </CardTitle>
              </CardHeader>
              <CardContent>
                If you’re deciding what to prioritize: <strong>Step 2 first</strong>, then build U.S. experiences and
                letters around that timeline. Don’t let “busy” research months delay Step 2 indefinitely.
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* ECFMG certification */}
      <Section>
        <Container>
          <SectionHeading
            title="2. ECFMG certification (high level)"
            subtitle="Programs care because it confirms eligibility for U.S. training and (often) visa processing."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5" style={{ color: COLORS.accent }} />
                  What it is (in plain English)
                </CardTitle>
              </CardHeader>
              <CardContent>
                ECFMG certification is the credentialing process for IMGs. It’s one of the standard boxes programs use to
                confirm you can start residency training in the U.S. when the time comes.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Why programs care
                </CardTitle>
              </CardHeader>
              <CardContent>
                It reduces uncertainty. For programs, “certification on track” signals fewer last-minute issues around
                eligibility, onboarding, and (when needed) visa paperwork.
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Timing: when you typically need it by
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li>
                    • <strong>By application:</strong> Ideal (strongest signal), but not always required everywhere.
                  </li>
                  <li>
                    • <strong>By ranking:</strong> Common expectation for many programs if certification is pending.
                  </li>
                  <li>
                    • <strong>By start date:</strong> Non-negotiable. If you cannot start, you will not match there.
                  </li>
                </ul>
                <p className="mt-4 text-xs" style={{ color: '#6b7280' }}>
                  Note: requirements vary by program and can change. Always verify on each program’s website.
                </p>
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
              href="/imgpathtoortho/timeline"
              className="text-sm font-semibold underline underline-offset-4"
              style={{ color: COLORS.accent }}
            >
              ← Previous: Timeline
            </Link>

            <Link
              href="/imgpathtoortho/portfolio"
              className="inline-flex items-center rounded-xl border px-5 py-3 text-sm font-semibold transition hover:shadow-sm"
              style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
            >
              Next: Build a VERY strong CV →
            </Link>
          </div>
        </Container>
      </Section>
    </main>
  );
}
