import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Scale,
  CheckCircle2,
  Compass,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

export const metadata = {
  title: "Should I Dual Apply? | SnapOrtho",
  description:
    "A practical guide to deciding whether to dual apply when pursuing orthopaedic surgery.",
  alternates: {
    canonical: "/pathtoortho/eras/dual-apply",
  },
  openGraph: {
    title: "Should I Dual Apply?",
    description:
      "Consider your application realistically, protect your options, and build a Match plan that can still lead to a fulfilling career.",
    url: "https://snap-ortho.com/pathtoortho/eras/dual-apply",
    siteName: "SnapOrtho",
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Should I Dual Apply?",
    description:
      "A candid framework for orthopaedic surgery applicants considering a second specialty.",
  },
};

const positives = [
  "If you do not match orthopaedics, you may still match into a specialty and program you chose intentionally.",
  "You retain more control over location, training environment, and the kind of backup career you could genuinely enjoy.",
  "A strong orthopaedic applicant may also be a compelling applicant in another competitive specialty.",
  "You reduce your dependence on the SOAP, where choices are limited and the process moves quickly.",
];

const tradeoffs = [
  "An orthopaedic program may question your commitment if your rotations, personal statement, letters, or interviews suggest you are not all in.",
  "Two applications require more time, money, organization, and specialty-specific preparation.",
  "Applying to both specialties at the same institution can create avoidable overlap and increase the chance that your strategy becomes visible.",
  "A backup only helps if it is a career you would actually be willing to rank and practice.",
];

const reflectionQuestions = [
  "How does my application compare with applicants who have matched—not just with minimum requirements?",
  "Where are my real strengths, and which parts of my application are difficult to change this cycle?",
  "Would I be happy practicing my second specialty if orthopaedics were no longer an option?",
  "Which matters most to me: specialty, geography, training culture, lifestyle, future practice, or support system?",
  "If I go unmatched, is a research year truly available and likely to improve my application?",
];

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-6 sm:px-10 lg:px-20">{children}</div>;
}

function SectionTitle({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#597498]">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-[#333] sm:text-3xl">{children}</h2>
    </div>
  );
}

export default function DualApplyPage() {
  return (
    <main className="min-h-screen bg-[#f9f7f4] text-[#1f2937]">
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-[#f9f7f4]/90 backdrop-blur">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/pathtoortho/eras" className="inline-flex items-center gap-2 text-sm font-medium text-[#444] hover:text-[#597498]">
              <ArrowLeft className="h-4 w-4" /> ERAS guide
            </Link>
            <span className="inline-flex items-center gap-2 text-sm text-[#597498]">
              <Sparkles className="h-4 w-4" /> SnapOrtho
            </span>
          </div>
        </Container>
      </header>

      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-[#597498]/10 blur-3xl" />
        <Container>
          <div className="relative max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#597498]">ERAS decision guide</p>
            <h1 className="text-4xl font-bold tracking-tight text-[#3f3f3f] sm:text-6xl">Should I dual apply?</h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl">
              You can beat the odds. The harder question is whether you want your entire Match strategy to depend on doing so.
            </p>
            <div className="mt-8 rounded-2xl border border-[#597498]/25 bg-white/90 p-5 shadow-sm sm:p-6">
              <p className="text-base font-semibold text-[#333]">The short answer</p>
              <p className="mt-2 leading-7 text-gray-600">
                Dual applying is reasonable when your orthopaedic application carries meaningful risk and you can identify another specialty you would be happy to practice. It is not giving up on orthopaedics. It is choosing how much risk you are willing to accept—and how much control you want if Plan A does not work out.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-gray-200/80 bg-white/55 py-14 sm:py-18">
        <Container>
          <SectionTitle eyebrow="Start here">Consider your statistics realistically</SectionTitle>
          <div className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <Scale className="mt-0.5 h-6 w-6 shrink-0 text-[#597498]" />
                <div>
                  <h3 className="font-semibold text-[#333]">Hope is important. A plan is better.</h3>
                  <p className="mt-3 leading-7 text-gray-600">
                    Look honestly at your board performance, clinical grades, class standing, research, letters, away rotations, school context, and interview readiness. No single number decides your future, and every year includes applicants who outperform expectations. Still, an exception is not a strategy.
                  </p>
                  <p className="mt-3 leading-7 text-gray-600">
                    Ask mentors who know orthopaedic selection to evaluate your full application candidly. Then decide whether the chance of matching ortho is worth the chance of going unmatched.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6">
              <TriangleAlert className="h-6 w-6 text-amber-700" />
              <p className="mt-4 font-semibold text-[#333]">Do not confuse “possible” with “probable.”</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Your decision should reflect both your tolerance for risk and the real alternatives available to you—not pride, pressure, or the fear that a backup plan makes you less committed.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <SectionTitle eyebrow="The tradeoff">What dual applying changes</SectionTitle>
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-700" />
                <h3 className="text-xl font-semibold text-[#333]">What you gain</h3>
              </div>
              <ul className="space-y-4">
                {positives.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-gray-600">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />{item}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border border-rose-200/80 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-rose-700" />
                <h3 className="text-xl font-semibold text-[#333]">What you need to protect against</h3>
              </div>
              <ul className="space-y-4">
                {tradeoffs.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-gray-600">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />{item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </Container>
      </section>

      <section className="border-y border-gray-200/80 bg-[#eef2f6] py-16">
        <Container>
          <SectionTitle eyebrow="Apply thoughtfully">Keep each application authentic</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              ["Avoid unnecessary overlap", "When possible, avoid applying to both specialties at the same institution. Overlap can create awkward questions and may make your strategy easier to detect."],
              ["Show commitment", "Your orthopaedic rotations, letters, personal statement, and interviews should clearly demonstrate why you want orthopaedics. A second application should be equally thoughtful and specialty-specific."],
              ["Protect your privacy—honestly", "You do not need to volunteer everywhere that you are dual applying. But do not lie if you are asked directly, and follow any guidance from your medical school."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-white/80 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-[#333]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <SectionTitle eyebrow="Build your decision">Questions worth answering</SectionTitle>
          <div className="space-y-3">
            {reflectionQuestions.map((question, index) => (
              <div key={question} className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#597498]/10 text-sm font-semibold text-[#597498]">{index + 1}</span>
                <p className="pt-1 text-sm font-medium leading-6 text-[#444]">{question}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <Compass className="mt-0.5 h-6 w-6 shrink-0 text-[#597498]" />
              <div>
                <h3 className="font-semibold text-[#333]">A research year is not an automatic safety net</h3>
                <p className="mt-2 leading-7 text-gray-600">
                  Orthopaedic research positions can be highly competitive, and spending an additional year does not guarantee a different Match result. If a research year is part of your backup plan, evaluate the specific opportunity, mentorship, expected productivity, cost, and how it would address weaknesses in your application.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-[#445d7a] py-16 text-white">
        <Container>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <HeartHandshake className="h-7 w-7 text-white/80" />
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">The goal is not simply to match ortho. The goal is a life you are happy to live.</h2>
              <p className="mt-4 leading-7 text-white/80">
                Career happiness is shaped by more than a specialty name. Where you train, the people around you, the practice you ultimately build, where you live, and the patients you serve all matter. Dual applying can give you more influence over those parts of your future if orthopaedics does not work out.
              </p>
            </div>
            <Link href="/pathtoortho/eras" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#445d7a] transition hover:bg-white/90">
              Return to ERAS guide <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>
    </main>
  );
}
