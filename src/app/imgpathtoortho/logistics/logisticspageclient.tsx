'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Globe2,
  ShieldCheck,
  FolderOpen,
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

function CardTitle({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
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

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-4"
      style={{ color: COLORS.accent }}
    >
      {children}
    </a>
  );
}

export default function ImgLogisticsPageClient() {
  return (
    <main className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
      {/* Hero */}
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
                  Step 7 of 7
                </span>
              </div>

              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-3xl sm:text-5xl font-bold tracking-tight"
                style={{ color: COLORS.heading }}
              >
                Step 7: Understand <span style={{ color: COLORS.accent }}>Logistics</span>
              </motion.h1>

              <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed" style={{ color: '#4b5563' }}>
                Visa assumptions can quietly derail an otherwise strong application. This page is a high-level guide
                so you don’t get blindsided while building your program list.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Ask early
                </span>
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Build your list smarter
                </span>
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Keep docs organized
                </span>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/imgpathtoortho/apply"
                  className="text-sm font-semibold underline underline-offset-4"
                  style={{ color: COLORS.accent }}
                >
                  ← Back to Step 6 (Apply smart)
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

      {/* Disclaimer */}
      <Section>
        <Container>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" style={{ color: COLORS.accent }} />
                Important disclaimer
              </CardTitle>
            </CardHeader>
            <CardContent>
              This page is <strong>general educational information</strong> and is <strong>not legal advice</strong>.
              Rules change, and your situation may be unique. Always verify details using official sources and, when
              needed, a qualified immigration attorney or your institution’s legal/HR team.
            </CardContent>
          </Card>
        </Container>
      </Section>

      {/* Visa pathways */}
      <Section>
        <Container>
          <SectionHeading
            title="1. Common visa pathways (high-level)"
            subtitle="The two you’ll hear most often in residency are J-1 and H-1B, but research roles can use different categories."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<Globe2 className="h-5 w-5" style={{ color: COLORS.accent }} />} title="J-1 vs H-1B (practical meaning)">
              <ul className="space-y-2">
                <li>
                  • <strong>J-1:</strong> Common in training programs; often involves sponsorship via established pathways.
                </li>
                <li>
                  • <strong>H-1B:</strong> Employer-sponsored “specialty occupation” style pathway; some programs do it,
                  many do not.
                </li>
                <li className="text-xs" style={{ color: '#6b7280' }}>
                  Don’t assume availability. The same program may sponsor one, both, or neither.
                </li>
              </ul>
            </Callout>

            <Callout icon={<FileText className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Research visas ≠ residency visas">
              It’s common to do research in the U.S. under a different status than residency. Avoid building a plan that
              assumes research visa logistics automatically translate to residency sponsorship.
            </Callout>
          </div>
        </Container>
      </Section>

      {/* What programs typically do */}
      <Section>
        <Container>
          <SectionHeading
            title="2. What programs typically do"
            subtitle="This directly affects your program list, your risk, and your timeline."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<ShieldCheck className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Sponsorship patterns">
              <ul className="space-y-2">
                <li>• Some programs sponsor <strong>J-1 only</strong>.</li>
                <li>• Some sponsor <strong>H-1B</strong> (less common in many settings).</li>
                <li>• Some sponsor <strong>neither</strong> (even if they consider IMGs academically).</li>
              </ul>
            </Callout>

            <Callout icon={<CheckCircle2 className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Why it matters for targeting">
              Visa uncertainty can turn into a late-season “silent rejection.” If you need sponsorship, prioritize
              programs with a <strong>clear history</strong> of sponsoring your pathway.
            </Callout>
          </div>
        </Container>
      </Section>

      {/* Practical tips */}
      <Section>
        <Container>
          <SectionHeading
            title="3. Practical tips that prevent surprises"
            subtitle="Simple habits that save months."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<FileText className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Clarify early (script you can use)">
              “Hi — I’m applying as an IMG and may require visa sponsorship. Can you confirm whether your program sponsors
              J-1, H-1B, both, or neither for incoming residents?”
            </Callout>

            <Callout icon={<FolderOpen className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Keep documentation organized">
              Keep a dedicated folder for: passport, prior visas/I-94 history (if applicable), ECFMG documents,
              transcripts, and any institution letters. It helps with onboarding and reduces last-minute chaos.
            </Callout>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" style={{ color: COLORS.accent }} />
                  A simple rule
                </CardTitle>
              </CardHeader>
              <CardContent>
                If a program can’t clearly answer sponsorship questions, treat it as a risk. Build a list that gives you
                multiple realistic paths — not one fragile plan.
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Official resources */}
      <Section>
        <Container>
          <SectionHeading
            title="Official resources (start here)"
            subtitle="Use primary sources. Policies change—these links are where updates actually appear."
          />

          <Card>
            <CardContent>
              <ul className="space-y-3">
                <li>
                  • U.S. Department of State (J-1 / Exchange Visitor Program):
                  {' '}
                  <ExternalLink href="https://j1visa.state.gov/">
                    j1visa.state.gov
                  </ExternalLink>
                </li>
                <li>
                  • U.S. Department of State (J-1 waiver / 212(e) info):
                  {' '}
                  <ExternalLink href="https://travel.state.gov/content/travel/en/us-visas/study/exchange/waiver-of-the-exchange-visitor.html">
                    travel.state.gov waiver page
                  </ExternalLink>
                </li>
                <li>
                  • USCIS (Temporary nonimmigrant workers overview, incl. H-1B):
                  {' '}
                  <ExternalLink href="https://www.uscis.gov/working-in-the-united-states/temporary-nonimmigrant-workers">
                    uscis.gov temporary workers
                  </ExternalLink>
                </li>
              </ul>
              <p className="mt-4 text-xs" style={{ color: '#6b7280' }}>
                Tip: when you read any program’s website, search the page for “visa”, “sponsorship”, “J-1”, “H-1B”, and
                “ECFMG”.
              </p>
            </CardContent>
          </Card>
        </Container>
      </Section>

      {/* Finish */}
      <Section>
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/imgpathtoortho/apply"
              className="text-sm font-semibold underline underline-offset-4"
              style={{ color: COLORS.accent }}
            >
              ← Previous: Apply smart
            </Link>

            <Link
              href="/imgpathtoortho"
              className="inline-flex items-center rounded-xl border px-5 py-3 text-sm font-semibold transition hover:shadow-sm"
              style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
            >
              Back to IMG Start Here →
            </Link>
          </div>
        </Container>
      </Section>
    </main>
  );
}
