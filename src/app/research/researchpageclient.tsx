'use client';

import Link from 'next/link';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import {
  motion,
  useSpring,
  useTransform,
  useScroll,
  useReducedMotion,
} from 'framer-motion';
import {
  BookOpen,
  Compass,
  FlaskConical,
  GraduationCap,
  Mail,
  Sparkles,
  Target,
  Users,
  CheckCircle2,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  BarChart3,
  Wand2,
} from 'lucide-react';

const COLORS = {
  bg: '#fbfaf7',
  text: '#1f2937',
  heading: '#2b2b2b',
  headingSub: '#313131',
  accent: '#005C81',
  accentSoft: 'rgba(63,111,103,0.10)',
  border: 'rgba(148,163,184,0.55)',
  muted: '#6b7280',
  card: '#ffffff',
} as const;

// ──────────────────────────────────────────────────────────────
// Motion helpers
// ──────────────────────────────────────────────────────────────
const easeOut = [0.16, 1, 0.3, 1] as const;

function useSectionObserver(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? '');
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { root: null, threshold: [0.15, 0.25, 0.35, 0.5, 0.65], rootMargin: '-10% 0px -65% 0px' }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);

  return active;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

// ──────────────────────────────────────────────────────────────
// Small UI primitives
// ──────────────────────────────────────────────────────────────
function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-6 sm:px-8 lg:px-10">{children}</div>;
}

function Section({
  id,
  children,
  className = '',
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cx('py-12 sm:py-16 lg:py-20', className)}>
      {children}
    </section>
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase"
        style={{
          borderColor: 'rgba(148,163,184,0.45)',
          background: 'rgba(255,255,255,0.65)',
          color: 'rgba(31,41,55,0.70)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: 'linear-gradient(180deg, rgba(0, 92, 129, 0.9), rgba(89,116,152,0.55))' }}
        />
        {children}
      </span>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-7 sm:mb-10">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}

      {/* “Chapter” rail + headline */}
      <div className="relative pl-5">
        <div
          className="absolute left-0 top-2 h-[calc(100%-8px)] w-[3px] rounded-full"
          style={{
            background:
              'linear-gradient(180deg, rgba(0, 92, 129, 0.9), rgba(89,116,152,0.45), transparent)',
          }}
        />
        <h2
          className="text-[28px] leading-[1.08] sm:text-[36px] sm:leading-[1.08] font-semibold tracking-[-0.02em]"
          style={{ color: COLORS.heading }}
        >
          <span className="relative inline-block">
            {title}
            {/* Underline glow */}
            <span
              className="pointer-events-none absolute -bottom-2 left-0 h-[10px] w-full rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(63,111,103,0.22), rgba(89,116,152,0.14), transparent)',
                filter: 'blur(6px)',
              }}
            />
            {/* Crisp underline */}
            <span
              className="pointer-events-none absolute -bottom-1 left-0 h-[2px] w-[62%] rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(0, 92, 129, 0.9), rgba(89,116,152,0.40), transparent)',
              }}
            />
          </span>
        </h2>

        {subtitle ? (
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed sm:text-base" style={{ color: '#4b5563' }}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ borderColor: COLORS.border, color: COLORS.accent }}
    >
      {children}
    </span>
  );
}

function Card({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cx('rounded-2xl border shadow-sm', className)}
      style={{ borderColor: COLORS.border, background: COLORS.card, ...style }}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('p-6 md:p-7', className)}>{children}</div>;
}

function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3
      className={cx('text-[15px] sm:text-[17px] font-semibold tracking-[-0.01em]', className)}
      style={{ color: COLORS.headingSub }}
    >
      {children}
    </h3>
  );
}

