'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CalendarDays, FileText, GraduationCap, MapPin, Timer } from 'lucide-react';
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
    <div
      className="rounded-2xl border bg-white shadow-sm"
      style={{ borderColor: COLORS.border }}
    >
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
      {subtitle && (
        <p className="mt-3 max-w-2xl" style={{ color: '#4b5563' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function ImgTimelinePage() {
  return (
    <main className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
      {/* Hero */}
      {/* Hero */}
<Section>
  <Container>
    <div className="relative overflow-hidden rounded-3xl border bg-white/60 px-6 py-8 sm:px-10 sm:py-10"
         style={{ borderColor: COLORS.border }}>
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
            Step 1 of 7
          </span>
        </div>

        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-3xl sm:text-5xl font-bold tracking-tight"
          style={{ color: COLORS.heading }}
        >
          Start Here: Your <span style={{ color: COLORS.accent }}>Timeline</span>
        </motion.h1>

        <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed" style={{ color: '#4b5563' }}>
          Define your starting point, pick a realistic target cycle, and understand what your
          application must prove before you spend months in the wrong direction.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <span
            className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
            style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
          >
            Choose your status
          </span>
          <span
            className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
            style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
          >
            Estimate 12–36 months
          </span>
          <span
            className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
            style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
          >
            Avoid common delays
          </span>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">

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


      {/* Section 1 */}
      <Section>
        <Container>
          <SectionHeading
            title="1. Your current status"
            subtitle="Your starting point determines your timeline, strategy, and early priorities."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Training status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li>• Medical student (pre-final or final year)</li>
                  <li>• Graduate (internship or residency in home country)</li>
                  <li>• Already doing research or observerships in the U.S.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Visa status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Determine early whether you will be visa-requiring. This affects program targeting, timeline length,
                  and the importance of strong institutional sponsorship.
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Section 2 */}
      <Section>
        <Container>
          <SectionHeading
            title="2. What a realistic timeline looks like"
            subtitle="Short timelines are possible, but uncommon. Most successful IMG matches take time."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Common timelines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li>
                    <strong>12–18 months:</strong> Rare. Usually non–visa-requiring IMGs with strong U.S. ties, early
                    research, and ready Step 2 scores.
                  </li>
                  <li>
                    <strong>18–36 months:</strong> Typical minimum timeline for visa-requiring IMGs building U.S.
                    research, letters, and exam strength.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Where most people lose time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li>• Delayed or rushed Step 2 preparation</li>
                  <li>• Low research output despite time spent</li>
                  <li>• Weak or late U.S. letters of recommendation</li>
                  <li>• Poor early planning and unclear goals</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Section 3 */}
      <Section>
        <Container>
          <SectionHeading
            title="3. What your application needs to prove"
            subtitle="Successful IMG applications consistently demonstrate these signals."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" style={{ color: COLORS.accent }} />
                  The four proofs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li><strong>Proof 1:</strong> You can excel academically (strong Step 2).</li>
                  <li><strong>Proof 2:</strong> You can produce and contribute (meaningful research output).</li>
                  <li><strong>Proof 3:</strong> You can work in U.S. teams (letters + professionalism).</li>
                  <li><strong>Proof 4:</strong> You are among the strongest applicants in the pool.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Section 4 */}
      <Section>
        <Container>
          <SectionHeading
            title="4. Your target year plan"
            subtitle="Decide early whether you are applying this cycle or building toward the next."
          />

          <Card>
            <CardContent>
              <ul className="space-y-3">
                <li>
                  <strong>Apply this cycle</strong> if Step 2 is ready, U.S. letters are secured, and research output is
                  credible.
                </li>
                <li>
                  <strong>Delay to next cycle</strong> if major components are missing. A strong delayed application is
                  far better than a rushed one.
                </li>
                <li>
                  Know when to pivot: if Step 2 is not ready, if U.S. letters are weak or absent, or if research lacks
                  productivity.
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="mt-8">
            <Link
              href="/imgpathtoortho/exams"
              className="inline-flex items-center rounded-xl border px-5 py-3 text-sm font-semibold transition hover:shadow-sm"
              style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
            >
              Next: Exams & ECFMG Certification →
            </Link>
          </div>
        </Container>
      </Section>
    </main>
  );
}
