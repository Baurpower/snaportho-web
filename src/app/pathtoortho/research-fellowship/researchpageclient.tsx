"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ClipboardList,
  BadgeCheck,
  Search,
  Wallet,
  Building2,
  Users,
  Network,
  FileText,
  Clock3,
} from "lucide-react";

// ---------- Local UI primitives (match Interviews page) ----------
function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-24">
      {children}
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "bg-white rounded-2xl shadow-md border border-gray-200/80 " +
        "transition-transform will-change-transform hover:shadow-lg " +
        className
      }
    >
      {children}
    </div>
  );
}

type CardSectionProps = {
  children: React.ReactNode;
  className?: string;
};

function CardHeader({ children, className = "" }: CardSectionProps) {
  return <div className={"p-6 " + className}>{children}</div>;
}

function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h3 className={"text-base font-semibold text-[#333] " + className}>{children}</h3>;
}

function CardContent({ children, className = "" }: CardSectionProps) {
  return <div className={"px-6 pb-6 " + className}>{children}</div>;
}


function Badge({
  children,
  className = "",
  variant = "secondary",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "secondary" | "primary";
}) {
  const styles =
    variant === "primary"
      ? "bg-[#597498]/10 text-[#597498] border border-[#597498]/20"
      : "bg-gray-100 text-gray-700 border border-gray-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${styles} ${className}`}
    >
      {children}
    </span>
  );
}

function Separator() {
  return <hr className="border-gray-200/80" />;
}

// ---------- Small helpers ----------
function SectionHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6 max-w-3xl">
      <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
        {kicker}
      </div>
      <h2 className="text-3xl font-semibold text-[#444] tracking-tight">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm text-gray-600">{subtitle}</p> : null}
    </div>
  );
}


