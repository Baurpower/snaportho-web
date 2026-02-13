'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Globe2,
  Handshake,
  Mail,
  MapPin,
  Timer,
  Users,
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
    <h3 className={`text-base sm:text-lg font-semibold tracking-tight ${className}`} style={{ color: COLORS.headingSub }}>
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

export default function ImgNetworkMentorshipPage() {
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
                  Step 5 of 7
                </span>
              </div>

              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-3xl sm:text-5xl font-bold tracking-tight"
                style={{ color: COLORS.heading }}
              >
                Step 5: <span style={{ color: COLORS.accent }}>Network</span> + Mentorship
              </motion.h1>

              <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed" style={{ color: '#4b5563' }}>
                IMGs rarely match without real advocates. Networking is not “collecting names.” It is becoming known as a
                reliable teammate so mentors are willing to vouch for you when it counts.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Build a mentor team
                </span>
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Be useful + consistent
                </span>
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Conferences done right
                </span>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/imgpathtoortho/usexperiences"
                  className="text-sm font-semibold underline underline-offset-4"
                  style={{ color: COLORS.accent }}
                >
                  ← Back to Step 4 (US Experiences)
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

      {/* 1. Mentor team */}
      <Section>
        <Container>
          <SectionHeading
            title="1. Your “mentor team”"
            subtitle="You need different mentors for different jobs. One person rarely covers everything."
          />

          <div className="grid gap-6 md:grid-cols-3">
            <Callout icon={<Globe2 className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Senior sponsor">
              Chair-level / program leadership if possible. This is the person whose support can change outcomes because
              they have influence.
            </Callout>

            <Callout icon={<Users className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Day-to-day mentor">
              The person who reviews your CV, tells you what to fix, and keeps you pointed at the next best move.
              Usually research faculty or a fellowship-trained attending.
            </Callout>

            <Callout icon={<Handshake className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Peer mentors">
              Residents/fellows who explain unspoken rules, help you prepare, and tell you what programs *actually* value
              right now.
            </Callout>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" style={{ color: COLORS.accent }} />
                  The mindset shift
                </CardTitle>
              </CardHeader>
              <CardContent>
                Mentorship grows from trust. Your job is to make it easy to mentor you: be prepared, be consistent, and
                make progress between conversations.
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* 2. Network well */}
      <Section>
        <Container>
          <SectionHeading
            title="2. How to network well"
            subtitle="The fastest way to build relationships is to be low-maintenance and high-output."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<Timer className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Be useful">
              Bring value: write well, analyze data, handle logistics, meet deadlines, and follow through. Reliability
              beats brilliance.
            </Callout>

            <Callout icon={<Users className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Show up">
              Lab meetings, case conferences, journal clubs, grand rounds, research presentations. Visibility + repeated
              professionalism builds credibility.
            </Callout>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" style={{ color: COLORS.accent }} />
                  A simple follow-up rule
                </CardTitle>
              </CardHeader>
              <CardContent>
                After you meet someone, follow up within <strong>24–72 hours</strong> with a short message: “Great to
                meet you, here’s what I’m working on, and here’s what I’ll do next.” Then do the thing.
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* 3. Conference strategy */}
      <Section>
        <Container>
          <SectionHeading
            title="3. Conference strategy"
            subtitle="Conferences are expensive. Go with a plan — not hope."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<MapPin className="h-5 w-5" style={{ color: COLORS.accent }} />} title="How to choose meetings">
              Pick meetings where your target programs attend and where you can realistically present: national specialty
              meetings, subspecialty societies, or regional academic meetings with strong ortho presence.
            </Callout>

            <Callout icon={<Handshake className="h-5 w-5" style={{ color: COLORS.accent }} />} title="How to meet people effectively">
              Don’t open with “Can you help me match?” Open with context + interest + a small ask. Your goal is a follow-up,
              not a miracle on day one.
            </Callout>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Quick script (30 seconds)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3">
                  <strong>“Hi Dr. ___, I’m ___.</strong> I’m an IMG working with ___ on ___ (one sentence). I really
                  liked your work on ___ (one specific thing). I’m trying to learn more about ___ — would you be open to
                  a quick 10–15 minute call sometime after the meeting?”
                </p>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  Keep it short. Make it specific. Make the ask small.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Follow-up message (copy/paste)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3">
                  “Dr. ___, great meeting you at ___. I appreciated your advice on ___. I’m going to ___ (one concrete
                  next step) and I’ll follow up in a few weeks with an update. If you’re open to it, I’d love to schedule
                  a brief call at your convenience. Thank you again.”
                </p>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  The update is the secret sauce. It turns networking into a relationship.
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* 4. Red flags */}
      <Section>
        <Container>
          <SectionHeading
            title="4. Red flags (things that silently hurt you)"
            subtitle="These come up constantly. Avoid them early and you’ll save months."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<AlertTriangle className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Transactional asks">
              Asking for favors before you’ve built trust: “Can you get me a spot?” or “Can you email your PD friend?”
              too early is a fast way to get ignored.
            </Callout>

            <Callout icon={<AlertTriangle className="h-5 w-5" style={{ color: COLORS.accent }} />} title="No consistent output">
              People advocate for IMGs who deliver. If months pass with no manuscripts, no abstracts, and no progress,
              you lose momentum and credibility.
            </Callout>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" style={{ color: COLORS.accent }} />
                  What mentors want to see
                </CardTitle>
              </CardHeader>
              <CardContent>
                Consistency. Professionalism. Clear progress. And a track record of finishing what you start. That’s what
                makes someone comfortable going to bat for you.
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
              href="/imgpathtoortho/usexperiences"
              className="text-sm font-semibold underline underline-offset-4"
              style={{ color: COLORS.accent }}
            >
              ← Previous: US Experiences
            </Link>

            <Link
              href="/imgpathtoortho/apply"
              className="inline-flex items-center rounded-xl border px-5 py-3 text-sm font-semibold transition hover:shadow-sm"
              style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
            >
              Next: Apply Smart →
            </Link>
          </div>
        </Container>
      </Section>
    </main>
  );
}
