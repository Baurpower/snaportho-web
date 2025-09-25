"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  MapPin,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Stars,
} from "lucide-react";
import type React from "react";

// ---------- Local UI primitives (cream/white rounded cards, no external UI deps) ----------
function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-24">{children}</div>;
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

function Button({
  children,
  className = "",
  variant = "solid",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline";
  size?: "sm" | "md";
}) {
  const sizes =
    size === "sm" ? "px-4 py-2 text-sm rounded-xl" : "px-5 py-2.5 text-sm rounded-xl";
  const base =
    "inline-flex items-center gap-2 font-medium transition-colors focus:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#597498]";
  const styles =
    variant === "outline"
      ? "border border-gray-300 bg-white text-[#444] hover:bg-gray-50"
      : "bg-[#597498] text-white hover:bg-[#4e6886]";
  return (
    <button {...props} className={`${base} ${sizes} ${styles} ${className}`}>
      {children}
    </button>
  );
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${styles} ${className}`} >
      {children}
    </span>
  );
}

function Separator() {
  return <hr className="border-gray-200/80" />;
}

// Simple tabs with local state
function Tabs({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
      <div className="grid grid-cols-2 gap-1">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              onClick={() => onValueChange(o.value)}
              className={
                "rounded-lg px-3 py-2 text-sm transition-colors " +
                (active ? "bg-[#597498] text-white" : "text-[#444] hover:bg-gray-50")
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Content ----------
// --- Cycle year knobs (adjust as needed) ---
const VSLO_YEAR = 2025; // 3rd→4th year bridge

// VSLO / Away timeline (adaptable per class year)
const TIMELINE = [
  { date: "November 2025", label: "Log in to VSLO; research elective requirements" },
  { date: "December 2025", label: "Draft PS, update CV, secure 1 LOR" },
  { date: "January 2026", label: "Request VSLO access; confirm titers & paperwork" },
  { date: "February 2026", label: "VSLO applications open (varies by program)" },
  { date: "July 2026", label: "Begin away rotations; target 1–2 LORs" },
];

// ------- Dynamic hero card: season focus (overrides optional each cycle) -------
type AnchorsOverrides = {
  /** ISO date "YYYY-MM-DD" or a Date. Example: "2025-11-15" */
  universalOffer?: string | Date;
  /** ISO date "YYYY-MM-DD" or a Date. Example: "2026-09-04" */
  erasSubmit?: string | Date;
};

type Focus = { title: string; window: string };

// local helper to make a date at 09:00 local time to avoid midnight TZ jitter
const at9 = (y: number, m: number, d: number) => new Date(y, m, d, 9, 0, 0);

// parse an override if provided; otherwise return undefined
function parseOverride(v?: string | Date): Date | undefined {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(`${v}T09:00:00`);
  return isNaN(d.getTime()) ? undefined : d;
}

function buildAnchors(year: number, overrides?: AnchorsOverrides) {
  const UNIVERSAL_OFFER =
    parseOverride(overrides?.universalOffer) ?? at9(year, 10, 17); // default Nov 17 of VSLO_YEAR
  const ERAS_SUBMIT =
    parseOverride(overrides?.erasSubmit) ?? at9(year + 1, 8, 24);   // default Sept 24 of next year

  return {
    UNIVERSAL_OFFER,
    JAN: at9(year + 1, 0, 1),
    FEB: at9(year + 1, 1, 1),
    APR: at9(year + 1, 3, 1),
    JUL: at9(year + 1, 6, 1),
    ERAS_SUBMIT,
  };
}

export function getSeasonFocus(
  now = new Date(),
  overrides?: AnchorsOverrides
): Focus {
  const { UNIVERSAL_OFFER, JAN, FEB, APR, JUL, ERAS_SUBMIT } = buildAnchors(VSLO_YEAR, overrides);
  const t = now.getTime();

  if (t < UNIVERSAL_OFFER.getTime()) {
    return {
      title: "Secure an Interview and Set Yourself Up to Match!",
      window: "ERAS Submission → Universal Offer Day",
    };
  }
  if (t < JAN.getTime()) {
    return {
      title: "Finish out Ortho Rotations Strong! You’re almost there!",
      window: "Universal Offer Day → January",
    };
  }
  if (t < FEB.getTime()) {
    return {
      title: "Time to Start Preparing for 4th Year Rotations!",
      window: "January",
    };
  }
  if (t < APR.getTime()) {
    return {
      title: "Be the First to Apply to Away Rotations!",
      window: "February → April",
    };
  }
  if (t < JUL.getTime()) {
    return {
      title: "Make Sure Your Fall Schedule is Setting You Up to Match!",
      window: "April → July",
    };
  }
  if (t < ERAS_SUBMIT.getTime()) {
    return {
      title: "Ortho Rotations are Challenging! Be Yourself and Have Fun!",
      window: "July → ERAS Submission",
    };
  }
  // Fallback after ERAS submission
  return {
    title: "Keep Up the Good Work!",
    window: "ERAS Submission → Match",
  };
}


// Pillars for success on rotation
const SUCCESS = [
  {
    title: "Be Self-Aware",
    icon: <Sparkles className="h-5 w-5" />,
    points: [
      "Bring a positive attitude; be first in and last out when appropriate.",
      "If told to go home, confirm once and head out — it’s not a test.",
      "Be yourself! It is a stressful time but this is the program’s opportunity to get to know you.",
      "Don’t be afraid to make mistakes. Asking good questions and learning will stand out.",
      "Read the room: stay focused if the team is stressed; help lighten workload.",
      "Co-rotators are teammates, not rivals; collaborate and share tasks.",
      "Ask to be shown unfamiliar tasks rather than fumbling through them.",
      "Seek midpoint feedback from your senior and apply it quickly.",
    ],
  },
  {
    title: "Anticipate",
    icon: <NotebookPen className="h-5 w-5" />,
    points: [
      "Be curious and observant; look for work that makes residents’ lives easier.",
      "Write everything down; help with lists, notes, supplies, and morning rounds.",
      "Write down hospital codes early in the rotation.",
      "In the OR: learn team workflow, pull up images, prep, and be last to scrub unless told otherwise.",
      "Between cases: track the board, check in, and help turn over rooms.",
    ],
  },
  {
    title: "Own Your Role",
    icon: <ShieldCheck className="h-5 w-5" />,
    points: [
      "Look up cases the night before; know injury, mechanism, anatomy.",
      "Always have a couple questions prepped regarding the case. (Ie. What does post-op look like for this patient?)",
      "Master basics: splints, local anesthetic draw-up, supply hunting, ties, drains, dressings.",
    ],
  },
  {
    title: "Network Intentionally",
    icon: <MapPin className="h-5 w-5" />,
    points: [
      "Connect with residents early; attend socials, journal clubs, and labs.",
      "Stay in touch with 1–2 residents who know your work; 2s/3s often carry influence.",
      "If rotating pre-ERAS and there’s real rapport, ask mid-block for a LOR.",
    ],
  },
];

// What to bring / prep
const PACKING = [
  {
    title: "Day-1 Fit & Everyday Carry",
    icon: <GraduationCap className="h-5 w-5" />,
    points: [
      "Over-dress on day 1 (business professional + white coat).",
      "Carry trauma shears, pen, marking pen, small notebook, cheap eye protection.",
      "Have at least one physical resource to study during down time.",
      "Have OR shoes and clinic clothes handy — the schedule can change fast.",
      "Protein bars save you; keep a couple in your pocket.",
    ],
  },
  {
    title: "Pimp Topics",
    icon: <Stars className="h-5 w-5" />,
    points: [
      "Anatomy (free points); core classification systems (Schatzker, Vancouver, GA, Garden, Weber).",
      "XR fundamentals and views.",
      "Basic principles: primary vs secondary bone healing, basic trauma principles, etc.",
      "If assigned a topic/conference, read and be ready.",
    ],
  },
];

// Strategy & logistics
const STRATEGY_MD = [
  "Apply early via VSLO; many offerings are first-come, first-served.",
  "Do aways where you want to match.",
  "Avoid rotating at too many reach programs.",
  "Ask how many rotators they take per month. If there are too many students it can be hard to stand out.",
  "Avoid overlapping aways with classmates when possible.",
  "Balance your slate: big academic, community, and a program that’s a size/fit contrast.",
];

const STRATEGY_DO = [
  "Favor historically DO-inclusive programs and prior AOA sites with DOs on roster.",
  "Some programs interview mostly/only rotators — choose aways where a strong month can convert.",
  "Culture and program fit may outweigh raw metrics; pick where you can match.",
  "Some residents will let rotators stay with them. These are great opportunities.",
  "Some DO programs value orthopaedic knowledge a lot. Study hard!",
];

export default function AwayRotationsPage() {
  const [tab, setTab] = useState<"md" | "do">("md");
  const focus = useMemo(() => getSeasonFocus(), []);

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-[#1f2937]">
      {/* Soft gradient + sparkles */}
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
              <span className="text-sm font-medium tracking-tight">SnapOrtho · Away Rotations</span>
            </div>
            <nav className="hidden gap-6 text-sm sm:flex">
              <a className="hover:underline" href="#timeline">Timeline</a>
              <a className="hover:underline" href="#succeed">Succeed</a>
              <a className="hover:underline" href="#prep">Prep</a>
              <a className="hover:underline" href="#strategy">Strategy</a>
              <Link href="/contact" className="hover:underline">Contact</Link>
            </nav>
          </div>
        </Container>
      </header>

      {/* Hero */}
      <section className="relative py-16 sm:py-20">
        <Container>
          <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
            <div>
              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="text-4xl sm:text-5xl font-bold tracking-tight text-[#444]"
              >
                Excelling on <span className="text-[#597498]">Away Rotations</span>
              </motion.h1>
              <p className="mt-4 text-gray-600 leading-relaxed">
                How to earn strong letters, impress the team, and evaluate program fit — with VSLO prep and on-service habits.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="sm" variant="outline">
                  <a href="#strategy">Build your plan</a>
                </Button>
              </div>
            </div>

            <Card className="bg-white/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-[#597498]" />
                  Season Focus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">{focus.window}</div>
                    <div className="mt-1 text-base font-medium text-[#333]">{focus.title}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      <Separator />

      {/* Timeline */}
      <section id="timeline" className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">Timeline</div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">Key VSLO / Away Dates</h2>
          </div>
          <div className="grid gap-4">
            {TIMELINE.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="shrink-0">{t.date}</Badge>
                    <p className="text-sm text-gray-600">{t.label}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-gray-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      <Separator />

      {/* Succeed */}
      <section id="succeed" className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">On-service Habits</div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">How to succeed on an away</h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            {SUCCESS.map((sec, i) => (
              <Card key={i} className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(89,116,152,0.12),transparent_60%)]" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-[#597498]">{sec.icon}</span>
                    {sec.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {sec.points.map((p, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#597498]/60" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-[#597498]" />
              <div className="text-sm text-gray-600">
                <p className="mb-1">
                  <span className="font-medium text-[#333]">Etiquette:</span> offer help and take initiative,
                  but don’t hover. If a resident or other medical student is being questioned, don’t answer over them.
                </p>
                <p>If you don’t know a question, be honest and take that opportunity to learn.</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Separator />

      {/* Prep */}
      <section id="prep" className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">Packing & Prep</div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">Show up ready</h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            {PACKING.map((sec, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-[#597498]">{sec.icon}</span>
                    {sec.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {sec.points.map((p, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#597498]/60" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <Separator />

      {/* Strategy (Tabs) */}
<section id="strategy" className="py-14">
  <Container>
    <div className="mb-6">
      <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
        MD / DO Toggle
      </div>
      <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
        Build a smart away plan
      </h2>
    </div>

    {/* ✅ New prominent Quick-Fit card */}
    <Card className="mb-6 border-[#597498]/30 bg-[#597498]/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Stars className="h-5 w-5 text-[#597498]" />
          Finding the best programs to rotate at
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-gray-700">
  <ul className="grid gap-2 sm:grid-cols-2">
    <li className="flex items-start gap-2">
      <div aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-[#597498]/60" />
      <span>Competitiveness: be honest and rotate where you have a realistic shot to match.</span>
    </li>
    <li className="flex items-start gap-2">
      <div aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-[#597498]/60" />
      <span>Case mix & autonomy; trauma level; night float vs q4 call.</span>
    </li>
    <li className="flex items-start gap-2">
      <div aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-[#597498]/60" />
      <span>Resident culture & mentorship; attendings’ teaching style.</span>
    </li>
    <li className="flex items-start gap-2">
      <div aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-[#597498]/60" />
      <span>Rotator volume & visibility (how many students per month?).</span>
    </li>
    <li className="flex items-start gap-2">
      <div aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-[#597498]/60" />
      <span>Region & support system (do you have family nearby?).</span>
    </li>
    <li className="flex items-start gap-2">
      <div aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-[#597498]/60" />
      <span>Research infrastructure & aligned faculty interests.</span>
    </li>
  </ul>
</CardContent>

    </Card>

    <div className="w-full">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "md" | "do")}
        options={[
          { value: "md", label: "General guidance" },
          { value: "do", label: "DO-focused tips" },
        ]}
      />
      <div className="mt-6 grid gap-3 text-sm text-gray-600">
        {(tab === "md" ? STRATEGY_MD : STRATEGY_DO).map((s, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
            {s}
          </div>
        ))}
      </div>
    </div>

    {/* Keep coordinator tips; remove the old Quick-fit card */}
    <div className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Coordinator pro-tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>• Verify bloodwork early — they can bottleneck approvals.</p>
          <p>• Confirm liability coverage amount; some sites require a higher cap.</p>
          <p>• Be organized with program specific requirements.</p>
          <p>• Be very polite! The coordinators work closely with program directors.</p>
        </CardContent>
      </Card>
    </div>
  </Container>
</section>


      <Separator />

      {/* FAQ */}
      <section id="faq" className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">FAQ</div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">Common away questions</h2>
            <p className="mt-2 text-sm text-gray-600">Quick answers to what applicants ask most. Open each to learn more.</p>
          </div>

          <div className="space-y-3">
            <details className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-sm font-medium text-[#333]">How many programs should I apply to on VSLO?</span>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-3 text-sm text-gray-600">
                Around five is reasonable for most — avoid over-applying so you don’t have to decline overlapping offers.
              </div>
            </details>

            <details className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-sm font-medium text-[#333]">What should I wear/bring on day 1?</span>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-3 text-sm text-gray-600">
                Over-dress (business professional + white coat). Carry shears, pen, marking pen, note pad, eye protection. Keep OR shoes handy.
              </div>
            </details>

            <details className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-sm font-medium text-[#333]">How do I ask for a LOR on an away?</span>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-3 text-sm text-gray-600">
                Be direct and ask early. Ask the residents for advice on who writes strong letters. Some programs will write a letter covering your entire rotation. If you are having a strong rotation, ask early, provide your CV & personal statement. Follow up with a thank-you and gentle reminders as needed.
              </div>
            </details>

            <details className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-sm font-medium text-[#333]">What if I need to withdraw from an away application?</span>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-3 text-sm text-gray-600">
                Withdraw promptly and politely once you accept elsewhere. Many sites are first-come; coordinators expect movement — just communicate early. Do not expect an interview if withdrawing.
              </div>
            </details>

            <details className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-sm font-medium text-[#333]">How do I prep for cases?</span>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-3 text-sm text-gray-600">
                Focus on anatomy, core classification systems, imaging views, and a few bread-and-butter principles. If assigned a topic, come prepared to teach it.
              </div>
            </details>
          </div>
        </Container>
      </section>

      <footer className="border-t border-gray-200/80 bg-[#f9f7f4] py-10">
        <Container>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="inline-flex items-center gap-2 text-[#597498] font-medium text-sm tracking-wide uppercase">
              <Sparkles className="h-4 w-4" />
              Built from real away experiences
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="max-w-3xl text-gray-700 text-sm sm:text-base leading-relaxed">
              Crafted by <span className="font-semibold text-[#444]">the SnapOrtho team</span> — wishing you an awesome month and a great match.
            </p>
            <p className="text-sm text-gray-500">Be humble, work hard, be yourself. 🩺</p>
          </div>
        </Container>
      </footer>
    </main>
  );
}
