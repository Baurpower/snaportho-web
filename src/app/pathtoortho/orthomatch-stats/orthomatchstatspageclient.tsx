'use client';

import { motion } from 'framer-motion';
import { BarChart3, Calculator, GitBranch, GraduationCap, ShieldAlert, Stethoscope, Users } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const COLORS = {
  bg: '#f9f7f4',
  text: '#1f2937',
  heading: '#444444',
  headingSub: '#333333',
  accent: '#597498',
  border: 'rgba(148,163,184,0.6)',
} as const;

const matchData = [
  {
    year: 2026,
    totalApplicants: 1652,
    totalMatched: 963,
    matchTotal: 0.582929782,
    mdApplicants: 1129,
    mdMatched: 765,
    matchMD: 0.677590788,
    doApplicants: 283,
    doMatched: 121,
    matchDO: 0.427561837,
    matchedMDGrad: 53,
    matchedDOGrad: 14,
    matchedUSIMG: 5,
    matchedNonUSIMG: 5,
  },
  {
    year: 2025,
    totalApplicants: 1590,
    totalMatched: 929,
    matchTotal: 0.58427673,
    mdApplicants: 1045,
    mdMatched: 724,
    matchMD: 0.692822967,
    doApplicants: 295,
    doMatched: 131,
    matchDO: 0.444067797,
    matchedMDGrad: 43,
    matchedDOGrad: 9,
    matchedUSIMG: 8,
    matchedNonUSIMG: 14,
  },
  {
    year: 2024,
    totalApplicants: 1492,
    totalMatched: 916,
    matchTotal: 0.613941019,
    mdApplicants: 1008,
    mdMatched: 726,
    matchMD: 0.720238095,
    doApplicants: 256,
    doMatched: 117,
    matchDO: 0.45703125,
    matchedMDGrad: 53,
    matchedDOGrad: 11,
    matchedUSIMG: 6,
    matchedNonUSIMG: 2,
  },
  {
    year: 2023,
    totalApplicants: 1425,
    totalMatched: 899,
    matchTotal: 0.630877193,
    mdApplicants: 947,
    mdMatched: 690,
    matchMD: 0.728616684,
    doApplicants: 237,
    doMatched: 119,
    matchDO: 0.502109705,
    matchedMDGrad: 69,
    matchedDOGrad: 7,
    matchedUSIMG: 8,
    matchedNonUSIMG: 4,
  },
  {
    year: 2022,
    totalApplicants: 1470,
    totalMatched: 875,
    matchTotal: 0.595238095,
    mdApplicants: 1086,
    mdMatched: 705,
    matchMD: 0.649171271,
    doApplicants: 205,
    doMatched: 111,
    matchDO: 0.541463415,
    matchedMDGrad: 36,
    matchedDOGrad: 4,
    matchedUSIMG: 8,
    matchedNonUSIMG: 11,
  },
  {
    year: 2021,
    totalApplicants: 1289,
    totalMatched: 868,
    matchTotal: 0.673390225,
    mdApplicants: 934,
    mdMatched: 699,
    matchMD: 0.748394004,
    doApplicants: 172,
    doMatched: 107,
    matchDO: 0.622093023,
    matchedMDGrad: 40,
    matchedDOGrad: 12,
    matchedUSIMG: 5,
    matchedNonUSIMG: 3,
  },
  {
    year: 2020,
    totalApplicants: 1192,
    totalMatched: 849,
    matchTotal: 0.712248322,
    mdApplicants: 867,
    mdMatched: 686,
    matchMD: 0.791234141,
    doApplicants: 177,
    doMatched: 112,
    matchDO: 0.632768362,
    matchedMDGrad: 28,
    matchedDOGrad: 6,
    matchedUSIMG: 5,
    matchedNonUSIMG: 7,
  },
];

const chartingOutcomesData = {
  md: {
    matched: 628,
    notMatched: 245,
    step2: { matched: 259, notMatched: 251 },
    specialties: {
      matched: { one: 570, two: 49, three: 7, fourOrMore: 2 },
      notMatched: { one: 197, two: 40, three: 7, fourOrMore: 1 },
    },
  },
  do: {
    matched: 94,
    notMatched: 115,
    step2: { matched: 256, notMatched: 245 },
    comlex2: { matched: 623, notMatched: 568 },
    specialties: {
      matched: { one: 73, two: 18, three: 3, fourOrMore: 0 },
      notMatched: { one: 67, two: 45, three: 2, fourOrMore: 1 },
    },
  },
} as const;

