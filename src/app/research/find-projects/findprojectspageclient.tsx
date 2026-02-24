'use client';

import Link from 'next/link';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { motion, useSpring, useTransform, useScroll, useReducedMotion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  Mail,
  Sparkles,
  Users,
  CheckCircle2,
  ArrowRight,
  ClipboardList,
  ChevronDown,
  ShieldCheck,
  Gauge,
  BarChart3,
  Search,
  Workflow,
  Lightbulb,
  Handshake,
  Network,
  FileText,
  HomeIcon,
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
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="mb-7 sm:mb-10">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}

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
            <span
              className="pointer-events-none absolute -bottom-2 left-0 h-[10px] w-full rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(63,111,103,0.22), rgba(89,116,152,0.14), transparent)',
                filter: 'blur(6px)',
              }}
            />
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

function Accordion({
  items,
}: {
  items: Array<{ title: string; body: React.ReactNode; tag?: string; icon?: React.ReactNode }>;
}) {
  const [open, setOpen] = useState<string | null>(items[0]?.title ?? null);
  return (
    <div className="grid gap-3">
      {items.map((it) => {
        const isOpen = open === it.title;
        return (
          <Card key={it.title} className="overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : it.title)}
              className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                {it.icon ? (
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border"
                    style={{
                      borderColor: 'rgba(148,163,184,0.35)',
                      background: 'rgba(255,255,255,0.75)',
                      color: COLORS.accent,
                    }}
                  >
                    {it.icon}
                  </span>
                ) : null}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold" style={{ color: COLORS.headingSub }}>
                      {it.title}
                    </div>
                    {it.tag ? <Badge>{it.tag}</Badge> : null}
                  </div>
                  <div className="text-xs" style={{ color: COLORS.muted }}>
                    Tap to expand
                  </div>
                </div>
              </div>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25, ease: easeOut }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border"
                style={{ borderColor: 'rgba(148,163,184,0.35)', background: 'rgba(255,255,255,0.75)' }}
              >
                <ChevronDown className="h-4 w-4" style={{ color: COLORS.headingSub }} />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: easeOut }}
                >
                  <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: '#4b5563' }}>
                    {it.body}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </Card>
        );
      })}
    </div>
  );
}

function HeroTitle() {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle at center, rgba(63,111,103,0.18), transparent 60%)' }}
      />
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="relative text-5xl sm:text-6xl font-extrabold tracking-[-0.04em] leading-[0.95]">
          <span style={{ color: COLORS.heading }}>Find</span>{' '}
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
            Ortho Research
            <span
              className="pointer-events-none absolute -bottom-2 left-0 h-[3px] w-full rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(0, 92, 129, 0.75), rgba(89,116,152,0.40), transparent)',
              }}
            />
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
      </div>
    </div>
  );
}

