'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  FileText,
  Globe2,
  Timer,
  MapPin,
  ShieldCheck,
  Mail,
  AlertTriangle,
  Users,
  Target,
  ClipboardCheck,
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
  return <div className="rounded-2xl border bg-white shadow-sm" style={{ borderColor: COLORS.border }}>{children}</div>;
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

export default function ImgApplySmartPageClient() {
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
                  Step 6 of 7
                </span>
              </div>

              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-3xl sm:text-5xl font-bold tracking-tight"
                style={{ color: COLORS.heading }}
              >
                Step 6: Apply <span style={{ color: COLORS.accent }}>Smart</span>
              </motion.h1>

              <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed" style={{ color: '#4b5563' }}>
                For IMGs, the application is not “submit and hope.” It’s a targeted strategy: pick the right programs,
                tell a cohesive story, and avoid common mistakes that quietly sink otherwise strong candidates.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Target programs intentionally
                </span>
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Build one clear narrative
                </span>
                <span
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Don’t waste signals
                </span>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/imgpathtoortho/network"
                  className="text-sm font-semibold underline underline-offset-4"
                  style={{ color: COLORS.accent }}
                >
                  ← Back to Step 5 (Network + Mentorship)
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

      {/* Ready? */}
      <Section>
        <Container>
          <SectionHeading
            title="0. Are you ready to apply this cycle?"
            subtitle="This is the single best way to avoid wasting a cycle. If key signals are missing, build first — then apply."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout
              icon={<ClipboardCheck className="h-5 w-5" style={{ color: COLORS.accent }} />}
              title="You’re closer to “ready” if you have:"
            >
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5" style={{ color: COLORS.accent }} />
                  <span><strong>Strong Step 2 CK</strong> (and Step 1 passed)</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5" style={{ color: COLORS.accent }} />
                  <span><strong>US orthopaedic letters</strong> from meaningful supervision</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5" style={{ color: COLORS.accent }} />
                  <span><strong>Recent, real output</strong> (abstracts/manuscripts submitted or published)</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5" style={{ color: COLORS.accent }} />
                  <span>A <strong>cohesive story</strong> that explains “Why ortho” + “Why US”</span>
                </li>
              </ul>
            </Callout>

            <Callout
              icon={<AlertTriangle className="h-5 w-5" style={{ color: COLORS.accent }} />}
              title="Consider delaying if you’re missing:"
            >
              <ul className="space-y-2">
                <li>• No U.S. letters (or only generic letters)</li>
                <li>• Weak or uncertain Step 2 timeline</li>
                <li>• Research time spent but <strong>no completions</strong></li>
                <li>• Visa needs with no clear program list that sponsors</li>
              </ul>
              <p className="mt-3 text-xs" style={{ color: '#6b7280' }}>
                A strong “next cycle” application is almost always better than a rushed “this cycle” attempt.
              </p>
            </Callout>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Key idea
                </CardTitle>
              </CardHeader>
              <CardContent>
                For IMGs, programs take on more uncertainty. Your job is to remove uncertainty with visible signals:
                boards performance, U.S. team credibility, and consistent output.
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Program targeting */}
      <Section>
        <Container>
          <SectionHeading
            title="1. Program targeting"
            subtitle="Program research is not optional. A “big list” without strategy is a common IMG failure mode."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<Target className="h-5 w-5" style={{ color: COLORS.accent }} />} title="IMG friendliness">
              Look for evidence: past IMG residents, program language about IMGs, visa sponsorship patterns,
              and realistic screening thresholds.
            </Callout>

            <Callout icon={<Globe2 className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Visa reality check">
              If you’re visa-requiring, your list is automatically smaller. Build your list around programs that
              historically sponsor and have infrastructure to onboard IMGs.
            </Callout>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Callout icon={<Users className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Academic vs community patterns">
              <ul className="space-y-2">
                <li>• <strong>Academic-heavy</strong> programs may value research output and connections more.</li>
                <li>• <strong>Community-heavy</strong> programs may prioritize fit, work ethic, and strong letters.</li>
                <li>• Both can be IMG-friendly — but the “why you” pitch changes.</li>
              </ul>
            </Callout>

            <Callout icon={<MapPin className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Geography constraints">
              Consider visa logistics, cost, support system, and where you can realistically build mentorship.
              Don’t apply everywhere with no rationale.
            </Callout>
          </div>
        </Container>
      </Section>

      {/* Narrative */}
      <Section>
        <Container>
          <SectionHeading
            title="2. Your narrative (the story programs must believe)"
            subtitle="A good narrative doesn’t “sound inspiring.” It sounds true, specific, and mature."
          />

          <div className="grid gap-6 md:grid-cols-3">
            <Callout icon={<FileText className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Why ortho (specific)">
              Tie it to experiences that show you understand the work: the day-to-day, the team dynamic, and the long game.
            </Callout>

            <Callout icon={<Globe2 className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Why US (mature)">
              Clear reasons: training structure, research ecosystem, mentorship, and long-term career plan — not vague prestige.
            </Callout>

            <Callout icon={<Timer className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Why research year (strategy)">
              Frame it as intentional skill-building: output, mentorship, proof you can operate in U.S. academic teams.
            </Callout>
          </div>
        </Container>
      </Section>

      {/* Personal statement */}
      <Section>
        <Container>
          <SectionHeading
            title="3. Personal statement"
            subtitle="Your PS should support the application, not carry it. For IMGs, specificity + proof wins."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<CheckCircle2 className="h-5 w-5" style={{ color: COLORS.accent }} />} title="What works">
              <ul className="space-y-2">
                <li>• Specific experiences with clear takeaways</li>
                <li>• Growth arc + ownership of your path</li>
                <li>• Concrete proof points (output, roles, responsibility)</li>
                <li>• A coherent plan for training and career</li>
              </ul>
            </Callout>

            <Callout icon={<AlertTriangle className="h-5 w-5" style={{ color: COLORS.accent }} />} title="What fails">
              <ul className="space-y-2">
                <li>• Generic “passion” paragraphs</li>
                <li>• Trauma stories with no reflection or relevance</li>
                <li>• Name-dropping without meaningful context</li>
                <li>• Sounding desperate (“this is my only dream”) instead of strategic</li>
              </ul>
            </Callout>
          </div>
        </Container>
      </Section>

      {/* Signals + auditions */}
      <Section>
        <Container>
          <SectionHeading
            title="4. Signals + auditions"
            subtitle="Use scarce resources intentionally. The exact rules can change, but the strategy stays similar."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<Target className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Signals (general strategy)">
              Concentrate signals where you have the best combination of: IMG-friendliness, visa support (if needed),
              mentorship ties, and a story that fits the program.
            </Callout>

            <Callout icon={<Mail className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Auditions / rotations">
              If you can rotate, prioritize places where you can realistically earn advocacy. A rotation is an interview
              that lasts a month.
            </Callout>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick note</CardTitle>
              </CardHeader>
              <CardContent>
                Signal rules and availability can change year-to-year. Always confirm the current season’s guidelines,
                then apply the same core idea: be targeted, not random.
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Common errors */}
      <Section>
        <Container>
          <SectionHeading
            title="5. Common application errors (avoidable)"
            subtitle="These mistakes are common — and they hurt IMGs more than U.S. grads because your margin is smaller."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Callout icon={<AlertTriangle className="h-5 w-5" style={{ color: COLORS.accent }} />} title="Common mistakes">
              <ul className="space-y-2">
                <li>• Weak letter mix (generic letters, wrong specialty mix, or no U.S. ortho letters)</li>
                <li>• No cohesive story across CV/PS/interviews</li>
                <li>• Applying “everywhere” with no IMG/visa strategy</li>
                <li>• Under-preparing interviews (IMGs are judged fast)</li>
              </ul>
            </Callout>

            <Callout icon={<CheckCircle2 className="h-5 w-5" style={{ color: COLORS.accent }} />} title="What to do instead">
              <ul className="space-y-2">
                <li>• Build a tight program list with clear rationale</li>
                <li>• Align PS + CV + letters to one consistent narrative</li>
                <li>• Get brutal feedback early (mentors, residents)</li>
                <li>• Practice interviews like it’s a skill (because it is)</li>
              </ul>
            </Callout>
          </div>
        </Container>
      </Section>

      {/* Bridge to Path to Ortho ERAS page */}
      <Section>
        <Container>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" style={{ color: COLORS.accent }} />
                This complements our Path to Ortho ERAS pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              Once you’ve confirmed orthopaedics is realistic for you and you’ve built the IMG-specific signals
              (Step 2 strength, U.S. mentorship, letters, output), the actual ERAS mechanics and Match timeline
              look much more like the standard pathway.
              <div className="mt-4">
                <Link
                  href="/pathtoortho/eras"
                  className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-semibold transition hover:shadow-sm"
                  style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
                >
                  Go to Path to Ortho: ERAS →
                </Link>
              </div>
            </CardContent>
          </Card>
        </Container>
      </Section>

      {/* Next step */}
      <Section>
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/imgpathtoortho/network"
              className="text-sm font-semibold underline underline-offset-4"
              style={{ color: COLORS.accent }}
            >
              ← Previous: Network + Mentorship
            </Link>

            <Link
              href="/imgpathtoortho/logistics"
              className="inline-flex items-center rounded-xl border px-5 py-3 text-sm font-semibold transition hover:shadow-sm"
              style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.06)' }}
            >
              Next: Logistics (Visas etc.) →
            </Link>
          </div>
        </Container>
      </Section>
    </main>
  );
}