function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('px-6 md:px-7 pb-6 md:pb-7 text-sm leading-relaxed', className)} style={{ color: '#4b5563' }}>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// “Cool” components
// ──────────────────────────────────────────────────────────────
function ScrollProgressBar() {
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll();

  // ✅ Hook is always called
  const springX = useSpring(scrollYProgress, { stiffness: 220, damping: 34 });

  // ✅ Choose which MotionValue to use
  const scaleX = prefersReduced ? scrollYProgress : springX;

  return (
    <motion.div
      className="fixed left-0 top-0 z-50 h-[3px] w-full origin-left"
      style={{
        scaleX,
        background:
          'linear-gradient(90deg, rgba(0, 92, 129, 0.9), rgba(89,116,152,0.55), rgba(63,111,103,0.35))',
      }}
    />
  );
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={prefersReduced ? false : { y: 14, opacity: 0 }}
      whileInView={prefersReduced ? {} : { y: 0, opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, ease: easeOut, delay }}
    >
      {children}
    </motion.div>
  );
}

function GlowCard({
  children,
  className,
  glow = true,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div className={cx('relative', className)}>
      {glow ? (
        <div
          className="pointer-events-none absolute -inset-[1px] rounded-[18px] opacity-0 transition-opacity duration-300 hover:opacity-100"
          style={{
            background: 'radial-gradient(520px circle at 30% 0%, rgba(63,111,103,0.14), transparent 60%)',
          }}
        />
      ) : null}

      <div className="relative rounded-2xl">
        <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
          <div
            className="h-[1px] w-full"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(63,111,103,0.30), rgba(89,116,152,0.20), transparent)',
            }}
          />
          {children}
        </Card>
      </div>
    </div>
  );
}

