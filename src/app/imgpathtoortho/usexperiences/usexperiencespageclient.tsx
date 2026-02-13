'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  FileText,
  Globe2,
  Timer,
  Users,
  MapPin,
  ShieldCheck,
  Mail,
  AlertTriangle,
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

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base sm:text-lg font-semibold tracking-tight" style={{ color: COLORS.headingSub }}>
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

export default function ImgUSExperiencesPage() {
  return (
    <main className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
      {/* Hero */}
      <Section>
        <Container>
          <div
            className="relative overflow-hidden rounded-3xl border bg-white/60 px-6 py-8 sm:px-10 sm:py-10"
            style={{ borderColor: COLORS.border }}
          >
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
                  Step 4 of 7
                </span>
              </div>

              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-3xl sm:text-5xl font-bold tracking-tight"
                style={{ color: COLORS.heading }}
              >
                Step 4: Secure <span style={{ color: COLORS.accent }}>US Experiences</span>
              </motion.h1>

              <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed" style={{ color: '#4b5563' }}>
                For IMGs, U.S. experience is not optional. It is how programs evaluate your professionalism,
                communication, and fit — and how strong letters are earned.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                      style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}>
                  Letters take months
                </span>
                <span className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                      style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}>
                  Research is the bridge
                </span>
                <span className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                      style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}>
                  Visibility matters
                </span>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/imgpathtoortho/portfolio" className="text-sm font-semibold underline underline-offset-4"
                      style={{ color: COLORS.accent }}>
                  ← Back to Step 3 (CV)
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Clinical exposure */}
      <Section>
        <Container>
          <SectionHeading
            title="Clinical exposure in the US & letters of recommendation"
            subtitle="Not all U.S. exposure is equal. The goal is meaningful supervision and credible advocacy."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<MapPin className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Types of US exposure">
              <ul className="space-y-2">
                <li>• <strong>Observerships:</strong> Shadowing only; limited but can open doors.</li>
                <li>• <strong>Hands-on electives:</strong> Best when available and permitted.</li>
                <li>• <strong>Research-linked clinical exposure:</strong> Clinics, conferences, case discussions.</li>
              </ul>
            </Callout>

            <Callout icon={<FileText className="h-5 w-5" style={{ color: COLORS.accent }} />} title="What actually moves the needle">
              Exposure matters only if someone senior can say <strong>how you contributed</strong>, how you work on a
              team, and whether they would trust you as a resident.
            </Callout>
          </div>
        </Container>
      </Section>

      {/* Letters */}
      <Section>
        <Container>
          <SectionHeading
            title="What makes a strong US orthopaedic letter"
            subtitle="Strong letters are detailed, specific, and earned over time — not requested after a week."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<Users className="h-5 w-5" style={{ color: COLORS.accent }} />} title="What great letters include">
              Specific examples of your reliability, initiative, communication, teamwork, and growth. Vague praise does
              not help IMGs.
            </Callout>

            <Callout icon={<Timer className="h-5 w-5" style={{ color: COLORS.accent }} />} title="How long it takes">
              Most strong letters take <strong>months</strong> of consistent work. Expect 3–6+ months before asking.
            </Callout>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>How to approach LORs</CardTitle>
              </CardHeader>
              <CardContent>
                Ask attendings who supervised you meaningfully and know your work. Frame the ask honestly:
                “Would you be comfortable writing me a <strong>strong</strong> letter?”
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Professionalism */}
      <Section>
        <Container>
          <SectionHeading
            title="Professionalism basics (non-negotiable)"
            subtitle="These are silent deal-breakers if you get them wrong."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<ShieldCheck className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Know the rules">
              HIPAA, documentation boundaries, and OR etiquette are taken seriously. When unsure, ask — never assume.
            </Callout>

            <Callout icon={<Users className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Communication norms">
              Clear, respectful communication with residents, staff, and faculty matters as much as clinical knowledge.
            </Callout>
          </div>
        </Container>
      </Section>

      {/* Research fellowships */}
      <Section>
        <Container>
          <SectionHeading
            title="Research fellowships (the most common IMG bridge)"
            subtitle="For most IMGs, research is the gateway to mentorship, letters, and program advocacy."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<Globe2 className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Why research matters">
              Research provides credibility, proximity to faculty, networking, and tangible output — the currency IMGs
              rely on most.
            </Callout>

            <Callout icon={<Users className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Types of roles">
              Formal research fellowships, visiting scholar roles, coordinator-style positions, and selective remote
              collaborations.
            </Callout>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>How to find positions</CardTitle>
              </CardHeader>
              <CardContent>
                Most roles are found through cold emails, networking, and word of mouth.
                <Link href="/pathtoortho/research-fellowship" className="ml-1 underline" style={{ color: COLORS.accent }}>
                  See the research fellowship playbook →
                </Link>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Cold email */}
      <Section>
        <Container>
          <SectionHeading
            title="Cold email strategy (simple but effective)"
            subtitle="Short, respectful, and specific beats long and desperate."
          />

          <Callout icon={<Mail className="h-5 w-5" style={{ color: COLORS.accent }} />} title="6-line email formula">
            Who you are → why them → your credible signal → what you offer → 15-min call → attach CV. Follow up 2–3 times,
            spaced.
          </Callout>
        </Container>
      </Section>

      {/* Failure modes */}
      <Section>
        <Container>
          <SectionHeading
            title="Common failure modes (avoid these)"
            subtitle="These are patterns seen repeatedly in unsuccessful IMG applications."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<AlertTriangle className="h-5 w-5" style={{ color: COLORS.accent }} />} title="What goes wrong">
              Being a “data grunt” without authorship, no senior sponsor, too many projects with no completions, or weak
              clinical visibility.
            </Callout>

            <Callout icon={<CheckCircle2 className="h-5 w-5" style={{ color: COLORS.accent }} />} title="What success looks like (12 months)">
              Manuscripts submitted, abstracts presented, visible team contribution, and 2–3 strong U.S. letters.
            </Callout>
          </div>
        </Container>
      </Section>

      {/* Next */}
      <Section>
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/imgpathtoortho/portfolio" className="text-sm font-semibold underline underline-offset-4"
                  style={{ color: COLORS.accent }}>
              ← Previous: Build a VERY strong CV
            </Link>

            <Link
              href="/imgpathtoortho/network"
              className="inline-flex items-center rounded-xl border px-5 py-3 text-sm font-semibold transition hover:shadow-sm"
              style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
            >
              Next: Network & mentorship →
            </Link>
          </div>
        </Container>
      </Section>
    </main>
  );
}
