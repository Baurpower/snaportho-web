'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, CalendarDays, MapPin } from 'lucide-react';
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
  return <div className="mx-auto w-full max-w-6xl px-6 sm:px-8 lg:px-10">{children}</div>;
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="py-12 sm:py-16 lg:py-20">{children}</section>;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border shadow-sm ${className}`} style={{ borderColor: COLORS.border, background: '#ffffff' }}>
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
    <div className="mb-2 text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: '#6b7280' }}>
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
    <div className="border-t">
      <Container>
        <div className="h-0" />
      </Container>
    </div>
  );
}

export default function PathToOrthoPage() {
  return (
    <main className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute left-1/2 top-[-14%] h-[52vh] w-[80vw] -translate-x-1/2 rounded-[999px] blur-3xl"
          style={{ background: 'radial-gradient(ellipse at center, rgba(89,116,152,0.08), transparent 60%)' }}
        />
        <div
          className="absolute right-[-12%] bottom-[-18%] h-[38vh] w-[48vw] rounded-[999px] blur-3xl"
          style={{ background: 'radial-gradient(ellipse at center, rgba(89,116,152,0.05), transparent 60%)' }}
        />
      </div>

      {/* Hero */}
      <Section>
        <Container>
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-8">
              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.45 }}
                className="text-4xl sm:text-5xl font-bold tracking-tight"
                style={{ color: COLORS.heading }}
              >
                Path to <span style={{ color: COLORS.accent }}>Ortho</span>
              </motion.h1>
              <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: '#4b5563' }}>
                A step-by-step guide through the orthopaedic surgery match. More modules coming soon.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <Divider />

      {/* Modules grid: Away Rotations + ERAS */}
      <Section>
        <Container>
          <SectionHeading title="Match Roadmap" subtitle="Work through these in order for the smoothest ride." />

          <div className="grid gap-6 sm:grid-cols-2 sm:max-w-none">
            {/* Module 1: Away Rotations */}
            <Link href="/pathtoortho/awayrotations" className="block">
              <Card className="transition-transform hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" style={{ color: COLORS.accent }} />
                    Module 1: Away Rotations
                    <span className="ml-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold" style={{ borderColor: COLORS.border, color: COLORS.accent }}>
                      New
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  Strategy, timelines, where to apply, rotation etiquette, and how to convert a strong month into an interview.
                </CardContent>
              </Card>
            </Link>

            {/* Module 2: ERAS */}
            <Link href="/pathtoortho/eras" className="block">
              <Card className="transition-transform hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" style={{ color: COLORS.accent }} />
                    Module 2: ERAS
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  Build your application — personal statement, eSLORs, program signaling, checklist, and key dates.
                </CardContent>
              </Card>
            </Link>
            {/* Module 3: Interviews */}
<Link href="/pathtoortho/interviews" className="block">
  <Card className="transition-transform hover:-translate-y-0.5 hover:shadow-md">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2">
        <FileText className="h-5 w-5" style={{ color: COLORS.accent }} />
        Module 3: Interviews
        <span
          className="ml-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ borderColor: COLORS.border, color: COLORS.accent }}
        >
          New
        </span>
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      Everything you need to succeed on interview day — behavioral questions,
      ortho knowledge pearls, timelines, and a full practice interview tool with timers.
    </CardContent>
  </Card>
</Link>

          </div>
        </Container>
      </Section>

      <Divider />

    {/* Extra resources */}
<Section>
  <Container>
    <SectionHeading
      eyebrow="Helpful Resources"
      title="Planning Your Path to Orthopaedics"
      subtitle="Key tools to help you strengthen your application and choose the right programs."
    />

    <div className="grid gap-6 md:grid-cols-2">
      
      {/* Research Fellowship (first) */}
      <Link href="/pathtoortho/research-fellowship" className="block">
        <Card className="h-full transition-transform hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" style={{ color: COLORS.accent }} />
              Orthopaedic Research Fellowship
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm leading-relaxed text-muted-foreground">
            Learn what an orthopaedic research fellowship actually looks like, who should consider one, and how to choose the right program. Whether you are unmatched, trying to strengthen your application, or planning ahead, this guide shows you how to turn a research year into publications, mentorship, and a more competitive match profile.
          </CardContent>
        </Card>
      </Link>

      {/* DO-Inclusive Programs */}
      <Link href="/pathtoortho/programs-do" className="block">
        <Card className="h-full transition-transform hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" style={{ color: COLORS.accent }} />
              Historically DO Programs
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm leading-relaxed text-muted-foreground">
            A filterable database of orthopaedic residencies with a track record of DO residents or AOA affiliation. Use this to build a realistic, targeted program list.
          </CardContent>
        </Card>
      </Link>

    </div>
  </Container>
</Section>

<Divider />


      {/* Curated by */}
      <Section>
        <Container>
          <SectionHeading eyebrow="About These Guides" title="Curated by clinicians who’ve been through it" />

          <Card className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full" style={{ background: 'radial-gradient(ellipse at center, rgba(89,116,152,0.10), transparent 60%)' }} />

            <CardContent className="pt-4">
              <ul className="grid gap-4 sm:grid-cols-3">
                {[
                  { name: 'Alexander Baur, DO', role: 'Ortho applicant · Founder, SnapOrtho' },
                  { name: 'Brandon Gettleman, MD', role: 'Orthopaedic Resident · UCLA' },
                  { name: 'Austin Nguyen, MD', role: 'Orthopaedic Resident · Houston Methodist · SnapOrtho Division Manager' },
                ].map((p) => (
                  <li key={p.name} className="rounded-xl border p-4 transition hover:bg-black/[0.02]" style={{ borderColor: COLORS.border }}>
                    <div className="font-medium" style={{ color: COLORS.headingSub }}>
                      {p.name}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: '#6b7280' }}>
                      {p.role}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Container>
      </Section>
    </main>
  );
}
