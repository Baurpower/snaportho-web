// app/fundraising/FundPageClient.tsx
'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import React from 'react';

const DonationForm = dynamic(() => import('./donationformwrapper'), { ssr: false });

export default function FundPage() {
  // NRMP Match Day 2026 is Fri, March 20, 2026 (results released at 12:00 p.m. ET).
  const matchMomentET = '2026-03-20T12:00:00-04:00';

  const PAYPAL_DONATE_URL = 'https://www.paypal.com/donate?campaign_id=X4TU2R59GH3X6';

  // ===== Manual totals (edit these anytime) =====
  const GOAL = 1000;

  // Paste your running totals here (Stripe dashboard + PayPal total)
  const STRIPE_TOTAL = 0; // <-- update manually
  const PAYPAL_TOTAL = 0;  // <-- update manually

  const raised = STRIPE_TOTAL + PAYPAL_TOTAL;
  const pct = Math.max(0, Math.min(1, raised / GOAL));
  const remaining = Math.max(0, GOAL - raised);

  const money = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const t = useCountdown(matchMomentET);
  return (
    <main className="bg-cream min-h-screen font-sans text-midnight">
      <div className="max-w-5xl mx-auto px-6 sm:px-10 py-14 md:py-20 space-y-10">
       {/* ── Campaign Header ───────────────────────────── */}
<section className="relative overflow-hidden rounded-[32px] border border-midnight/10 bg-white shadow-[0_30px_80px_-40px_rgba(10,25,41,0.35)]">
  {/* premium glow */}
  <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-blue-50" />
  <div className="absolute -top-28 -right-28 h-80 w-80 rounded-full bg-sky/25 blur-3xl" />
  <div className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-blue-200/25 blur-3xl" />
  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-midnight/10 to-transparent" />

      <div className="relative p-8 sm:p-12">
    <div className="flex flex-col items-center text-center gap-6">
      {/* badge row */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge>⏳ Countdown to Match Fundraiser</Badge>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-midnight/70 ring-1 ring-midnight/10">
          Goal: {money(GOAL)}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-midnight/70 ring-1 ring-midnight/10">
          Raised: <span className="text-navy">{money(raised)}</span>
        </span>
      </div>

      <h1 className="text-4xl sm:text-6xl font-extrabold text-navy leading-[1.05] tracking-tight">
        Keep SnapOrtho FREE
        <span className="block text-sky-dark">for the next Match class.</span>
      </h1>

      <p className="text-lg sm:text-xl text-midnight/80 max-w-3xl leading-relaxed">
        SnapOrtho was built to help junior learners excel in orthopaedics and match into the career of their dreams.
      </p>

      {/* Progress + Countdown (single hero card) */}
      <div className="w-full max-w-4xl rounded-3xl border border-midnight/10 bg-white/70 backdrop-blur p-6 sm:p-8 shadow-sm">
  {/* Title row */}
  <div className="flex items-center justify-between gap-4 mb-5">
    <div className="text-left">
      <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy">
  Countdown to Match Fundraiser
</div>
    </div>
  </div>

  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-7">
    {/* Left: progress */}
    <div className="flex-1 text-left">
      <div className="flex items-baseline justify-between gap-4">
        <div className="text-xs font-semibold tracking-wide text-midnight/50 uppercase">
          Progress
        </div>
        <div className="text-xs font-semibold text-midnight/45 tabular-nums">
          {Math.round(pct * 100)}%
        </div>
      </div>

      <div className="mt-1 text-3xl sm:text-4xl font-extrabold text-navy tabular-nums">
        {money(raised)}
        <span className="text-midnight/30 font-semibold"> / {money(GOAL)}</span>
      </div>

      <div className="mt-3 h-2.5 w-full rounded-full bg-midnight/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-sky transition-[width] duration-700"
          style={{ width: `${pct * 100}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct * 100)}
        />
      </div>

      <div className="mt-2 text-sm text-midnight/65">
        {remaining === 0 ? (
          <span className="font-semibold text-sky-dark">Goal reached — thank you ❤️</span>
        ) : (
          <>
            <span className="font-semibold text-navy">{money(remaining)}</span> to go.
          </>
        )}
      </div>
    </div>

    {/* Right: countdown (bigger emphasis) */}
    <div className="md:w-[240px] flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4">
      <div className="text-left md:text-right">
        <div className="text-xs font-semibold tracking-wide text-midnight/50 uppercase">
          Countdown
        </div>
        <div className="mt-1 text-sm font-semibold text-midnight/70">
          Until Match Day
        </div>
      </div>

      <div className="text-center md:text-right">
        <div className="inline-flex items-center justify-center rounded-3xl bg-navy text-white px-7 py-6 shadow-sm ring-1 ring-white/10">
          <div className="text-6xl sm:text-7xl font-extrabold leading-none tabular-nums">
            {t.days}
          </div>
        </div>
        <div className="mt-2 text-[11px] font-semibold text-midnight/45 uppercase tracking-[0.2em]">
          DAYS
        </div>
      </div>
    </div>
  </div>

 {/* single CTA row */}
<div className="mt-7 flex flex-col sm:flex-row items-center justify-between gap-4">
  {/* Left: Donate + trust text */}
  <div className="flex flex-col items-center sm:items-start gap-2">
    <Link
      href="#donate"
      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-sky text-white font-semibold text-base shadow-lg hover:bg-sky/90 transition"
    >
      💙 Donate
    </Link>

    <div className="text-xs text-midnight/50">
      Secure checkout · No account needed
    </div>
  </div>
</div>




      {/* Mini cards */}
      <div className="pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl">
        <MiniCard
          title="Keep it accessible"
          desc="Cover infrastructure so junior learners can keep using SnapOrtho."
        />
        <MiniCard
          title="Support new content"
          desc="Fund new modules, visuals, and Practice content drops."
        />
        <MiniCard
          title="Reach more students"
          desc="Help more students discover the resource before away season."
        />
      </div>
    </div>
  </div>
</div>
</section>

        {/* Snapshot / Social Proof */}
        <section className="relative isolate grid gap-10 place-items-center text-center bg-gradient-to-br from-sky-50 to-cream p-8 rounded-3xl shadow-md">
          <div className="bg-white rounded-[30px] px-8 sm:px-14 py-12 sm:py-16 space-y-8 w-full max-w-4xl">
            <div className="flex flex-col items-center gap-3">
              <Badge>📈 Momentum</Badge>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-navy leading-tight">
                Built for junior learners. Growing every week.
              </h2>
              <p className="text-midnight/80 max-w-2xl">
                We’re focused on clean explanations, visuals that stick, and practice that feels like real fracture conference.
              </p>
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center max-w-3xl mx-auto">
  <Stat value="1500+" label="Downloads" />
  <Stat value="900+" label="Active Accounts" />
  <Stat value="5/5" label="App Rating" />
</ul>

            <div className="flex justify-center gap-1" aria-label="5 star rating">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="text-yellow-400 text-2xl">
                  ★
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="#donate"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-sky text-white font-semibold text-lg shadow-lg hover:bg-sky/90 transition"
              >
                💙 Help keep it accessible
              </Link>
              <p className="text-sm text-midnight/60">Securely processed via Stripe. No account needed.</p>
            </div>
          </div>

          <span className="absolute -top-12 -left-16 w-60 h-60 bg-sky/20 blur-3xl rounded-full -z-10" />
        </section>

        
        {/* Impact (anchor for CTA) */}
<section
  id="impact"
  className="relative overflow-hidden rounded-[32px] border border-midnight/10 bg-white shadow-sm"
>
  {/* soft background */}
  <div className="absolute inset-0 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/60" />
  <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky/15 blur-3xl" />
  <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-200/15 blur-3xl" />

  <div className="relative p-8 sm:p-10">
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div className="text-left">
        <div className="inline-flex items-center gap-2 text-sky-dark font-semibold">
          <span className="text-xl">🌟</span>
          <span className="text-lg sm:text-xl">How your donation helps</span>
        </div>
        <p className="mt-2 text-sm sm:text-base text-midnight/70 max-w-2xl">
          Every dollar keeps SnapOrtho accessible and helps us develop higher-quality learning content.
        </p>
      </div>

      <Link
        href="#donate"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-navy font-semibold ring-1 ring-midnight/10 hover:ring-midnight/20 shadow-sm transition"
      >
        Donate →
      </Link>
    </div>

    <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-5">
      <ImpactCard
        icon="🧠"
        title="Keep core resources accessible"
        subtitle="Infrastructure that keeps everything fast, stable, and free."
        bullets={[
          'Hosting + infrastructure',
          'Content delivery + media storage',
          'Ongoing maintenance & support',
        ]}
      />

      <ImpactCard
        icon="📚"
        title="Build new learning content"
        subtitle="More high-yield modules to help students prepare for Match."
        bullets={[
          'New modules + visuals',
          'Practice library expansions',
          'Case-prep tools + refinements',
        ]}
      />
    </div>
  </div>
</section>


        {/* Timeline */}
        <section className="bg-white/80 p-8 rounded-3xl shadow-inner space-y-5">
          <SectionTitle emoji="🛠️" text="The journey so far" />
          <ol className="relative border-l-2 border-sky/30 pl-6 space-y-10">
            <TimelineItem year="2024" title="Idea & Sketches" desc="A frustrated medical student created fracture classification mnemonics between cases." />
            <TimelineItem year="Feb 2025" title="App Launch" desc="SnapOrtho officially launched on the App Store." />
            <TimelineItem year="April 2025" title="Team Expansion" desc="MyOrtho Solutions was formed and Dr. Austin Nguyen joined the team." />
            <TimelineItem year="May 2025" title="Practice Released" desc='Our flagship “Practice” feature went live to boost fracture conference prep.' />
            <TimelineItem year="June 2025" title="Learn Drops" desc="SnapOrtho Learn launched with our first animated video. More releasing monthly." />
            <TimelineItem year="July 2025" title="Meet BroBot" desc="BroBot launched to help prepare for cases." />
            <TimelineItem year="September 2025" title="Path to Ortho" desc="Path to Ortho was created to guide students through each step of the journey to becoming an orthopaedic surgeon." />
          </ol>
        </section>

        {/* Donation */}
        <section id="donate" className="scroll-mt-24 md:scroll-mt-28 bg-white p-8 rounded-3xl shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <SectionTitle emoji="💸" text="Donate to the campaign" />
            <CountdownInline targetISO={matchMomentET} />
          </div>

          <p className="text-midnight/80 max-w-2xl">
            Every contribution — large or small — helps keep SnapOrtho accessible for the next wave of students heading into the year.
            Securely processed via Stripe.
          </p>

          {/* IMPORTANT: Keep Stripe logic untouched — DonationForm stays exactly as-is */}
          <div className="bg-white border border-midnight/10 shadow-xl p-6 md:p-8 rounded-2xl">
            <DonationForm />
          </div>
          {/* PayPal option (premium) */}
<div className="relative overflow-hidden rounded-3xl border border-midnight/10 bg-white shadow-sm">
  {/* premium background */}
  <div className="absolute inset-0 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/60" />
  <div className="absolute -top-20 -right-24 h-72 w-72 rounded-full bg-sky/20 blur-3xl" />
  <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-200/20 blur-3xl" />
  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-midnight/10 to-transparent" />

  <div className="relative p-6 md:p-7">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
      {/* Left copy */}
      <div className="text-left">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-midnight/70 ring-1 ring-midnight/10">
          <span className="h-2 w-2 rounded-full bg-sky" />
          Alternative checkout
        </div>

        <div className="mt-3 text-xl sm:text-2xl font-extrabold text-navy tracking-tight">
          Donate via PayPal
        </div>

        <p className="mt-1 text-sm text-midnight/70 max-w-xl leading-relaxed">
          Prefer PayPal? Support the same campaign in a secure PayPal checkout. Opens in a new tab.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-midnight/55">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 ring-1 ring-midnight/10">
            Fast checkout
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 ring-1 ring-midnight/10">
            No account required (PayPal supports cards)
          </span>
        </div>
      </div>

      {/* Right CTA */}
      <div className="flex items-center justify-start md:justify-end">
        <a
          href={PAYPAL_DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-flex items-center justify-center rounded-full px-7 py-3.5 font-semibold text-white shadow-lg transition hover:-translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-sky/40"
        >
          {/* button background */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-r from-navy via-sky-dark to-blue-600" />
          {/* glossy highlight */}
          <span className="absolute -inset-px rounded-full opacity-0 group-hover:opacity-100 transition opacity-100">
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-white/0 via-white/20 to-white/0" />
          </span>
          {/* subtle ring */}
          <span className="absolute inset-0 rounded-full ring-1 ring-white/15" />

          <span className="relative flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
              <span className="text-lg">🅿️</span>
            </span>
            <span>Donate with PayPal</span>
            <span aria-hidden className="opacity-90">→</span>
          </span>
        </a>
      </div>
    </div>
  </div>
</div>
        </section>
        

        {/* Footer */}
        <footer className="text-center text-sm text-midnight/50 pt-12 border-t border-midnight/10">
          Have an idea or want to partner?{' '}
          <a href="mailto:support@snap-ortho.com" className="underline">
            Contact us
          </a>
        </footer>
      </div>
    </main>
  );
}

/* ───────────────────────── Components ───────────────────────── */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-sky/10 px-3 py-1 text-sm font-semibold text-sky-dark ring-1 ring-sky/15">
      {children}
    </span>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <li className="flex flex-col">
      <span className="text-2xl font-extrabold text-navy">{value}</span>
      <span className="text-sm text-midnight/70">{label}</span>
    </li>
  );
}

function SectionTitle({ emoji, text }: { emoji: string; text: string }) {
  return (
    <h2 className="text-3xl font-bold flex items-center gap-2">
      <span>{emoji}</span>
      <span>{text}</span>
    </h2>
  );
}

function TimelineItem({ year, title, desc }: { year: string; title: string; desc: string }) {
  return (
    <li className="relative pl-6">
      <span className="absolute -left-[11px] top-1 w-3 h-3 bg-sky rounded-full" />
      <span className="text-sm font-semibold text-sky-dark">{year}</span>
      <h4 className="font-semibold text-midnight mt-1">{title}</h4>
      <p className="text-sm text-midnight/80 leading-relaxed">{desc}</p>
    </li>
  );
}

function MiniCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur border border-midnight/10 p-5 shadow-sm">
      <div className="font-semibold text-navy">{title}</div>
      <div className="text-sm text-midnight/75 mt-1 leading-relaxed">{desc}</div>
    </div>
  );
}

function ImpactCard({
  icon,
  title,
  subtitle,
  bullets,
}: {
  icon: string;
  title: string;
  subtitle: string;
  bullets: string[];
}) {
  return (
    <div className="group rounded-3xl border border-midnight/10 bg-white/70 backdrop-blur p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-sky/15 ring-1 ring-sky/20 flex items-center justify-center text-xl">
          {icon}
        </div>

        <div className="min-w-0">
          <div className="text-lg font-extrabold text-navy leading-tight">{title}</div>
          <div className="mt-1 text-sm text-midnight/65 leading-relaxed">{subtitle}</div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {bullets.map((b) => (
          <div key={b} className="flex items-start gap-3">
            <span className="mt-2 h-2 w-2 rounded-full bg-sky flex-shrink-0" />
            <span className="text-sm text-midnight/80 leading-relaxed">{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ───────────────────────── Countdown (prominent + days-only until <1 day) ───────────────────────── */


function CountdownInline({ targetISO }: { targetISO: string }) {
  const t = useCountdown(targetISO);

  return (
    <div className="text-sm text-midnight/70">
      {t.isUnderOneDay ? (
        <>
          <span className="font-semibold text-navy tabular-nums">
            {t.hours}h {t.minutes}m
          </span>{' '}
          until Match Day
        </>
      ) : (
        <>
          <span className="font-semibold text-navy tabular-nums">{t.days}</span> days until Match Day
        </>
      )}
    </div>
  );
}

function useCountdown(targetISO: string) {
  const target = React.useMemo(() => new Date(targetISO).getTime(), [targetISO]);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000 * 30);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(0, target - now);

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
  const minutes = totalMinutes - days * 24 * 60 - hours * 60;

  return {
    days,
    hours,
    minutes,
    isUnderOneDay: days < 1,
  };
}