export default function FindOrthoResearchPage() {
  const sectionIds = useMemo(() => ['map', 'initiative', 'pitch', 'labs', 'outreach'], []);
  const active = useSectionObserver(sectionIds);

  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, prefersReduced ? 0 : 60]);
  const heroFade = useTransform(scrollY, [0, 380], [1, 0.88]);

  return (
    <main className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
      <ScrollProgressBar />

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
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
                  <Eyebrow>Research · finding projects</Eyebrow>

                  <HeroTitle />

                  <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: '#4b5563' }}>
                    The fastest way to get real research is showing initiative: find a gap, and pitch a small project that’s easy to supervise and realistic to finish.
                  </p>

                  {/* Jump bar */}
                  <div className="mt-6 hidden lg:block">
                    <div
                      className="inline-flex items-center gap-1 rounded-2xl border bg-white/70 px-2 py-2 shadow-sm backdrop-blur"
                      style={{ borderColor: 'rgba(148,163,184,0.35)' }}
                    >
                      {[
                        { id: 'map', label: 'Map' },
                        { id: 'labs', label: 'Choose labs' },
                        { id: 'initiative', label: 'Initiative' },
                        { id: 'pitch', label: 'Pitch' },
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
                    <CTAButton href="/research" variant="primary" icon={<HomeIcon className="h-4 w-4" />}>
                      Back to Research 101
                    </CTAButton>
                    <CTAButton href="/research/playbook" variant="secondary" icon={<FlaskConical className="h-4 w-4" />}>
                      Research Playbook
                    </CTAButton>
                  </div>
                </Reveal>
              </motion.div>
            </div>

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
                        <Gauge className="h-5 w-5" style={{ color: COLORS.accent }} />
                        The “yes” formula
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {[
                          { t: 'Be specific', d: 'Address the mentor (faculty or resident), the topic, and what you can deliver.' },
                          { t: 'Make it easy', d: 'Pitch a project that’s realistic and low-supervision.' },
                          { t: 'Show capacity', d: 'Define your skills and what is needed from the mentor.' },
                          { t: 'Follow through', d: 'The fastest way to get more projects is finishing the first one.' },
                        ].map((x) => (
                          <div key={x.t} className="flex gap-3">
                            <span
                              className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold"
                              style={{
                                borderColor: 'rgba(63,111,103,0.25)',
                                color: COLORS.accent,
                                background: 'rgba(63,111,103,0.06)',
                              }}
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
                    </CardContent>
                  </div>
                </GlowCard>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      <Divider />

      {/* MAP */}
      <Section id="map">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Start here"
              title="A simple map to finding ortho research"
              subtitle="Most students fail because they don't know where to start."
            />
          </Reveal>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Reveal delay={0.06}>
                <GlowCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Workflow className="h-5 w-5" style={{ color: COLORS.accent }} />
                      Initiative Framework
                      <span className="ml-2">
                        <Badge>Repeatable</Badge>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="mt-1 grid gap-2">
                      {[
                        'Identify a mentor (your institution + nearby programs).',
                        'Research their recent papers to learn their expertise and project style.',
                        'Create a small project pitch that fits their expertise and can be done with minimal supervision.',
                        'Send a short outreach email with a clear ask + realistic timeline.',
                      ].map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4" style={{ color: COLORS.accent }} />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>

                    <div
                      className="mt-4 rounded-xl border p-4"
                      style={{ borderColor: 'rgba(63,111,103,0.22)', background: 'rgba(63,111,103,0.06)' }}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.muted }}>
                        Key mindset
                      </div>
                      <div className="mt-2 text-sm" style={{ color: '#4b5563' }}>
                        Don’t ask “Do you have anything?” Assume each project can only support a few students. Your job is to show
                        up with a plan.
                      </div>
                    </div>
                  </CardContent>
                </GlowCard>
              </Reveal>
            </div>

            <div className="lg:col-span-5">
              <Reveal delay={0.1}>
                <div className="grid gap-6">
                  {[
                    {
                      icon: <Search className="h-5 w-5" />,
                      title: 'Where to look',
                      body: 'Residency program websites (faculty and resident pages).',
                    },
                    {
                      icon: <Network className="h-5 w-5" />,
                      title: 'Who to ask first',
                      body: 'Residents and research coordinators often know who needs help and what’s realistically publishable.',
                    },
                  ].map((x) => (
                    <GlowCard key={x.title} glow={false}>
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
    
    {/* LABS */}
      <Section id="labs">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Choose wisely"
              title="Find mentors, groups with a real pipeline"
              subtitle="A productive lab with great infrastructure is extremely valuable."
            />
          </Reveal>

          <Reveal delay={0.06}>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: <Workflow className="h-5 w-5" />,
                  title: 'Infrastructure',
                  body: 'Research coordination: Regular meetings with clear workflows and predefined roles/responsibilities.',
                },
                {
                  icon: <BarChart3 className="h-5 w-5" />,
                  title: 'Output history',
                  body: 'Recent abstracts, and publicationsin the last 12–24 months. Journal prestige can be a proxy for project quality and mentorship.',
                },
                {
                  icon: <Users className="h-5 w-5" />,
                  title: 'Mentor bandwidth',
                  body: 'This is difficult to evaluate online and at the start. However, important to value mentors who respond, delegate clearly, and have a system .”',
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
        </Container>
      </Section>

      <Divider />

      {/* INITIATIVE */}
      <Section id="initiative">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="The differentiator"
              title="Initiative beats access"
              subtitle={
  <>
    With modern AI tools and structured resources like{' '}
    <Link href="/research/playbook" className="font-semibold underline">
      Research Playbook
    </Link>, even junior students can generate thoughtful, viable project ideas — if they approach it strategically.
  </>
}
            />
          </Reveal>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <Reveal delay={0.06}>
                <GlowCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" style={{ color: COLORS.accent }} />
                      Stop asking for scraps
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="leading-relaxed">
                      “Do you have any projects?” is not enough. Most faculty already have a group of medical students working on their projects who know their workflow. The
                      fastest way in is to present a small, realistic project that fits their work.
                    </p>
                    <div className="mt-4 grid gap-2">
                      {[
                        'Read their recent papers to learn their area of interest and expertise.',
                        'Perform a literature review to identify gaps, and potential study questions.',
                        'Pick a narrow, feasible question you can execute with minimal supervision.',
                      ].map((b) => (
                        <div key={b} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4" style={{ color: COLORS.accent }} />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </GlowCard>
              </Reveal>
            </div>

            <div className="lg:col-span-6">
              <Reveal delay={0.1}>
                <GlowCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" style={{ color: COLORS.accent }} />
                      The “easy to mentor” standard
                      <span className="ml-2">
                        <Badge>What faculty want</Badge>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="mt-1 grid gap-2">
                      {[
                        'Clear question + simple methods (retrospective, SR, database, AI evaluation).',
                        'Well done literature review on the topic.',
                        'A timeline you can actually hit.',
                        'Ownership: you drive the work forward without constant reminders.',
                      ].map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4" style={{ color: COLORS.accent }} />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </GlowCard>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      <Divider />

      {/* PITCH */}
      <Section id="pitch">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="What to send"
              title="Pitch a project, not a request"
              subtitle="Your email should prove you did the homework and reduce the mentor’s workload."
            />
          </Reveal>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Reveal delay={0.06}>
                <GlowCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" style={{ color: COLORS.accent }} />
                      The 6-sentence pitch
                      <span className="ml-2">
                        <Badge>Copy/paste</Badge>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ol className="mt-1 grid gap-2 list-decimal pl-5">
                      {[
                        'Why their specific work caught your attention.',
                        'The exact clinical problem and gap you noticed in your literature review.',
                        'Your proposed question/hypothesis.',
                        'Proposed methods (design, cohort, outcomes).',
                        'What you need from them (data access, mentorship, etc).',
                        'What you will deliver and by when.',
                      ].map((b) => (
                        <li key={b} className="text-sm" style={{ color: '#4b5563' }}>
                          {b}
                        </li>
                      ))}
                    </ol>

                    <div
                      className="mt-4 rounded-xl border p-4"
                      style={{ borderColor: 'rgba(63,111,103,0.22)', background: 'rgba(63,111,103,0.06)' }}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.muted }}>
                        Reality check
                      </div>
                      <div className="mt-2 text-sm" style={{ color: '#4b5563' }}>
                        Many projects can’t support unlimited students. A concrete plan makes you stand out immediately.
                      </div>
                    </div>
                  </CardContent>
                </GlowCard>
              </Reveal>
            </div>

            <div className="lg:col-span-5">
              <Reveal delay={0.1}>
                <GlowCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Handshake className="h-5 w-5" style={{ color: COLORS.accent }} />
                      Make it easy to say yes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Accordion
                      items={[
                        {
                          title: 'Good vs bad ask',
                          tag: 'Tone',
                          icon: <Sparkles className="h-4 w-4" />,
                          body: (
                            <div className="space-y-2">
                              <p>
                                <span className="font-semibold">Avoid:</span> “Do you have any projects I can help with?”
                              </p>
                              <p>
                                <span className="font-semibold">Better:</span> “I read your recent work on X. I performed a literature review and identified a gap in the literature. I drafted a small
                                research protocol I can execute with minimal supervision. Would you be willing to mentor me on this project?”
                              </p>
                            </div>
                          ),
                        },
                        {
                          title: 'What to attach',
                          tag: 'Practical',
                          icon: <ClipboardList className="h-4 w-4" />,
                          body: (
                            <ul className="mt-2 grid gap-2">
                              {[
                                'CV (1 page is fine early).',
                                'A 1-paragraph project pitch or mini-protocol.',
                                'Your weekly availability and timeline.',
                              ].map((b) => (
                                <li key={b} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="mt-0.5 h-4 w-4" style={{ color: COLORS.accent }} />
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          ),
                        },
                      ]}
                    />

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href="/research/email-template"
                        className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-black/[0.03]"
                        style={{ borderColor: 'rgba(148,163,184,0.35)', color: COLORS.headingSub }}
                      >
                        Email template
                        <ArrowRight className="h-4 w-4 opacity-60" />
                      </Link>
                      <Link
                        href="/research/playbook"
                        className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-black/[0.03]"
                        style={{ borderColor: 'rgba(148,163,184,0.35)', color: COLORS.headingSub }}
                      >
                        Research Playbook
                        <ArrowRight className="h-4 w-4 opacity-60" />
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
                          Want the full system and templates?
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: '#4b5563' }}>
                        This page helps you find opportunities. The Research Playbook helps you execute — from idea to submission.
                      </p>
                    </div>
                    <div className="md:col-span-4 md:flex md:justify-end">
                      <div className="flex flex-wrap gap-2">
                        <CTAButton href="/research/playbook" variant="primary" icon={<FlaskConical className="h-4 w-4" />}>
                          Research Playbook
                        </CTAButton>
                        <CTAButton href="/research/email-template" variant="secondary" icon={<Mail className="h-4 w-4" />}>
                          Email Template
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