function CTAButton({
  href,
  children,
  variant = 'primary',
  icon,
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  icon?: React.ReactNode;
}) {
  const base =
    'group inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition will-change-transform';
  const primaryStyle =
    variant === 'primary'
      ? { borderColor: 'rgba(63,111,103,0.25)', background: 'rgba(63,111,103,0.10)', color: COLORS.headingSub }
      : { borderColor: COLORS.border, background: 'rgba(255,255,255,0.65)', color: COLORS.headingSub };

  return (
    <Link
      href={href}
      className={cx(base, 'hover:-translate-y-[1px] hover:shadow-sm')}
      style={primaryStyle}
    >
      {icon ? (
        <span
          className="inline-flex items-center justify-center rounded-lg border p-1.5"
          style={{ borderColor: 'rgba(148,163,184,0.35)', color: COLORS.accent, background: 'rgba(255,255,255,0.6)' }}
        >
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
      <ArrowRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}


// ──────────────────────────────────────────────────────────────
// Timeline (kept, but animated + slightly upgraded)
/// ─────────────────────────────────────────────────────────────
function TimelineItem({
  icon,
  title,
  subtitle,
  bullets,
  tag,
  i,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bullets: React.ReactNode[];
  tag?: string;
  i: number;
}) {
  return (
    <motion.div
      className="relative pl-10"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: easeOut, delay: i * 0.06 }}
    >
      <div className="absolute left-[15px] top-0 h-full w-px" style={{ background: 'rgba(148,163,184,0.35)' }} />
      <div
        className="absolute left-[7px] top-1.5 h-4 w-4 rounded-full border"
        style={{ borderColor: COLORS.border, background: COLORS.bg }}
      />
      <div
        className="absolute left-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-xl border"
        style={{ borderColor: COLORS.border, background: '#fff' }}
      >
        <span style={{ color: COLORS.accent }}>{icon}</span>
      </div>

      <div className="pb-10">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base sm:text-lg font-semibold tracking-tight" style={{ color: COLORS.headingSub }}>
            {title}
          </h3>
          {tag ? <Badge>{tag}</Badge> : null}
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed" style={{ color: '#4b5563' }}>
          {subtitle}
        </p>

        <ul className="mt-4 grid gap-2">
                      {bullets.map((b, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: '#4b5563' }}>
              <CheckCircle2 className="mt-0.5 h-4 w-4" style={{ color: COLORS.accent }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}


function HeroTitle() {
  return (
    <div className="relative">
      {/* Decorative soft halo */}
      <div
        className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle at center, rgba(63,111,103,0.18), transparent 60%)' }}
      />
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="relative text-5xl sm:text-6xl font-extrabold tracking-[-0.04em] leading-[0.95]">
          {/* Base ink */}
          <span style={{ color: COLORS.heading }}>Research</span>{' '}
          {/* 101 with gradient “ink” + subtle stroke */}
          <span
            className="relative inline-block"
            style={{
              background: 'linear-gradient(90deg, rgba(0, 92, 129, 0.9), rgba(89,116,152,0.85))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              WebkitTextStroke: '0.5px rgba(31,41,55,0.08)',
              textShadow: '0 10px 30px rgba(63,111,103,0.12)',
            }}
          >
            101
            {/* Accent underline */}
            <span
              className="pointer-events-none absolute -bottom-2 left-0 h-[3px] w-full rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(0, 92, 129, 0.9), rgba(89,116,152,0.40), transparent)',
              }}
            />
            {/* Glow */}
            <span
              className="pointer-events-none absolute -bottom-3 left-0 h-[10px] w-full rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(63,111,103,0.22), rgba(89,116,152,0.14), transparent)',
                filter: 'blur(8px)',
              }}
            />
          </span>
        </h1>

        {/* “chip” */}
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
          style={{
            borderColor: 'rgba(148,163,184,0.35)',
            color: COLORS.headingSub,
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Wand2 className="h-4 w-4" style={{ color: COLORS.accent }} />
          Built for Med Students
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────
export default function Research101Page() {
  const sectionIds = useMemo(() => ['why', 'timing', 'find', 'quality', 'traits'], []);
  const active = useSectionObserver(sectionIds);

  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, prefersReduced ? 0 : 60]);
  const heroFade = useTransform(scrollY, [0, 380], [1, 0.85]);

  return (
    <main className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
      <ScrollProgressBar />

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* animated hero blob */}
        <motion.div
          className="absolute left-1/2 top-[-18%] h-[56vh] w-[88vw] -translate-x-1/2 rounded-[999px] blur-3xl"
          style={{ background: `radial-gradient(ellipse at center, ${COLORS.accentSoft}, transparent 60%)` }}
          animate={prefersReduced ? {} : { scale: [1, 1.06, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-[-14%] bottom-[-18%] h-[42vh] w-[52vw] rounded-[999px] blur-3xl"
          style={{ background: 'radial-gradient(ellipse at center, rgba(89,116,152,0.07), transparent 60%)' }}
          animate={prefersReduced ? {} : { x: [0, -18, 0], y: [0, 10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* conic “ring glow” */}
        <div
          className="absolute left-[-12%] top-[20%] h-[360px] w-[360px] rounded-full blur-2xl opacity-[0.12]"
          style={{
            background:
              'conic-gradient(from 120deg, rgba(0, 92, 129, 0.9), rgba(89,116,152,0.55), rgba(63,111,103,0.2))',
          }}
        />

        {/* subtle dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(31,41,55,0.6) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
      </div>


      {/* HERO */}
      <Section className="pb-10 sm:pb-12">
        <Container>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <motion.div style={{ y: heroY, opacity: heroFade }}>
                <Reveal>
                  <Eyebrow>Everything you need to excel in orthopaedic Research</Eyebrow>

                  <HeroTitle />

                    <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: '#4b5563' }}>
                    Research isn’t about stacking publications. It’s about learning how to think — critically, methodically,
                    and like a future orthopaedic surgeon. This page helps you build momentum without losing balance.
                  </p>

                  {/* Inline section jump bar (moved here from fixed top) */}
                  <div className="mt-6 hidden lg:block">
                    <div
                      className="inline-flex items-center gap-1 rounded-2xl border bg-white/70 px-2 py-2 shadow-sm backdrop-blur"
                      style={{ borderColor: 'rgba(148,163,184,0.35)' }}
                    >
                      {[
                        { id: 'why', label: 'Why' },
                        { id: 'timing', label: 'When' },
                        { id: 'find', label: 'Where to start' },
                        { id: 'traits', label: 'How to excel' },
                      ].map((x) => {
                        const isActive = active === x.id;
                        return (
                          <a
                            key={x.id}
                            href={`#${x.id}`}
                            className={cx(
                              'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                              isActive ? 'shadow-sm' : 'hover:bg-black/[0.03]'
                            )}
                            style={{
                              color: isActive ? COLORS.headingSub : COLORS.muted,
                              background: isActive ? 'rgba(63,111,103,0.10)' : 'transparent',
                              border: isActive ? '1px solid rgba(63,111,103,0.18)' : '1px solid transparent',
                            }}
                          >
                            {x.label}
                          </a>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <CTAButton href="/research/playbook" variant="primary" icon={<FlaskConical className="h-4 w-4" />}>
                      Explore Research Playbook
                    </CTAButton>
                    <CTAButton href="/research/find-projects" variant="secondary" icon={<Compass className="h-4 w-4" />}>
                      How to Find a Project
                    </CTAButton>
                  </div>

                </Reveal>
              </motion.div>
            </div>

            {/* Right: “Coach card” */}
            <div className="lg:col-span-5">
              <Reveal delay={0.12}>
                <GlowCard className="will-change-transform">
                  <div className="relative overflow-hidden">
                    <div
                      className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full"
                      style={{ background: `radial-gradient(ellipse at center, rgba(63,111,103,0.16), transparent 60%)` }}
                    />
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" style={{ color: COLORS.accent }} />
                        All-in-one resource for ortho research
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {[
                            { t: 'Why it Matters', d: 'It boosts your CV and it’s one of the best ways to build mentorship and a real network in orthopaedics.' },
                            { t: 'Timing + Balance', d: 'Start research early after you understand your study routine. Do not sacrifice grades or board prep for research.' },
                            { t: 'Finding and starting projects', d: 'Opportunities don’t “appear”—you create them with showing innitiative, targeted outreach, and execution.' },
                            { t: 'Excel in Research', d: 'Hard work and Dedication: Communicate well, deliver reliably, and build trust with mentors.' },
                            ].map((x) => (
                          <div key={x.t} className="flex gap-3">
                            <span
                              className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold"
                              style={{ borderColor: 'rgba(63,111,103,0.25)', color: COLORS.accent, background: 'rgba(63,111,103,0.06)' }}
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
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                      </div>
                    </CardContent>
                  </div>
                </GlowCard>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      <Divider />

      {/* WHY RESEARCH MATTERS */}
      <Section id="why">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Why it matters"
              title="Research Builds Your Application and Your Reputation"
              subtitle="In the pass/fail era, research offers measurable productivity and more importantly, a longitudinal view of your work ethic, reliability, and growth."
            />
          </Reveal>

            {/* Top Full-Width Cards */}
<div className="space-y-6">

  {/* STEP 1 CARD — Full width */}
  <Reveal delay={0.04}>
    <GlowCard>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" style={{ color: COLORS.accent }} />
          Step 1 is pass/fail. Research is measurable.
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="leading-relaxed">
          With Step 1 (and many school grades) now pass/fail, programs rely more heavily on objective markers
          when sorting applications. This is true for away rotations (before Step 2 is available) and ERAS applications. Research productivity is an important metric.
        </p>

        <div
          className="mt-4 rounded-xl border p-4"
          style={{
            borderColor: 'rgba(63,111,103,0.22)',
            background: 'rgba(63,111,103,0.06)',
          }}
        >
          <div
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: COLORS.muted }}
          >
            Strategic reality
          </div>
          <div className="mt-2 text-sm" style={{ color: '#4b5563' }}>
            Research helps programs differentiate between strong candidates
            in a large applicant pool. It’s not everything but it’s an important checkbox.
          </div>
        </div>
      </CardContent>
    </GlowCard>
  </Reveal>

  {/* DIRECTION CARD — Full width */}
  <Reveal delay={0.08}>
  <GlowCard>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2">
        <Target className="h-5 w-5" style={{ color: COLORS.accent }} />
        Research is one of the best longitudinal activities in ortho as a med student.
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <p className="leading-relaxed">
        This isn’t a one-day impression. Research is months of real work. Over time, mentors see exactly how you operate: your communication, your consistency,
        your attention to detail, and whether you actually deliver.
      </p>

      <div
        className="mt-4 rounded-xl border p-4"
        style={{
          borderColor: 'rgba(63,111,103,0.22)',
          background: 'rgba(63,111,103,0.06)',
        }}
      >
        <div
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: COLORS.muted }}
        >
        Mentor take
        </div>
        <div className="mt-2 text-sm" style={{ color: '#4b5563' }}>
        Research is an avenue mentors can truly get to know you. Over months of collaboration,
        we see how you communicate, how you handle feedback, how you respond to pressure,
        and whether you consistently deliver. It’s one of the few settings that can
        meaningfully strengthen your reputation or quietly damage it.
        </div>
      </div>
    </CardContent>
  </GlowCard>
</Reveal>
</div>

{/* Spacer */}
<div className="mt-10" />

{/* Lower 2-Column Grid */}
<div className="grid gap-6 sm:grid-cols-2">
  {[
    {
      icon: <Users className="h-5 w-5" />,
      title: 'Real Networking',
      body:
        'Orthopaedic surgeons active in research tend to be more connected within academic circles which can translate into stronger advocacy.',
    },
    {
      icon: <FlaskConical className="h-5 w-5" />,
      title: 'Ortho Conferences',
      body:
        'Many medical schools will fund travel to orthopaedic conferences that research is accepted at which can be a great way to build relationships. ',
    },
    {
      icon: <BookOpen className="h-5 w-5" />,
      title: 'Early Ortho Exposure',
      body:
        'Research forces you to read the literature and learn orthopaedic concepts early.',
    },
    {
      icon: <ClipboardList className="h-5 w-5" />,
      title: 'Application strength',
      body:
        'Research helps you build a coherent “why ortho” story. Clear interests, consistent output, and proof you can execute over time.',
    },
  ].map((x) => (
    <GlowCard key={x.title} glow={false} className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <span style={{ color: COLORS.accent }}>{x.icon}</span>
          {x.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{x.body}</CardContent>
    </GlowCard>
  ))}
</div>
  </Container>
</Section>


      <Divider />

      {/* WHEN TO DO RESEARCH */}
      <Section id="timing">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Timing + balance"
              title="When to do Research"
              subtitle="Balance is strategic. Here’s a clean way to think about research across medical school."
            />
          </Reveal>

          <Reveal delay={0.08}>
            <GlowCard>
              <CardContent className="pt-7">
                <div className="grid gap-2">
                  <TimelineItem
                    i={0}
                    icon={<CalendarDays className="h-4 w-4" />}
                    title="Preclinical (M1–M2)"
                    tag="Build foundation"
                    subtitle="Your first priority is mastering your study system. Research comes after you understand your academic bandwidth."
                    bullets={[
                    'First figure out how long studying actually takes you — optimize efficiency before adding commitments.',
                    'Once your academic routine is stable, layer in small, well-defined research projects.',
                    'Balance is about timelines: research tasks (literature/chart review) are different from exam studying. When structured properly, they can fit around your study schedule instead of competing with it.',
                    'Use the early years to master the fundamentals: learn how to read orthopaedic literature critically, understand study design and basic statistics, and recognize what makes a strong paper.',
                    ]}
                  />

                  <TimelineItem
                    i={1}
                    icon={<GraduationCap className="h-4 w-4" />}
                    title="Clinical year (M3)"
                    tag="Execution phase"
                    subtitle="Away rotation and ERAS applications approach quickly. Quality research takes time."
                    bullets={[
                    'If you do not have research yet, prioritize it now. Abstracts and manuscripts take months, not weeks.',
                    'Lean into ortho projects with mentors who can truly advocate for you.',
                    'Case reports, retrospective database studies, AI-based projects, and systematic reviews can often be completed on shorter timelines when well structured.',
                    'Professionalism, responsiveness, and follow-through during this year directly influence advocacy and letters.',
                    ]}
                  />

                  <TimelineItem
                    i={1}
                    icon={<GraduationCap className="h-4 w-4" />}
                    title="Final Year (M4)"
                    tag="Visibility + momentum"
                    subtitle="ERAS submission isn’t the finish line. This year is about completion, advocacy, and continued progress."
                    bullets={[
                    'Prioritize completing and submitting projects so they appear on your ERAS application.',
                    'Do not stop after submission — ongoing work gives you meaningful updates during interviews.',
                    'Research involvement can deepen connections at programs, especially if collaborating across institutions.',
                    'Finish strong: This year is challenging. Dont succomb to burnout or overcommitment.',
                    ]}
                  />

                  <TimelineItem
                    i={2}
                    icon={<BarChart3 className="h-4 w-4" />}
                    title="Research Year (Optional)"
                    tag="Strategic"
                    subtitle="Not mandatory — but powerful when pursued with intention, structure, and the right mentorship."
                    bullets={[
                        'Strategic if there is a significant gap in your research experience or you need stronger academic positioning.',
                        <>
                        If you are considering a research year, review the full guide at{' '}
                        <Link
                            href="/pathtoortho/research-fellowship"
                            className="font-semibold underline"
                        >
                            Path to Ortho → Research Fellowship
                        </Link>{' '}
                        before committing.
                        </>,
                    ]}
                    />
                </div>

                <div className="mt-2 rounded-xl border p-4" style={{ borderColor: 'rgba(148,163,184,0.35)', background: 'rgba(255,255,255,0.7)' }}>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.headingSub }}>
                    <Target className="h-4 w-4" style={{ color: COLORS.accent }} />
                    Rule of thumb
                  </div>
                  <p className="mt-2 text-sm" style={{ color: '#4b5563' }}>
                    If research begins to compromise your performance or consistency, pause.
                    <br />
                    Excellence in medical school is about balancing priorities and switching efficiently between studying and research.
                    </p>
                </div>
              </CardContent>
            </GlowCard>
          </Reveal>
        </Container>
      </Section>

      <Divider />

      {/* HOW TO FIND RESEARCH (OVERVIEW + LINK OUT) */}
<Section id="find">
  <Container>
    <Reveal>
      <SectionHeading
        eyebrow="Finding and starting projects"
        title="How to find ortho research"
        subtitle="Opportunities rarely appear on their own. The strongest students create them with initiative, clarity, and follow-through."
      />
    </Reveal>

    <div className="grid gap-6 lg:grid-cols-12">
      {/* LEFT: Overview cards */}
      <div className="lg:col-span-7">
        <Reveal delay={0.06}>
          <div className="grid gap-6">
            {[
              {
                icon: <Users className="h-5 w-5" />,
                title: 'Start with known connections',
                body:
                    'The best starting point is usually close to home. Even if your medical school doesn’t have an ortho department, there may be other opportunities that can be a good entry point.',
                },
                {
                icon: <Compass className="h-5 w-5" />,
                title: 'Remote options',
                body:
                    'Much of orthopaedic clinical research — including systematic reviews, database studies, etc. can be done remotely with virtual meetings and shared workflows. Geography should not be a barrier.',
                },
              {
                icon: <Mail className="h-5 w-5" />,
                title: 'Outreach with a plan',
                body:
                  'Don’t ask “Do you have research?” Bring a focused interest + a concrete way you can contribute (screening, extraction, drafting, stats).',
              },
              
            ].map((x) => (
              <GlowCard key={x.title}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <span style={{ color: COLORS.accent }}>{x.icon}</span>
                    {x.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">{x.body}</CardContent>
              </GlowCard>
            ))}
          </div>
        </Reveal>
      </div>

      {/* RIGHT: Send them to the dedicated page */}
      <div className="lg:col-span-5">
        <Reveal delay={0.1}>
          <GlowCard>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" style={{ color: COLORS.accent }} />
                A full guide (recommended)
                <span className="ml-2">
                  <Badge>Start here</Badge>
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-0">
              <p>
                If you want the best results, use an initiative-first approach: identify strong mentors/labs
                and pitch a small project that’s easy to supervise and realistic to finish.
              </p>


              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/research/find-projects"
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-black/[0.03]"
                  style={{
                    borderColor: 'rgba(63,111,103,0.22)',
                    background: 'rgba(63,111,103,0.08)',
                    color: COLORS.headingSub,
                  }}
                >
                  Go to: Find Ortho Research
                  <ArrowRight className="h-4 w-4 opacity-70" />
                </Link>
              </div>
            </CardContent>
          </GlowCard>
        </Reveal>
      </div>
    </div>
  </Container>
</Section>

      <Divider />

      {/* QUALITY VS QUANTITY */}
<Section id="quality">
  <Container>
    <Reveal>
      <SectionHeading
        eyebrow="Strategy"
        title="What Strong Research Really Looks Like"
        subtitle="Any research is better than none. Then your goal becomes simple: show progression, finish projects, and own at least one meaningful piece of work."
      />
    </Reveal>

    <div className="grid gap-6 lg:grid-cols-12">
      {/* LEFT CARD */}
      <div className="lg:col-span-6">
        <Reveal delay={0.06}>
          <GlowCard>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" style={{ color: COLORS.accent }} />
                Start anywhere. Progress deliberately.
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="leading-relaxed">
                If you have <span className="font-semibold">zero</span> research, don’t overthink it — get involved.
                Then focus on a <span className="font-semibold">trajectory</span>: local → regional → national, and
                abstracts → manuscripts.
              </p>

              <div className="mt-4 rounded-xl border p-4"
                style={{ borderColor: 'rgba(63,111,103,0.22)', background: 'rgba(63,111,103,0.06)' }}
              >
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.muted }}>
                  A practical hierarchy
                </div>

                <div className="mt-3 grid gap-2">
                  {[
                    'Poster/podium at a local or regional meeting = solid start.',
                    'National meeting acceptance = stronger visibility + networking.',
                    'Manuscript indexed with a PMID = a major credibility step.',
                    'Journal “prestige” matters as you gain more research experiences and build your CV.',
                    'At a certain point quality matters much more than quantity.',
                  ].map((q) => (
                    <div key={q} className="flex items-start gap-2 text-sm" style={{ color: '#4b5563' }}>
                      <CheckCircle2 className="mt-0.5 h-4 w-4" style={{ color: COLORS.accent }} />
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </GlowCard>
        </Reveal>
      </div>

      {/* RIGHT GRID */}
      <div className="lg:col-span-6">
        <Reveal delay={0.1}>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                icon: <ClipboardList className="h-5 w-5" />,
                title: 'Any > none',
                body: 'If you’re starting from zero, the first goal is involvement. Momentum beats perfection early.',
              },
              {
                icon: <BarChart3 className="h-5 w-5" />,
                title: 'Progression',
                body: 'Build a visible trajectory: regional abstracts → national abstracts → manuscripts. Programs like “growth.”',
              },
              {
                icon: <Users className="h-5 w-5" />,
                title: 'Authorship',
                body: '3rd/4th author is normal. Reliability + contribution is ultimatley all that what matters.',
              },
              {
                icon: <Target className="h-5 w-5" />,
                title: 'Own one',
                body: 'Aim for at least one project where you led a meaningful part end-to-end. That’s the differentiator.',
              },
            ].map((x) => (
              <GlowCard key={x.title} glow={false} className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <span style={{ color: COLORS.accent }}>{x.icon}</span>
                    {x.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">{x.body}</CardContent>
              </GlowCard>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  </Container>
</Section>

      <Divider />

      {/* WHAT MAKES A GOOD STUDENT RESEARCHER */}
      <Section id="traits">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Excel in research"
              title="What makes a strong medical student researcher"
              subtitle="The best students aren’t always the most experienced. They’re the most reliable."
            />
          </Reveal>

          <Reveal delay={0.08}>
            <GlowCard>
              <div className="relative overflow-hidden">
                <div
                  className="pointer-events-none absolute -left-16 -bottom-16 h-72 w-72 rounded-full"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(63,111,103,0.12), transparent 60%)' }}
                />
                <CardContent className="pt-8 pb-8">
  <div className="grid gap-10 md:grid-cols-2 items-start">

    {/* LEFT — Strong Researcher */}
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.headingSub }}>
        <Sparkles className="h-4 w-4" style={{ color: COLORS.accent }} />
        What mentors remember (the good)
      </div>

      <ul className="grid gap-2">
        {[
          'Fast, clear replies.',
          'Setting realistic timelines — and finishing early when possible.',
          'Flagging conflicts (exams, rotations) in advance — not after deadlines pass.',
          'Attention to detail (tables, citations, formatting).',
          'Taking feedback without ego.',
          'Following through — completely.',
        ].map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm" style={{ color: '#4b5563' }}>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: COLORS.accent }} />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm leading-relaxed" style={{ color: '#4b5563' }}>
        Most mentors will let you set your own deadlines. Set timelines you can actually hit.
        Deliver early when possible. Reliability compounds.
      </p>
    </div>

    {/* RIGHT — What burns you */}
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.headingSub }}>
        <Flame className="h-4 w-4" style={{ color: COLORS.accent }} />
        What burns you quickly (the bad)
      </div>

      <ul className="grid gap-2">
        {[
          'Overcommitting and missing deadlines.',
          'Going silent when busy.',
          'Blaming exams instead of communicating early.',
          'Submitting sloppy drafts.',
          'Needing constant reminders to complete tasks.',
        ].map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm" style={{ color: '#4b5563' }}>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: COLORS.accent }} />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm leading-relaxed" style={{ color: '#4b5563' }}>
        You will always get busier. Residents and faculty are busy too. They won’t have much sympathy for delays.
      </p>
      
    </div>

  </div>

  {/* FULL-WIDTH mantra at the end */}
  <div
    className="mt-8 rounded-xl border p-4"
    style={{ borderColor: 'rgba(148,163,184,0.35)', background: 'rgba(255,255,255,0.7)' }}
  >
    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.headingSub }}>
      <Target className="h-4 w-4" style={{ color: COLORS.accent }} />
      Strategic mantra
    </div>
    <p className="mt-2 text-sm leading-relaxed" style={{ color: '#4b5563' }}>
      Set deadlines you can hit, communicate early, and deliver consistently. That’s what gets you trusted — and remembered.
    </p>
  </div>
</CardContent>
              </div>
            </GlowCard>
          </Reveal>
        </Container>
      </Section>

      <Divider />

      {/* Footer CTA strip */}
      <Section className="pt-10">
        <Container>
          <Reveal>
            <GlowCard>
              <div className="relative overflow-hidden">
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(63,111,103,0.12), transparent 60%)' }}
                />
                <CardContent className="pt-7">
                  <div className="grid gap-6 md:grid-cols-12 md:items-center">
                    <div className="md:col-span-8">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-5 w-5" style={{ color: COLORS.accent }} />
                        <div className="text-lg font-semibold tracking-tight" style={{ color: COLORS.headingSub }}>
                          Ready to move from strategy to execution?
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: '#4b5563' }}>
                        Research 101 gives you the mindset and roadmap. The Research Playbook gives you the systems, templates,
                        and step-by-step workflows to finish.
                      </p>
                    </div>
                    <div className="md:col-span-4 md:flex md:justify-end">
                      <div className="flex flex-wrap gap-2">
                        <CTAButton href="/research/playbook" variant="primary" icon={<FlaskConical className="h-4 w-4" />}>
                          Research Playbook
                        </CTAButton>
                        <CTAButton href="/research/how-to-find" variant="secondary" icon={<Compass className="h-4 w-4" />}>
                          Find a Project
                        </CTAButton>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </div>
            </GlowCard>
          </Reveal>
        </Container>
      </Section>
    </main>
  );
}