type ApplicantType = 'md' | 'do' | 'us-img' | 'non-us-img';

const scoreRanges = [
  { id: '220-or-less', label: '220 or less' },
  { id: '221-230', label: '221–230' },
  { id: '231-240', label: '231–240' },
  { id: '241-250', label: '241–250' },
  { id: '251-260', label: '251–260' },
  { id: '261-270', label: '261–270' },
  { id: '271-280', label: '271–280' },
] as const;

const scoreOutcomes = {
  md: [
    { matched: 1, notMatched: 3 },
    { matched: 10, notMatched: 21 },
    { matched: 34, notMatched: 34 },
    { matched: 115, notMatched: 58 },
    { matched: 200, notMatched: 68 },
    { matched: 183, notMatched: 53 },
    { matched: 84, notMatched: 7 },
  ],
  do: [
    { matched: 1, notMatched: 2 },
    { matched: 1, notMatched: 7 },
    { matched: 6, notMatched: 27 },
    { matched: 15, notMatched: 25 },
    { matched: 39, notMatched: 22 },
    { matched: 19, notMatched: 7 },
    { matched: 0, notMatched: 2 },
  ],
} as const;

const applicantLabels: Record<ApplicantType, string> = {
  md: 'U.S. MD senior',
  do: 'U.S. DO senior',
  'us-img': 'U.S. IMG',
  'non-us-img': 'Non-U.S. IMG',
};

const imgProbabilities = {
  'us-img': [0.121, 0.131, 0.15, 0.18, 0.211, 0.239, 0.255],
  'non-us-img': [0.015, 0.021, 0.057, 0.126, 0.278, 0.502, 0.613],
} as const;

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10">{children}</div>;
}

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`py-12 sm:py-16 lg:py-20 ${className}`}>{children}</section>;
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