// ---------- Page ----------
export default function ResearchYearPage() {
  

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-[#1f2937]">
      {/* Soft gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute left-1/2 top-[-10%] h-[60vh] w-[80vw] -translate-x-1/2 rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgba(89,116,152,0.15),transparent_60%)] blur-2xl"
        />
      </div>

      {/* Sticky header */}
<header className="sticky top-0 z-40 border-b border-gray-200/80 bg-[#f9f7f4]/80 backdrop-blur">
  <Container>
    <div className="flex h-16 items-center justify-between">
      <div className="flex items-center gap-2 text-[#444]">
        <Sparkles className="h-5 w-5" />
        <span className="text-sm font-medium tracking-tight">
          Path to Ortho · Research Fellowships
        </span>
      </div>

      <nav className="hidden gap-6 text-sm sm:flex">
        <a className="hover:underline" href="#what">What is it?</a>
        <a className="hover:underline" href="#should">Should I do it?</a>
        <a className="hover:underline" href="#where">Where should I do it?</a>
        <a className="hover:underline" href="#how">How to apply</a>
        <a className="hover:underline" href="#interview">Interview</a>
      </nav>
    </div>
  </Container>
</header>

{/* Hero */}
<section className="relative pt-16 pb-6 sm:pt-20 sm:pb-8">
  <Container>
    <motion.h1
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="text-4xl sm:text-5xl font-bold tracking-tight text-[#444]"
    >
      Ortho Research Fellowships
    </motion.h1>

    <p className="mt-4 max-w-3xl text-gray-600 leading-relaxed">
      A research year can be a game-changer—or a wasted year—depending on the mentor,
      infrastructure, and your ability to produce consistently.
    </p>

    <div className="mt-6 flex flex-wrap gap-3">
      <a
        href="#should"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium bg-[#597498] text-white hover:bg-[#4e6886] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#597498]"
      >
        Should I do one? <ArrowRight className="h-4 w-4" />
      </a>

      <a
        href="#where"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium border border-gray-300 bg-white text-[#444] hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#597498]"
      >
        Where? <Search className="h-4 w-4" />
      </a>

      <a
        href="#how"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium border border-gray-300 bg-white text-[#444] hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#597498]"
      >
        How to apply? <HelpCircle className="h-4 w-4" />
      </a>
    </div>
  </Container>
</section>



      {/* 1) WHAT IS IT */}
      <section id="what" className="pt-4 pb-14">
        <Container>
          <SectionHeading
            kicker="1 · What is it?"
            title="A year of productivity — not a syllabus"
            subtitle="Every fellowship is different. The most important variables are who you work for and what the institution can support."
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#597498]" />
                  What you should expect
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>• Day to day varies widely across positions.</p>
                <p>• Each position is unique — it depends on your mentor (“boss”) and the institution.</p>
                <p>
                  • Across all positions, the purpose is the same:{" "}
                  <span className="font-medium text-[#333]">
                    increase the research productivity
                  </span>{" "}
                  of the team you’re working with.
                </p>
                <p className="text-xs text-gray-500 pt-2">
                  Some positions are more structured than others.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#597498]" />
                  What kind of research will you do?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>It depends on the infrastructure of the institution:</p>
                <ul className="mt-2 space-y-1">
                  {[
                    "Multi-center prospective studies",
                    "Large database studies",
                    "Case reports, techniques, retrospective series",
                  ].map((x) => (
                    <li key={x} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#597498]/70" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Universal 4-phase structure */}
<div className="mt-8">
  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <div className="text-xs font-medium tracking-wider text-gray-500 uppercase">
        Across almost every position
      </div>
      <h3 className="mt-1 text-xl font-semibold text-[#444] tracking-tight">
        The year follows 4 distinct phases
      </h3>
    </div>

    <Badge variant="primary" className="w-fit">
      <Clock3 className="h-3 w-3 mr-1" />
      Universal framework
    </Badge>
  </div>

  {/* subtle timeline line behind cards (desktop) */}
  <div className="relative">
    <div className="pointer-events-none absolute left-0 right-0 top-6 hidden sm:block">
      <div className="mx-2 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    </div>

    <div className="grid gap-6 sm:grid-cols-4">
      {[
        {
          phase: "Phase 1",
          title: "Orientation",
          icon: <Clock3 className="h-4 w-4" />,
          text:
            "Access, onboarding, IRB systems, data tools, and understanding expectations. This takes longer than you think.",
        },
        {
          phase: "Phase 2",
          title: "Clean-up phase",
          icon: <ClipboardList className="h-4 w-4" />,
          text:
            "Finish existing projects, revise manuscripts, submit abstracts, and learn how the group operates day-to-day.",
        },
        {
          phase: "Phase 3",
          title: "Build your own projects",
          icon: <FileText className="h-4 w-4" />,
          text:
            "Start new studies from scratch: question → design → approvals → execution → write-up.",
        },
        {
          phase: "Phase 4",
          title: "Hand-off + finalize",
          icon: <Users className="h-4 w-4" />,
          text:
            "Tidy everything up, create continuity for the next fellow, and push remaining work to submission.",
        },
      ].map((block) => (
        <Card key={block.phase} className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(89,116,152,0.12),transparent_60%)]" />

          <CardHeader className="pb-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center rounded-full border border-[#597498]/20 bg-[#597498]/10 px-2.5 py-1 text-[11px] font-semibold text-[#597498]">
                {block.phase}
              </span>

              <span className="text-[#597498]">{block.icon}</span>
            </div>

            <CardTitle className="leading-snug">
              {block.title}
            </CardTitle>
          </CardHeader>

          <CardContent className="text-xs text-gray-600 leading-relaxed">
            {block.text}
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
</div>


          <div className="mt-8 rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm">
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="primary">
      <BadgeCheck className="h-3 w-3 mr-1" />
      By the end of the year…
    </Badge>
    <Badge>What you actually leave with</Badge>
  </div>

  <div className="mt-4 grid gap-4 sm:grid-cols-2">
    {[
      {
        title: "Tangible output",
        items: [
          "Accepted manuscripts (amount varies by position).",
          "Conference posters/presentations.",
          "Projects in the pipeline with your name on them.",
        ],
      },
      {
        title: "Team Integration + Behind-the-Scenes Exposure",
        items: [
  "Integrated into an orthopaedic team with real expectations and responsibility.",
  "Exposure to the internal workings of an academic department beyond what applicants see.",
  "Clear feedback on performance, efficiency, and growth areas over time.",
],
      },
      {
        title: "Network + visibility",
        items: [
          "Faculty who will pick up the phone for you.",
          "Resident integration (varies by position).",
          "Connections that create away rotations and interviews.",
        ],
      },
      {
        title: "Research fluency",
        items: [
          "Comfort navigating IRB, data collection, and research processes.",
          "Research stops being intimidating and becomes routine.",
          "Comfort functioning as a productive member of a research team.",
        ],
      },
    ].map((block) => (
      <div
        key={block.title}
        className="rounded-2xl border border-gray-200 bg-white p-4"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#597498]" />
          <p className="text-sm font-semibold text-[#333]">{block.title}</p>
        </div>

        <ul className="mt-3 space-y-2 text-sm text-gray-600">
          {block.items.map((x) => (
            <li key={x} className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#597498] mt-0.5" />
              <span>{x}</span>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>

  <div className="mt-4 rounded-xl border border-gray-200 bg-[#fbfaf8] p-4">
    <p className="text-sm text-gray-700">
      <span className="font-semibold text-[#333]">Bottom line:</span>{" "}
      A research year can look different for everyone and the helpfulness is multi-factorial. However, there is opportunity to gain foundational skills, and build a strong ortho network.
    </p>
  </div>
</div>

        </Container>
      </section>

      <Separator />

      {/* 2) SHOULD I DO IT */}
<section id="should" className="py-14">
  <Container>
    <SectionHeading
      kicker="2 · Should I do it?"
      title="Is a research year for you?"
      subtitle="It can be a very strategic move when it fixes a specific weakness or adds real leverage."
    />

    <div className="grid gap-6 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#597498]" />
            A research year is usually a good move if…
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <ul className="space-y-2">
            {[
              "You went unmatched and need a clear upgrade (output + mentorship + advocacy).",
              "Research is a real weakness on your application (few pubs/abstracts, weak productivity story).",
              "You’re aiming for research-heavy programs and want credibility + connections.",
              "You have access to a mentor/institution with a proven pipeline (projects + support + track record).",
              "You are intrinsically motivated and can grind consistently for a year.",
            ].map((x) => (
              <li key={x} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#597498]/70" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#597498]" />
            Think twice if…
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <ul className="space-y-2">
            {[
              "You genuinely do not like research.",
              "You cannot afford a gap year financially after not matching.",
              "Your scores are significantly below average and a research year might not be enough.",
              "You’re doing it to “buy time” with no clear plan for what you’ll fix.",
              "You’re not willing to relocate for only a year.",
            ].map((x) => (
              <li key={x} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#597498]/70" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
    {/* Fellow Insight Callout */}
<div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="max-w-2xl">
      <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
        <Users className="h-4 w-4 text-[#597498]" />
        Talk to people who have done a research fellowship
      </h3>
      <p className="mt-1 text-sm text-gray-600">
        This is the highest-yield step before committing a year of your career. Former fellows can tell you what the
        day-to-day is really like, how mentorship works, and whether a research year sounds right for you.
      </p>
    </div>

    <div className="flex shrink-0 items-center gap-2">
      <div className="rounded-full bg-[#597498]/10 px-3 py-1 text-xs font-medium text-[#597498]">
        Highest-yield due diligence
      </div>
    </div>
  </div>

  <div className="mt-5 grid gap-4 sm:grid-cols-2">
    {[
      {
        q: "Would you do it again?",
        a: "Did the research fellowship help you match? What were the biggest benefits, and what were the biggest downsides?"
      },
      {
        q: "Why did you choose to do a research fellowship?",
        a: "What did your application look like at the time? Did you have strong orthopaedic connections? Was research a gap you needed to fix, or were you genuinely interested in pursuing research long term?"
      },
      {
        q: "How did your view of research change?",
        a: "Did you end up enjoying it more, or did it confirm it isn’t your thing?"
      },
      {
        q: "What was your day-to-day workflow?",
        a: "How many projects did you juggle, and what did a typical week look like?"
      },
      
    ].map((item) => (
      <div key={item.q} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-900">{item.q}</p>
        <p className="mt-1 text-sm text-gray-600">{item.a}</p>
      </div>
    ))}
  </div>

  <div className="mt-5 rounded-xl border border-[#597498]/20 bg-[#597498]/5 p-4">
    <p className="text-sm text-gray-700">
      <span className="font-medium text-gray-900">Bottom line:</span> You should understand the real pros and cons
      before committing to a year. A fellowship can be a massive accelerator, but only when you truly buy into the year and are productive.
    </p>
  </div>
</div>

  </Container>
  
</section>


      <Separator />

      {/* 3) WHERE SHOULD I DO IT */}
      <section id="where" className="py-14">
        <Container>
          <SectionHeading
            kicker="3 · Where should I do it?"
            title="Pick a place built to support output and mentorship"
            subtitle="This decision is about more than prestige — it’s about infrastructure, expectations, and the match track record."
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[#597498]" />
                  Don’t go somewhere unpaid
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>
                  You should not take an unpaid research fellowship — and it’s not just about the money.
                </p>
                <p>
                  If they won’t pay a modest stipend, it often signals either{" "}
                  <span className="font-medium text-[#333]">low institutional support</span>{" "}
                  or{" "}
                  <span className="font-medium text-[#333]">poor infrastructure</span>.
                </p>
                <p className="text-xs text-gray-500 pt-2">
                  A supportive place usually has systems in place: data access, IRB help, stats support, and a clear workflow.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#597498]" />
                  Prioritize match track record + network
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>Choose places that consistently help fellows match — ideally into ortho.</p>
                <ul className="mt-2 space-y-1">
                  {[
                    "Strong presence within the home residency (fellows integrated with residents/faculty)",
                    "A historical pattern of matching their own research fellows (when true)",
                    "Mentors with a large network and a reputation for mentoring",
                  ].map((x) => (
                    <li key={x} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#597498]/70" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: "Mentor quality",
                icon: <Users className="h-4 w-4" />,
                bullets: ["Clear expectations", "Fast feedback", "Protects your productivity", "Advocates for you"],
              },
              {
                title: "Infrastructure",
                icon: <Building2 className="h-4 w-4" />,
                bullets: ["IRB help", "Data access", "Stats support", "Project pipeline"],
              },
              {
                title: "Resident integration",
                icon: <Network className="h-4 w-4" />,
                bullets: ["Attend conferences", "Know the residents", "Be part of the culture", "Real visibility"],
              },
            ].map((b) => (
              <Card key={b.title} className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(89,116,152,0.12),transparent_60%)]" />
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-[#597498]">{b.icon}</span>
                    {b.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs text-gray-600">
                  {b.bullets.map((x) => (
                    <p key={x}>• {x}</p>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <Separator />

      {/* 4) HOW DO I DO IT */}
      <section id="how" className="py-14">
        <Container>
          <SectionHeading
            kicker="4 · How do I do it?"
            title="How to find and apply (without a standardized timeline)"
            subtitle="Some positions open earlier than others. Plan ahead and use mentors to avoid blind spots."
          />

          <div className="grid gap-6 sm:grid-cols-[minmax(0,1.5fr),minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-[#597498]" />
                  Finding positions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <p>
                  There’s no standardized timeline. Many applications open{" "}
                  <span className="font-medium text-[#333]">January–March</span>, but some
                  programs recruit earlier or fill informally.
                </p>

                <div className="rounded-xl border border-gray-200 bg-[#fbfaf8] p-4 space-y-4">
  
  {/* Top resource */}
  <div className="space-y-1">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
      #1 place to look
    </p>
    <p className="text-sm text-gray-700">
      <a
        href="https://www.orthogate.org/forums/medical-student-research-fellowship"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-[#333] underline decoration-gray-300 underline-offset-4 hover:decoration-[#597498]"
      >
        OrthoGate: Medical Student Research Fellowship Forum
      </a>
    </p>
  </div>

  {/* Divider */}
  <div className="h-px w-full bg-gray-200" />

  {/* Other resources */}
  <div className="space-y-1">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
      Other places to look
    </p>
    <p className="text-sm text-gray-700">
      <a
        href="https://www.msosortho.com/research-year-positions"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-[#333] underline decoration-gray-300 underline-offset-4 hover:decoration-[#597498]"
      >
        MSOS: Research Year Positions
      </a>
    </p>
  </div>

  {/* Footer note */}
  <p className="pt-1 text-xs text-gray-500">
    Keep your own list of deadlines and contacts as you browse postings.
  </p>

</div>



                <p>
                  You can also reach out directly to programs that historically have a research fellow.
                  Sometimes the opportunity exists before it’s publicly posted.
                </p>
              </CardContent>
            </Card>

            <Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <BadgeCheck className="h-4 w-4 text-[#597498]" />
      How to apply intelligently
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-2 text-sm text-gray-600">
    <p>• Talk to current and former research fellows before you commit.</p>
    <p>• Ask them how the workflow actually runs day-to-day.</p>
    <p>• Find out how involved the attending is and how closely they work with residents.</p>
    <p>• Ask where past fellows matched and how productive the year really was.</p>
    <p>• Use your mentors to help you get connected early.</p>

    <p className="text-xs text-gray-500 pt-2">
      A research year only works if the mentorship, expectations, and advocacy are real. Fellows who have lived it are the best way to know whether a program actually delivers.
    </p>
  </CardContent>
</Card>
          </div>

          <div className="mt-8">
            <Card className="bg-white/95">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#597498]" />
                  Your application checklist (simple and realistic)
                </CardTitle>
                <Badge variant="primary">Use mentors here</Badge>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 text-sm text-gray-600">
                <div className="space-y-2">
                  {[
                    "Update CV (publications, abstracts, presentations, roles).",
                    "Draft a one-page “why this fellowship” paragraph you can tailor.",
                    "Identify 2–3 recommenders who can speak to work ethic + research output.",
                    "Make a spreadsheet: program, mentor, pay, deadlines, track record, notes.",
                  ].map((x) => (
                    <div key={x} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#597498] mt-0.5" />
                      <span>{x}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[
                    "Ask: what projects are already in the pipeline?",
                    "Ask: what does a ‘successful fellow’ look like here?",
                    "Ask: expected weekly hours + conference expectations.",
                    "Ask: how prior fellows matched (where, and how many).",
                  ].map((x) => (
                    <div key={x} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#597498] mt-0.5" />
                      <span>{x}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
            {/* --- New section: INTERVIEW (drop this inside #how, after “How to apply intelligently” OR after the checklist) --- */}
<section id="interview" className="mt-8">
  <Card className="bg-white/95">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-[#597498]" />
        The interview (rolling + highly variable)
      </CardTitle>
    </CardHeader>

    <CardContent className="space-y-4 text-sm text-gray-600">
      <p>
        Interviews for research fellowships are often rolling and the format varies widely
        (phone, or Zoom). No matter the style, use the
        interview to confirm expectations and learn about the position.
      </p>

      <div className="rounded-xl border border-gray-200 bg-[#fbfaf8] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Ask these every time
        </p>

        <div className="mt-3 space-y-2">
          {[
            "What projects are already in the pipeline?",
            "What does a “successful fellow” look like here?",
            "What does a typical week look like? (ie. weekly hours & interactions with residents)",
            "How have prior fellows matched (where, and how many)?",
          ].map((x) => (
            <div key={x} className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#597498] mt-0.5" />
              <span>{x}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        If they can’t answer these clearly, that’s a signal.
      </p>
    </CardContent>
  </Card>
</section>

{/* --- Optional new section: HOW YOU ACTUALLY GET THESE (put right before #how or at top of #how) --- */}
<section id="get" className="mt-8">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Users className="h-4 w-4 text-[#597498]" />
        How people actually get these positions
      </CardTitle>
    </CardHeader>

    <CardContent className="text-sm text-gray-600">
      <ul className="space-y-2">
        {[
          "Your CV matters (scores + research track record)",
          "Mentors vouching for you is huge (use your orthopaedic mentors)",
          "Unfortunately, there is some luck involved.",
        ].map((x) => (
          <li key={x} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#597498]/70" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
</section>


          <div className="mt-10">
            <SectionHeading
              kicker="FAQ"
              title="Common questions applicants ask"
              subtitle="Short answers to the stuff that gets people stuck."
            />

            <div className="space-y-3">
              {[
                {
                  q: "What about programs that have multiple research fellows?",
                  a: "This is important to consider. More fellows can mean more built-in support, but also more competition for projects and mentor time. Ask how the fellows work together and how projects are distributed.",
                },
                {
                  q: "Is it better to do lots of small projects or fewer big ones?",
                  a: "Usually a mix: quick-turnaround projects build momentum, while 1–2 larger projects show depth. Your mentor should help balance this based on your timeline.",
                },
                {
                  q: "Do I need a research year to match ortho?",
                  a: "No. But for some applicants—especially if research was a major weakness—it can be the most direct way to change the story of the application within one year.",
                },
                {
                  q: "Should I do unpaid if I really want the program?",
                  a: "In almost all cases: no. Unpaid often correlates with weak support and poor infrastructure. If you still consider it, you need very strong evidence of output + matching track record.",
                },
                {
                  q: "Are 2 year programs better?",
                  a: "If you’re unmatched, it can be tough to generate meaningful output before the next cycle’s applications are due which is the main advantage of a 2-year program. The tradeoff is obvious: if you invest two years and still don’t match, you’ve delayed starting a different career path by a substantial amount of time.",
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <span className="text-sm font-medium text-[#333]">{item.q}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="mt-3 text-sm text-gray-600">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200/80 bg-[#f9f7f4] py-10">
        <Container>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-[#597498]">
              <Sparkles className="h-4 w-4" />
              Built by the SnapOrtho team
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-gray-700 sm:text-base">
              Practical, honest guidance for applicants trying to make the best move for their
              situation — not generic advice.
            </p>
            <p className="text-sm text-gray-500">One strong year can change everything. 💪🦴</p>
          </div>
        </Container>
      </footer>
    </main>
  );
}
