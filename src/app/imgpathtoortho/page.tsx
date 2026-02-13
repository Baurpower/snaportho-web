'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Compass, FileText, Globe2, GraduationCap, MapPin, Timer } from 'lucide-react';
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
    <div
      className={`rounded-2xl border shadow-sm ${className}`}
      style={{ borderColor: COLORS.border, background: '#ffffff' }}
    >
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
    <div
      className={`px-6 md:px-7 pb-6 md:pb-7 text-sm leading-relaxed ${className}`}
      style={{ color: '#4b5563' }}
    >
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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold"
      style={{ borderColor: COLORS.border, color: COLORS.accent, background: 'rgba(89,116,152,0.04)' }}
    >
      {children}
    </span>
  );
}

export default function ImgPathToOrthoStartHerePage() {
  const route = [
    {
      title: 'Step 1: Define your starting point + timeline',
      desc: 'Be honest about where you are today and how much time you can commit. Most IMG pathways take 18–36 months.',
      href: '/imgpathtoortho/timeline',
      icon: Compass,
    },
    {
      title: 'Step 2: Exams + ECFMG certification',
      desc: 'Build an exam plan that matches your timeline and visa situation. Get your ECFMG pathway squared away early.',
      href: '/imgpathtoortho/exams',
      icon: FileText,
    },
    {
      title: 'Step 3: Build a VERY strong CV',
      desc: 'Matching at a US orthopaedic program is an uphill battle and you need a CV that truly sets you apart.',
      href: '/imgpathtoortho/portfolio',
      icon: GraduationCap,
    },
    {
      title: 'Step 4: Secure US experiences (research + clinical)',
      desc: 'This is the most common “unlock” step: research output, mentorship, and credible letters.',
      href: '/imgpathtoortho/usexperiences',
      icon: MapPin,
    },
    {
      title: 'Step 5: Network + mentorship',
      desc: 'Get guidance from people who’ve matched IMGs before. Your mentors help you avoid wasted months.',
      href: '/imgpathtoortho/network',
      icon: Globe2,
    },
    {
      title: 'Step 6: Apply smart',
      desc: 'Once you have determined that orthopaedic surgery is a realistic target, careful program research is essential. Luckily, the ERAS application and NRMP Match process are the same for IMG and U.S. medical graduates.',
      href: '/imgpathtoortho/apply',
      icon: Timer,
    },
    {
      title: 'Step 7: Understand Logistics (Visas etc.)',
      desc: 'Know what programs can sponsor and what paperwork looks like so there are no late surprises.',
      href: '/imgpathtoortho/logistics',
      icon: Globe2,
    },
  ] as const;

  return (
    <main className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
      {/* Background glow */}
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
                <span style={{ color: COLORS.accent }}>IMG</span> Path to <span style={{ color: COLORS.accent }}>Ortho</span> — Start Here
              </motion.h1>

              <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: '#4b5563' }}>
                A clear, realistic route for International Medical Graduates aiming for US Orthopaedic Surgery residency.
                <span className="block mt-3">
                  This guide complements our{' '}
                  <Link href="/pathtoortho" className="font-semibold underline underline-offset-4" style={{ color: COLORS.accent }}>
                    Path to Ortho
                  </Link>{' '}
                  pages by filling IMG-specific gaps such as:
                </span>
              </p>
              

              <div className="mt-5 flex flex-wrap gap-2">
                <Pill>Timeline planning</Pill>
                <Pill>Obtaining U.S. clinical and research experience</Pill>
                <Pill>Navigating application challenges including visa requirements</Pill>
              </div>

              <p
                className="mt-6 max-w-2xl text-sm sm:text-base italic tracking-wide"
                style={{ color: COLORS.accent }}
              >
                Built by IMGs who’ve been in your shoes.
              </p>
            </div>

            <div className="lg:col-span-4">
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5" style={{ color: COLORS.accent }} />
                    Quick expectation check
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <span className="mt-0.5">•</span>
                      <span>Ortho is highly competitive; IMGs usually need exceptional scores, CV, and LORs.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5">•</span>
                      <span>Time commitment is often 18–36 months (varies by starting point).</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </Section>

      <Divider />

      {/* Route map */}
      <Section>
        <Container>
          <SectionHeading
            title="The route map"
            subtitle="Work through these in order. Each step links to a deeper page with templates, examples, and checklists."
          />

          <div className="grid gap-6 sm:grid-cols-2">
            {route.map((s) => {
              const Icon = s.icon;
              return (
                <Link key={s.title} href={s.href} className="block">
                  <Card className="transition-transform hover:-translate-y-0.5 hover:shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" style={{ color: COLORS.accent }} />
                        {s.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">{s.desc}</CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </Container>
      </Section>

      <Divider />

      {/* Choose your track */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Pick a lane"
            title="Choose your track"
            subtitle="Select the starting point that matches you. Each track links to a First 90 Days checklist."
          />

          <div className="grid gap-6 md:grid-cols-3">
            <Link href="/imgpathtoortho/track-a" className="block">
              <Card className="h-full transition-transform hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" style={{ color: COLORS.accent }} />
                    Track A: Current medical student
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  Best for students who still have flexibility for US electives, research time, and early exam planning.
                </CardContent>
              </Card>
            </Link>

            <Link href="/imgpathtoortho/track-b" className="block">
              <Card className="h-full transition-transform hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" style={{ color: COLORS.accent }} />
                    Track B: Graduate / working doctor
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  Best if you have already graduated and need a focused plan to build US signals efficiently.
                </CardContent>
              </Card>
            </Link>

            <Link href="/imgpathtoortho/track-c" className="block">
              <Card className="h-full transition-transform hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" style={{ color: COLORS.accent }} />
                    Track C: Already in US research / observership
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  Best if you are already in the US and want to turn current exposure into output, letters, and a strategy.
                </CardContent>
              </Card>
            </Link>
          </div>
        </Container>
      </Section>

      <Divider />

      {/* About / tone + disclaimer */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Note"
            title="A realistic mindset (that keeps you moving)"
            subtitle="The goal is to reduce wasted effort and help you stack credible signals."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Compass className="h-5 w-5" style={{ color: COLORS.accent }} />
                  The big picture
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                A competitive IMG application usually looks like: strong Step 2 + consistent US orthopaedic research output +
                strong US letters + a clear story that explains your path.
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Friendly disclaimer
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                This content is educational and not official legal or immigration advice. Program requirements and visa
                policies vary and can change.
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>
    </main>
  );
}