function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-base sm:text-lg font-semibold tracking-tight ${className}`} style={{ color: COLORS.headingSub }}>
      {children}
    </h3>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: '#6b7280' }}>
      {children}
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
    <div className="mb-6 sm:mb-8">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: COLORS.heading }}>
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: '#4b5563' }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function Divider() {
  return (
    <div className="border-t" style={{ borderColor: 'rgba(148,163,184,0.25)' }}>
      <Container>
        <div className="h-0" />
      </Container>
    </div>
  );
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatInt(value: number) {
  return value.toLocaleString();
}

function formatWholePercent(numerator: number, denominator: number) {
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export default function PathToOrthoMatchStatsPage() {
  const latestYear = matchData[0];
  const earliestYear = matchData[matchData.length - 1];
  const [applicantType, setApplicantType] = useState<ApplicantType>('md');
  const [scoreRangeIndex, setScoreRangeIndex] = useState(4);
  const scoreRange = scoreRanges[scoreRangeIndex];
  const domesticOutcome = applicantType === 'md' || applicantType === 'do' ? scoreOutcomes[applicantType][scoreRangeIndex] : null;
  const probability = domesticOutcome
    ? domesticOutcome.matched / (domesticOutcome.matched + domesticOutcome.notMatched)
    : imgProbabilities[applicantType as 'us-img' | 'non-us-img'][scoreRangeIndex];
  const domesticSample = domesticOutcome ? domesticOutcome.matched + domesticOutcome.notMatched : null;

  return (
    <main className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute left-1/2 top-[-14%] h-[52vh] w-[80vw] -translate-x-1/2 rounded-[999px] blur-3xl"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(89,116,152,0.08), transparent 60%)',
          }}
        />
        <div
          className="absolute right-[-12%] bottom-[-18%] h-[38vh] w-[48vw] rounded-[999px] blur-3xl"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(89,116,152,0.05), transparent 60%)',
          }}
        />
      </div>

      <Section>
        <Container>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-8">
              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.45 }}
                className="text-4xl sm:text-5xl font-bold tracking-tight"
                style={{ color: COLORS.heading }}
              >
                Basic Match <span style={{ color: COLORS.accent }}>Statistics</span>
              </motion.h1>

              <p className="mt-4 max-w-3xl leading-relaxed" style={{ color: '#4b5563' }}>
                A quick look at orthopaedic surgery match trends over time. Use this page to get a feel for overall
                competitiveness and how applicant outcomes have differed across degree types and applicant backgrounds.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <Divider />

      <Section>
        <Container>
          <SectionHeading
            eyebrow="At a Glance"
            title="Quick Takeaways"
            subtitle="Start with the latest match picture, then explore how board-score outcomes differed by applicant type."
          />

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Overall Match Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-semibold" style={{ color: COLORS.heading }}>
                  {formatPercent(latestYear.matchTotal)}
                </div>
                <p className="mt-2">
                  In {latestYear.year}, {formatInt(latestYear.totalMatched)} of{' '}
                  {formatInt(latestYear.totalApplicants)} total applicants matched.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" style={{ color: COLORS.accent }} />
                  MD vs DO Match Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-end gap-6">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">MD</div>
                    <div className="text-3xl font-semibold" style={{ color: COLORS.heading }}>
                      {formatPercent(latestYear.matchMD)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">DO</div>
                    <div className="text-3xl font-semibold" style={{ color: COLORS.heading }}>
                      {formatPercent(latestYear.matchDO)}
                    </div>
                  </div>
                </div>
                <p className="mt-2">The degree-type gap remained substantial in the most recent cycle.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Applicant Volume Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-semibold" style={{ color: COLORS.heading }}>
                  +{formatInt(latestYear.totalApplicants - earliestYear.totalApplicants)}
                </div>
                <p className="mt-2">
                  Total applicants increased from {formatInt(earliestYear.totalApplicants)} in {earliestYear.year} to{' '}
                  {formatInt(latestYear.totalApplicants)} in {latestYear.year}.
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      <Divider />

      <Section>
        <Container>
          <SectionHeading
            eyebrow="2026 Charting Outcomes"
            title="Explore Step 2 outcomes"
            subtitle="Choose an applicant group and score range to see the reported or modeled chance of matching orthopaedic surgery as the preferred specialty."
          />

          <Card className="overflow-hidden">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="border-b p-6 md:p-8 lg:border-b-0 lg:border-r" style={{ borderColor: COLORS.border }}>
                <div className="text-sm font-semibold" style={{ color: COLORS.headingSub }}>
                  1. Applicant type
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                  {(Object.keys(applicantLabels) as ApplicantType[]).map((type) => {
                    const selected = applicantType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setApplicantType(type)}
                        className="rounded-xl border px-3 py-3 text-sm font-semibold transition"
                        style={{
                          borderColor: selected ? COLORS.accent : 'rgba(148,163,184,0.35)',
                          background: selected ? 'rgba(89,116,152,0.10)' : '#fff',
                          color: selected ? COLORS.accent : COLORS.headingSub,
                        }}
                      >
                        {applicantLabels[type]}
                      </button>
                    );
                  })}
                </div>

                <label className="mt-7 block text-sm font-semibold" htmlFor="step-2-range" style={{ color: COLORS.headingSub }}>
                  2. Step 2 CK range
                </label>
                <select
                  id="step-2-range"
                  value={scoreRangeIndex}
                  onChange={(event) => setScoreRangeIndex(Number(event.target.value))}
                  className="mt-3 w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium outline-none"
                  style={{ borderColor: COLORS.border, color: COLORS.headingSub }}
                >
                  {scoreRanges.map((range, index) => (
                    <option key={range.id} value={index}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-center p-6 md:p-8" style={{ background: 'rgba(89,116,152,0.06)' }}>
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.accent }}>
                  <Calculator className="h-5 w-5" />
                  Estimated match outcome
                </div>
                <div className="mt-5 text-5xl font-bold tracking-tight" style={{ color: COLORS.heading }}>
                  {formatPercent(probability)}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {applicantLabels[applicantType]} with a Step 2 CK score of {scoreRange.label}.
                </p>

                {domesticOutcome ? (
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Matched</div>
                      <div className="mt-1 text-2xl font-semibold" style={{ color: COLORS.heading }}>
                        {domesticOutcome.matched}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Did not match</div>
                      <div className="mt-1 text-2xl font-semibold" style={{ color: COLORS.heading }}>
                        {domesticOutcome.notMatched}
                      </div>
                    </div>
                  </div>
                ) : null}

                <p className="mt-5 text-xs leading-relaxed text-gray-500">
                  {domesticOutcome
                    ? `Observed rate within this score band (n=${domesticSample}) in the 2026 U.S. senior report.`
                    : `Approximate probability read from the NRMP 2026 model, which pooled 2024–2026 applicants. The 2026 matched cohort was below the five-person reporting threshold (${applicantType === 'us-img' ? 'U.S. IMG n=4' : 'non-U.S. IMG n=2'}).${scoreRangeIndex === 6 ? ' This range uses the model endpoint near 270.' : ''}`}
                </p>
              </div>
            </div>
          </Card>

          <div className="mt-6 flex gap-3 rounded-2xl border px-5 py-4 text-sm leading-relaxed text-gray-600" style={{ borderColor: COLORS.border }}>
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" style={{ color: COLORS.accent }} />
            <p>
              This is a historical score-only estimate—not a personalized prediction. Away rotations, letters,
              research, interviews, program list, number of ranks, and the rest of the application materially affect
              outcomes. Very small score bands can be unstable.
            </p>
          </div>
        </Container>
      </Section>

      <Divider />

      <Section className="hidden">
        <Container>
          <SectionHeading
            eyebrow="Application Strategy"
            title="Dual applying: what applicants actually did"
            subtitle="NRMP reports the number of distinct specialties applicants ranked. Ranking two or more specialties is used here as the practical marker of dual applying."
          />

          <div className="grid gap-6 lg:grid-cols-2">
            {[
              {
                label: 'U.S. MD seniors',
                icon: GraduationCap,
                matchedCount: 58,
                matchedTotal: chartingOutcomesData.md.matched,
                notMatchedCount: 48,
                notMatchedTotal: chartingOutcomesData.md.notMatched,
                detail: '570 of 628 matched and 197 of 245 unmatched applicants ranked orthopaedics only.',
              },
              {
                label: 'U.S. DO seniors',
                icon: GitBranch,
                matchedCount: 21,
                matchedTotal: chartingOutcomesData.do.matched,
                notMatchedCount: 48,
                notMatchedTotal: chartingOutcomesData.do.notMatched,
                detail: '73 of 94 matched and 67 of 115 unmatched applicants ranked orthopaedics only.',
              },
            ].map((group) => {
              const Icon = group.icon;
              return (
                <Card key={group.label}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5" style={{ color: COLORS.accent }} />
                      {group.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl p-4" style={{ background: 'rgba(89,116,152,0.08)' }}>
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Matched</div>
                        <div className="mt-1 text-3xl font-semibold" style={{ color: COLORS.heading }}>
                          {formatWholePercent(group.matchedCount, group.matchedTotal)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">{group.matchedCount} ranked 2+ specialties</div>
                      </div>
                      <div className="rounded-xl p-4" style={{ background: 'rgba(156,163,175,0.12)' }}>
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Did not match</div>
                        <div className="mt-1 text-3xl font-semibold" style={{ color: COLORS.heading }}>
                          {formatWholePercent(group.notMatchedCount, group.notMatchedTotal)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">{group.notMatchedCount} ranked 2+ specialties</div>
                      </div>
                    </div>
                    <p className="mt-4">{group.detail}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle>What this means for your strategy</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              Dual applying was more common among applicants who did not match their preferred specialty, but this does
              not mean dual applying caused the outcome. Applicants may choose a second specialty because they already
              recognize higher application risk. If you are considering it, decide early with mentors, build a credible
              second-specialty application, and understand that the NRMP chart reflects ranked specialties—not every
              specialty to which an applicant submitted an application.
            </CardContent>
          </Card>

          <p className="mt-5 text-xs leading-relaxed text-gray-500">
            Source: NRMP 2026 Charting Outcomes in the Match, U.S. MD Seniors and U.S. DO Seniors, Orthopaedic Surgery
            tables and charts. The orthopaedic samples shown here include applicants who consented to research use: MD
            n=873 and DO n=209. Board scores are primary-source NRMP data; research and other experience measures in the
            reports are self-reported.
          </p>
        </Container>
      </Section>

      <Divider />

      <Section className="hidden">
        <Container>
          <SectionHeading
            eyebrow="At a Glance"
            title="Quick Takeaways"
            subtitle="These cards give a fast snapshot before you dive into the full table."
          />

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Overall Match Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-semibold" style={{ color: COLORS.heading }}>
                  {formatPercent(latestYear.matchTotal)}
                </div>
                <p className="mt-2">
                  In {latestYear.year}, {formatInt(latestYear.totalMatched)} of {formatInt(latestYear.totalApplicants)} total
                  applicants matched.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" style={{ color: COLORS.accent }} />
                  MD vs DO Match Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-end gap-6">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">MD</div>
                    <div className="text-3xl font-semibold" style={{ color: COLORS.heading }}>
                      {formatPercent(latestYear.matchMD)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">DO</div>
                    <div className="text-3xl font-semibold" style={{ color: COLORS.heading }}>
                      {formatPercent(latestYear.matchDO)}
                    </div>
                  </div>
                </div>
                <p className="mt-2">
                  The gap remains noticeable, with MD applicants matching at a higher rate than DO applicants in the
                  most recent cycle.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Applicant Volume Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-semibold" style={{ color: COLORS.heading }}>
                  +{formatInt(latestYear.totalApplicants - earliestYear.totalApplicants)}
                </div>
                <p className="mt-2">
                  Total applicants increased from {formatInt(earliestYear.totalApplicants)} in {earliestYear.year} to{' '}
                  {formatInt(latestYear.totalApplicants)} in {latestYear.year}.
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      <Divider />

      <Section>
        <Container>
          <SectionHeading
            eyebrow="Full Data"
            title="Orthopaedic Match Statistics by Year"
            subtitle="Scroll horizontally on smaller screens. Percentages are rounded for readability."
          />

          <Card className="overflow-hidden">
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-sm">
                <thead style={{ background: 'rgba(89,116,152,0.08)' }}>
                  <tr className="border-b" style={{ borderColor: COLORS.border }}>
                    {[
                      'Year',
                      'Total Applicants',
                      'Total Matched',
                      'Match % Total',
                      'MD Applicants',
                      'MD Matched',
                      'Match % MD',
                      'DO Applicants',
                      'DO Matched',
                      'Match % DO',
                      'Matched MD Grad',
                      'Matched DO Grad',
                      'Matched US IMG',
                      'Matched Non-US IMG',
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: COLORS.headingSub }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matchData.map((row, idx) => (
                    <tr
                      key={row.year}
                      className="border-b last:border-b-0"
                      style={{
                        borderColor: 'rgba(148,163,184,0.18)',
                        background: idx % 2 === 0 ? '#ffffff' : 'rgba(249,247,244,0.7)',
                      }}
                    >
                      <td className="px-4 py-4 font-semibold" style={{ color: COLORS.headingSub }}>
                        {row.year}
                      </td>
                      <td className="px-4 py-4">{formatInt(row.totalApplicants)}</td>
                      <td className="px-4 py-4">{formatInt(row.totalMatched)}</td>
                      <td className="px-4 py-4 font-medium">{formatPercent(row.matchTotal)}</td>
                      <td className="px-4 py-4">{formatInt(row.mdApplicants)}</td>
                      <td className="px-4 py-4">{formatInt(row.mdMatched)}</td>
                      <td className="px-4 py-4">{formatPercent(row.matchMD)}</td>
                      <td className="px-4 py-4">{formatInt(row.doApplicants)}</td>
                      <td className="px-4 py-4">{formatInt(row.doMatched)}</td>
                      <td className="px-4 py-4">{formatPercent(row.matchDO)}</td>
                      <td className="px-4 py-4">{row.matchedMDGrad}</td>
                      <td className="px-4 py-4">{row.matchedDOGrad}</td>
                      <td className="px-4 py-4">{row.matchedUSIMG}</td>
                      <td className="px-4 py-4">{row.matchedNonUSIMG}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {matchData.map((row) => (
                <div
                  key={row.year}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: 'rgba(148,163,184,0.25)', background: '#fff' }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold" style={{ color: COLORS.headingSub }}>
                      {row.year}
                    </h3>
                    <div
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ background: 'rgba(89,116,152,0.08)', color: COLORS.accent }}
                    >
                      Overall {formatPercent(row.matchTotal)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl p-3" style={{ background: 'rgba(249,247,244,0.9)' }}>
                      <div className="text-xs text-gray-500">Total Applicants</div>
                      <div className="mt-1 font-semibold">{formatInt(row.totalApplicants)}</div>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: 'rgba(249,247,244,0.9)' }}>
                      <div className="text-xs text-gray-500">Total Matched</div>
                      <div className="mt-1 font-semibold">{formatInt(row.totalMatched)}</div>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: 'rgba(249,247,244,0.9)' }}>
                      <div className="text-xs text-gray-500">MD Match Rate</div>
                      <div className="mt-1 font-semibold">{formatPercent(row.matchMD)}</div>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: 'rgba(249,247,244,0.9)' }}>
                      <div className="text-xs text-gray-500">DO Match Rate</div>
                      <div className="mt-1 font-semibold">{formatPercent(row.matchDO)}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">MD applicants</span>
                      <span className="font-medium">{formatInt(row.mdApplicants)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">MD matched</span>
                      <span className="font-medium">{formatInt(row.mdMatched)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">DO applicants</span>
                      <span className="font-medium">{formatInt(row.doApplicants)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">DO matched</span>
                      <span className="font-medium">{formatInt(row.doMatched)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Matched MD grad</span>
                      <span className="font-medium">{row.matchedMDGrad}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Matched DO grad</span>
                      <span className="font-medium">{row.matchedDOGrad}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Matched US IMG</span>
                      <span className="font-medium">{row.matchedUSIMG}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Matched Non-US IMG</span>
                      <span className="font-medium">{row.matchedNonUSIMG}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Container>
      </Section>

      <Divider />

      <Section>
        <Container>
          <SectionHeading
            eyebrow="How to Use This"
            title="A few practical takeaways"
            subtitle="Stats are helpful, but they work best when paired with a thoughtful application strategy."
          />

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Look at trends, not just one year',
                text: 'Single-cycle changes can be noisy. The bigger picture is that orthopaedics remains highly competitive over time.',
              },
              {
                title: 'Be realistic and intentional',
                text: 'Use these numbers to frame your application strategy, away rotations, program list, and backup planning early.',
              },
              {
                title: 'Context matters',
                text: 'Your mentors, letters, research, audition performance, and personal story still matter a lot beyond raw percentages.',
              },
            ].map((item) => (
              <Card key={item.title} className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" style={{ color: COLORS.accent }} />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">{item.text}</CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Divider />

      <Section>
        <Container>
          <SectionHeading
            eyebrow="Backup Planning"
            title="Should you dual apply?"
            subtitle="The clearest 2026 signal is how many unmatched applicants ranked orthopaedics—and no other specialty."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>U.S. MD seniors</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-4xl font-semibold" style={{ color: COLORS.heading }}>
                  197
                </div>
                <p className="mt-2">
                  of 245 unmatched applicants (80.4%) ranked orthopaedics only. Forty-eight ranked at least one other
                  specialty.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>U.S. DO seniors</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-4xl font-semibold" style={{ color: COLORS.heading }}>
                  67
                </div>
                <p className="mt-2">
                  of 115 unmatched applicants (58.3%) ranked orthopaedics only. Forty-eight ranked at least one other
                  specialty.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Why the comparison is skewed</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                Applicants do not choose dual applying at random. Many pursue a second specialty because they already
                recognize weaker scores, fewer interviews, or other application risk. That selection effect makes the
                dual-applicant group higher-risk from the start, so its match rate cannot tell us that dual applying
                itself hurts an application.
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Why it can still be worth considering</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                A thoughtful backup can preserve a path into another specialty you would genuinely enjoy. A strong
                overall applicant may also be competitive in another selective specialty—but that plan works only when
                the second application is credible, specialty-specific, and supported by appropriate mentors and
                letters. Start early rather than treating it as a last-minute safety net.
              </CardContent>
            </Card>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-gray-500">
            NRMP reports specialties ranked, not every specialty to which an applicant submitted an application.
            “Orthopaedics only” therefore means one distinct specialty on the rank list; it does not prove the applicant
            applied only to orthopaedic programs.
          </p>
        </Container>
      </Section>
    </main>
  );
}
