// app/fundraising/FundPageClient.tsx
'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

const DonationForm = dynamic(() => import('./donationformwrapper'), { ssr: false });


export default function FundPage() {
  return (
    <main className="bg-cream min-h-screen font-sans text-midnight">
      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 md:py-24 space-y-10">

        {/* ── Page Title Intro ───────────────────────────── */}
        <section className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold text-navy">Support SnapOrtho</h1>
          <p className="text-lg text-midnight/80 max-w-2xl mx-auto">
            We&apos;re scaling fast, adding new modules monthly, and building tools that real medical students use daily. Be a part of the growth.
          </p>
        </section>

        {/* Top Donors Banner */}
<div className="relative bg-gradient-to-r from-sky-100 via-white to-blue-100 p-4 sm:p-6 pt-8 rounded-3xl border border-sky/20 shadow-xl">
  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-sky px-4 py-1 text-white text-sm font-semibold rounded-full shadow-md z-10">
    🌟 Top Donors
  </div>

  <div className="flex flex-wrap justify-center items-center gap-4 pt-4 font-semibold text-midnight">
    <div className="bg-white/70 backdrop-blur-md rounded-xl py-3 px-4 shadow-inner ring-1 ring-sky/10">
      Kregg B — <span className="text-sky-dark">$300</span>
    </div>
    <div className="bg-white/70 backdrop-blur-md rounded-xl py-3 px-4 shadow-inner ring-1 ring-sky/10">
      Oliver S — <span className="text-sky-dark">$50</span>
    </div>
    <div className="bg-white/70 backdrop-blur-md rounded-xl py-3 px-4 shadow-inner ring-1 ring-sky/10">
      Jack S — <span className="text-sky-dark">$5</span>
    </div>
  </div>

  <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-sky/10 rounded-full blur-2xl z-0" />
  <div className="absolute -top-6 -left-6 w-28 h-28 bg-blue-200/20 rounded-full blur-2xl z-0" />
</div>


        {/* Hero / Social Proof */}
        <section className="relative isolate grid gap-10 place-items-center text-center bg-gradient-to-br from-sky-50 to-cream p-8 rounded-3xl shadow-md">
          <div className="bg-white rounded-[30px] px-8 sm:px-14 py-12 sm:py-16 space-y-8">
            <Badge>🚀 2025 Snapshot</Badge>

            <h2 className="text-4xl sm:text-5xl font-extrabold text-navy leading-tight">
              500+ Learners ▶ Growing Every Week
            </h2>

            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 text-left max-w-md mx-auto">
              <Stat value="500+" label="Downloads" />
              <Stat value="150+" label="Active Accounts" />
              <Stat value="20+" label="Daily Learners" />
              <Stat value="5/5" label="App Rating" />
            </ul>

            <div className="flex justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="text-yellow-400 text-2xl">★</span>
              ))}
            </div>

            <Link
              href="#donate"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-sky text-white font-semibold text-lg shadow-lg hover:bg-sky/90 transition"
            >
              💙 Donate Now
            </Link>
          </div>
          <span className="absolute -top-12 -left-16 w-60 h-60 bg-sky/20 blur-3xl rounded-full -z-10" />
        </section>

        {/* Timeline */}
        <section className="bg-white/80 p-8 rounded-3xl shadow-inner space-y-5">
          <SectionTitle emoji="🛠️" text="Our Journey" />
          <ol className="relative border-l-2 border-sky/30 pl-6 space-y-10">
            <TimelineItem year="2024" title="Idea & Sketches" desc="A frustrated medical student created fracture classification mnemonics between cases." />
            <TimelineItem year="Feb 2025" title="App Launch" desc="SnapOrtho officially launched on the AppStore." />
            <TimelineItem year="April 2025" title="Team Expansion" desc="MyOrtho Solutions was formed and Dr. Austin Nguyen joined the team." />
            <TimelineItem year="May 2025" title="Practice Released" desc="Our flagship “Practice” feature went live to boost fracture conference prep." />
            <TimelineItem year="June 2025" title="Learn Drops" desc="SnapOrtho Learn launched with our first animated video. More releasing monthly." />
            <TimelineItem year="July 2025" title="Meet BroBot" desc="BroBot beta launched to help prepare for cases." />
          </ol>
        </section>

        {/* Impact */}
        <section className="bg-gradient-to-br from-sky-50 to-blue-50 p-10 rounded-3xl shadow-inner ring-1 ring-sky/10 space-y-6">
          <SectionTitle emoji="🌟" text="How Your Donation Helps" />
          <div className="space-y-4 text-midnight/90">
            <p>
              Your donation directly powers new educational modules, advanced features, and outreach to learners across the globe. Every dollar strengthens our mission to make orthopaedic education more visual, more adaptive, and more accessible.
            </p>
            <p>
              As a donor, you&apos;ll also have the option to join the <span className="font-semibold text-navy">SnapOrtho Donors Circle</span> — a private mailing list that receives:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Early access to new features and major updates</li>
              <li>Behind-the-scenes development milestones</li>
              <li>Invites to beta test unreleased tools and videos</li>
            </ul>
            <p>
              We&apos;re building in the open — and we want our supporters to see their impact in real time.
            </p>
          </div>
        </section>

        {/* Donation */}
        <section id="donate" className="scroll-mt-24 md:scroll-mt-28 bg-white p-8 rounded-3xl shadow-md space-y-6">
          <SectionTitle emoji="💸" text="Make a Donation" />
          <p className="text-midnight/80 max-w-lg">
            Every contribution — large or small — helps us ship updates faster, support more learners, and grow responsibly. Securely processed via Stripe.
          </p>
          <div className="bg-white border shadow-xl p-6 md:p-8 rounded-2xl">
            <DonationForm />
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-midnight/50 pt-12 border-t border-midnight/10">
          Have an idea or want to partner? <a href="mailto:support@snap-ortho.com" className="underline">Contact us</a>
        </footer>
      </div>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-block mb-3 rounded-full bg-sky/10 px-3 py-1 text-sm font-semibold text-sky-dark">{children}</span>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <li className="flex flex-col"><span className="text-2xl font-extrabold text-navy">{value}</span><span className="text-sm text-midnight/70">{label}</span></li>
  );
}

function SectionTitle({ emoji, text }: { emoji: string; text: string }) {
  return <h2 className="text-3xl font-bold flex items-center gap-2"><span>{emoji}</span><span>{text}</span></h2>;
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
