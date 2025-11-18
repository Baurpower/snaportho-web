"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  FileText,
  GraduationCap,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Stars,
  Timer,
  PlayCircle,
  PauseCircle,
  RotateCw,
  Brain,
  MessagesSquare,
  FileSearch,
  Bone,
} from "lucide-react";

// ---------- Local UI primitives ----------
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${styles} ${className}`}>
      {children}
    </span>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-200/80">
      <div
        className="h-2 rounded-full bg-[#597498] transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function Separator() {
  return <hr className="border-gray-200/80" />;
}

// Simple tabs
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
      <div
        className={`grid gap-1`}
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}
      >
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

// ---------- Practice Interview Types / Data ----------
type InterviewCategory = "basic" | "behavioral" | "research" | "ortho";

type InterviewQuestion = {
  id: number;
  category: InterviewCategory;
  label: string;
  prompt: string;
  hint?: string;
};

const QUESTION_LIBRARY: InterviewQuestion[] = [
  // Basic
  {
    id: 1,
    category: "basic",
    label: "Why Orthopaedics?",
    prompt:
      "Tell me why you chose orthopaedic surgery.",
    hint: "Be concise. Do not repeat your personal statement.",
  },
  {
    id: 2,
    category: "basic",
    label: "Why Our Program?",
    prompt:
      "Why are you interested in our program specifically?",
    hint: "Tie your goals to their strengths: culture, case mix, mentorship, location, or resident life.",
  },
  {
    id: 3,
    category: "basic",
    label: "10-Year Vision",
    prompt:
      "Where do you see yourself 10 years from now in your career and life?",
    hint: "",
  },
  {
    id: 4,
    category: "basic",
    label: "Strengths & Weaknesses",
    prompt:
      "What would you say is your greatest strength, and what is your biggest weakness?",
    hint: "Include examples of your greatest strength. Show how you are working on improving your weakness.",
  },
  // Behavioral
  {
    id: 5,
    category: "behavioral",
    label: "Failure / Setback",
    prompt:
      "Tell me about a time you failed or came up short. What happened, and what did you do afterward?",
    hint: "Use a structured story (STAR). Show insight, ownership, and how you changed your behavior.",
  },
  {
    id: 6,
    category: "behavioral",
    label: "Difficult Team Dynamics",
    prompt:
      "Describe a time you worked with a difficult team member. How did you handle it, and what was the outcome?",
    hint: "Avoid character attacks. Focus on communication, shared goals, and professionalism.",
  },
  {
    id: 7,
    category: "behavioral",
    label: "Ethical Dilemma",
    prompt:
      "Tell me about a time you faced an ethical dilemma in clinical rotations. How did you navigate it?",
    hint: "Clarify the conflict, who was affected, and how you protected patient safety and integrity.",
  },
  // Research
  {
    id: 8,
    category: "research",
    label: "Flagship Project",
    prompt:
      "Tell me about ______ research item. Walk me through the question, methods, your role, and what you found.",
    hint: "Be accurate and concise.",
  },
  {
    id: 9,
    category: "research",
    label: "Limitations & Next Steps",
    prompt:
      "For one of your research items, what were the biggest limitations, and what would you do next to improve the study?",
    hint: "Be honest and concrete. Show that you understand study design and can think forward.",
  },
  {
    id: 10,
    category: "research",
    label: "Stats & Interpretation",
    prompt:
      "Explain one key result from your work to a non-orthopaedic audience. What did you actually prove or show?",
    hint: "Avoid jargon. Translate p-values and odds ratios into plain language and clinical takeaways.",
  },
  // Ortho knowledge / workflow
  {
    id: 11,
    category: "ortho",
    label: "Fracture Conference Question",
    prompt:
      "A 72-year-old falls and sustains an intertrochanteric femur fracture. Walk me through your assessment, initial management, and operative plan.",
    hint: "Think ATLS, pain control, traction vs not, implants, and post-op plan.",
  },
  {
    id: 12,
    category: "ortho",
    label: "Consult Workflow",
    prompt:
      "You are on call and receive three pages at once: open tibia fracture, suspected compartment syndrome, and a distal radius fracture in the ED. How do you prioritize and manage your time?",
    hint: "Prioritize limb- and life-threatening issues. Show triage, communication, and delegation.",
  },
  {
    id: 13,
    category: "ortho",
    label: "Complication Discussion",
    prompt:
      "How would you explain a common complication (for example, infection or nonunion) to a patient and their family?",
    hint: "Keep it calm, honest, and structured. Focus on what it means and what you’ll do about it.",
  },
];

// ---------- Practice Interview Component ----------
function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getRandomQuestion(
  category: InterviewCategory | "all",
  prevId?: number
): InterviewQuestion {
  const pool =
    category === "all"
      ? QUESTION_LIBRARY
      : QUESTION_LIBRARY.filter((q) => q.category === category);
  if (!pool.length) return QUESTION_LIBRARY[0];
  const filtered = prevId ? pool.filter((q) => q.id !== prevId) : pool;
  const base = filtered.length ? filtered : pool;
  const idx = Math.floor(Math.random() * base.length);
  return base[idx];
}

function PracticeInterview() {
  const [category, setCategory] = useState<InterviewCategory | "all">("all");
  const [duration, setDuration] = useState<number>(120); // seconds
  const [remaining, setRemaining] = useState<number>(120);
  const [isRunning, setIsRunning] = useState(false);
  const [current, setCurrent] = useState<InterviewQuestion>(() =>
    getRandomQuestion("all")
  );

  useEffect(() => {
    if (!isRunning) return;
    if (remaining <= 0) {
      setIsRunning(false);
      return;
    }
    const id = window.setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRunning, remaining]);

  const progress = useMemo(() => {
    if (duration === 0) return 0;
    const used = duration - remaining;
    return Math.max(0, Math.min(100, (used / duration) * 100));
  }, [duration, remaining]);

  const handleNewQuestion = () => {
    const next = getRandomQuestion(category, current?.id);
    setCurrent(next);
    setRemaining(duration);
    setIsRunning(false);
  };

  const handleStartPause = () => {
    if (remaining <= 0) setRemaining(duration);
    setIsRunning((v) => !v);
  };

  const handleReset = () => {
    setRemaining(duration);
    setIsRunning(false);
  };

  const handleDurationChange = (val: number) => {
    setDuration(val);
    setRemaining(val);
    setIsRunning(false);
  };

  const categoryLabelMap: Record<InterviewCategory | "all", string> = {
    all: "All categories",
    basic: "Basic questions",
    behavioral: "Behavioral",
    research: "Research",
    ortho: "Orthopaedic knowledge",
  };

  const categoryChipMap: Record<InterviewCategory, string> = {
    basic: "Basic",
    behavioral: "Behavioral scenario",
    research: "Research",
    ortho: "Ortho knowledge",
  };

  return (
    <Card className="bg-white/95">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-[#597498]" />
            Practice Interview
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Category selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Question bank
            </span>
            <span className="text-xs text-gray-500">
              {categoryLabelMap[category]}
            </span>
          </div>
          <Tabs
            value={category}
            onValueChange={(v) => {
              const typed = v as InterviewCategory | "all";
              setCategory(typed);
              const next = getRandomQuestion(typed);
              setCurrent(next);
              setRemaining(duration);
              setIsRunning(false);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "basic", label: "Basic" },
              { value: "behavioral", label: "Behavioral" },
              { value: "research", label: "Research" },
              { value: "ortho", label: "Ortho knowledge" },
            ]}
          />
        </div>

        {/* Question display */}
        <div className="rounded-2xl border border-gray-200 bg-[#fbfaf8] p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <QuoteIcon />
              <span className="ml-1">{current.label}</span>
            </Badge>
            <Badge variant="primary">
              {current.category === "basic" && <GraduationCap className="mr-1 h-3 w-3" />}
              {current.category === "behavioral" && (
                <MessagesSquare className="mr-1 h-3 w-3" />
              )}
              {current.category === "research" && <FileSearch className="mr-1 h-3 w-3" />}
              {current.category === "ortho" && <Bone className="mr-1 h-3 w-3" />}
              {categoryChipMap[current.category]}
            </Badge>
          </div>
          <p className="text-sm text-[#1f2937] leading-relaxed">{current.prompt}</p>
          {current.hint && (
            <p className="mt-3 text-xs text-gray-600">
              <span className="font-medium text-[#333]">Hint:</span> {current.hint}
            </p>
          )}
        </div>

        {/* Timer + controls */}
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.5fr),minmax(0,1fr)] sm:items-center">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span className="font-medium text-[#333]">Answer timer</span>
              <span className="tabular-nums">{formatSeconds(remaining)}</span>
            </div>
            <Progress value={progress} />
            <p className="text-xs text-gray-500">
              Aim for a clear, structured answer in{" "}
              <span className="font-medium">60–120 seconds</span>. Practice pausing instead
              of rambling when you hit your main points.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleStartPause}
                className="min-w-[120px] justify-center"
              >
                {isRunning ? (
                  <>
                    <PauseCircle className="h-4 w-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    {remaining === duration ? "Start timer" : "Resume"}
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="min-w-[100px] justify-center"
              >
                <RotateCw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleNewQuestion}
                className="min-w-[140px] justify-center"
              >
                <ArrowRight className="h-4 w-4" />
                New question
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-medium text-[#333]">Answer length:</span>
              <div className="flex gap-1">
                {[60, 90, 120].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleDurationChange(val)}
                    className={
                      "rounded-full border px-2 py-0.5 transition-colors " +
                      (duration === val
                        ? "border-[#597498] bg-[#597498]/10 text-[#597498]"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")
                    }
                  >
                    {val / 60} min
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Pro tip: Record yourself on your phone, then replay once to spot filler words,
          pacing issues, and places to tighten your story.
        </p>
      </CardContent>
    </Card>
  );
}

function QuoteIcon() {
  return (
    <svg
      className="h-3 w-3"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3.5 3.5C2.12 4.47 1.25 6.02 1.25 7.7c0 2.07 1.38 3.3 3.05 3.3 1.52 0 2.7-1.07 2.7-2.76 0-1.59-1.14-2.74-2.69-2.74-.32 0-.63.06-.94.18.2-.7.63-1.31 1.3-1.76L3.5 3.5Zm7 0C9.12 4.47 8.25 6.02 8.25 7.7c0 2.07 1.38 3.3 3.05 3.3 1.52 0 2.7-1.07 2.7-2.76 0-1.59-1.14-2.74-2.69-2.74-.32 0-.63.06-.94.18.2-.7.63-1.31 1.3-1.76l-1.17-.92Z"
        fill="currentColor"
      />
    </svg>
  );
}

// ---------- Page Content Text Helpers ----------
const UOD_POINTS = {
  whatItIs: [
    "Universal Offer Day is the START of orthopaedic interviews. Many orthopaedic programs (not all) send their interview invites.",
    "That first invite can feel like pure validation: an orthopaedic program looked at your application and said, “Yes.”",
  ],
  buildup: [
    "In the days before, you’ve heard every reassuring phrase—“all it takes is one,” “trust the process”—but they rarely quiet the noise.",
    "Logically, you know the match is a long game. Emotionally, it can feel like everything you’ve worked for is being judged in a few hours.",
  ],
  highsLows: [
    "As the day goes on, the emotional whiplash can be real! There will be highs and lows. There will be the creeping question of whether more invites are coming.",
    "By the evening, most people are tired, overstimulated, and trying to interpret what the silence means.",
  ],
  managing: {
    realistic: [
      "Away rotations do not always translate directly into interviews, even when things seemingly went well.",
      "Having a strong application may not be enough to receive interviews outside of your rotations.",
    ],
    silence: [
      "Many programs never send formal rejections; silence is common, not personal.",
      "By the end of the day, it’s reasonable to assume your main UOD wave is done, but occasional later invites still happen.",
      "You can talk with residents or co-applicants to see whether a program participated in Universal Offer Day this year.",
    ],
    shiftFocus: [
      "Once the dust settles, the most productive move is to focus on the interviews you do have.",
      "Research the programs you’ll visit, organize your calendar, and start practicing your stories and answers.",
      "It’s completely valid to feel disappointed and you should let yourself experience all the emotions.",
    ],
  },
};

const PREP_CATEGORIES = [
  {
    title: "Basic questions",
    icon: <GraduationCap className="h-4 w-4" />,
    bullets: [
      "Your “Why orthopaedics?” answer should feel like a highlight reel, not a personal statement recitation.",
      "“Why this program?” needs specifics: cases, mentorship, resident culture, and how that fits your goals.",
      "Future questions (“Where do you see yourself in 10 years?”) should be realistic, flexible, and values-driven.",
    ],
  },
  {
    title: "Behavioral / scenarios",
    icon: <Brain className="h-4 w-4" />,
    bullets: [
      "These questions test how you think under pressure, not whether you know the “right” script.",
      "Use a structure (like STAR) so your story doesn’t wander.",
      "Pick examples that show teachability, teamwork, and integrity—especially when things went poorly.",
    ],
  },
  {
    title: "Research",
    icon: <FileText className="h-4 w-4" />,
    bullets: [
      "You should be able to explain each major project in 60–90 seconds without reading your abstract.",
      "Be prepared to discuss methods, limitations, and your specific role.",
    ],
  },
  {
    title: "Orthopaedic knowledge",
    icon: <Bone className="h-4 w-4" />,
    bullets: [
      "It is not uncommon for an orthopaedic knowledge room.",
        "The format can be variable. Could be fracture-conference style prompts or multi-consult call scenarios.",
      "They’re evaluating your growth from ortho rotations.",
      "This is your time to showcase everything you have learned.",
    ],
  },
];

// ---------- Page ----------
export default function InterviewsPage() {

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
                Path to Ortho · Interviews
              </span>
            </div>
            <nav className="hidden gap-6 text-sm sm:flex">
              <a className="hover:underline" href="#prep">
                Prep basics
              </a>
              <a className="hover:underline" href="#practice">
                Practice
              </a>
              <a className="hover:underline" href="#timeline">
                Timeline
              </a>
              <a className="hover:underline" href="#uod">
                Universal Offer Day
              </a>
              <a className="hover:underline" href="#faq">
                UOD FAQ
              </a>
              <Link href="/contact" className="hover:underline">
                Contact
              </Link>
            </nav>
          </div>
        </Container>
      </header>

      {/* Hero at the top */}
      <section className="relative pt-16 pb-6 sm:pt-20 sm:pb-8">
        <Container>
          <div className="max-w-3xl">
            <motion.h1
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="text-4xl sm:text-5xl font-bold tracking-tight text-[#444]"
            >
              Prepare for Ortho Interviews
            </motion.h1>
            <p className="mt-4 text-gray-600 leading-relaxed">
              This page is built for orthopaedic applicants who want a realistic view of
              the process and a practical way to get better at interviews.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="sm" className="gap-2">
                <a href="#practice" className="inline-flex items-center gap-2">
                  Start practicing now <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="sm" variant="outline">
                <a href="#uod">Read about Universal Offer Day</a>
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 text-xs text-gray-600 sm:grid-cols-2">
  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3">
    <AlertCircle className="h-4 w-4 text-[#597498]" />
    <span>
      The process is unpredictable and emotional.
    </span>
  </div>
  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3">
    <Stars className="h-4 w-4 text-[#597498]" />
    <span>
      Use this tool to build muscle memory for your answers so interview day
      feels like a familiar rep, not a cold start.
    </span>
  </div>
</div>


          </div>
        </Container>
      </section>

      {/* 1. Prep basics */}
      <section id="prep" className="pt-6 pb-14 sm:pt-8">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
              Interview preparation
            </div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
              How to stand out on INTERVIEW DAY!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Interviews should feel effortless on game day because the hard work you have put in beforehand.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Why preparation is everything</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>
                  • Nerves can shut down your ability to think clearly in the moment, even
                  when you know the material cold.
                </p>
                <p>
                  • Practicing out loud turns your answers from scattered thoughts into
                  smooth, repeatable stories.
                </p>
                <p>
                  • Repetition builds fluency so by interview day, your answer is strong.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>The Importance of Interviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>• Everyone who receives an interview is AMAZING</p>
                <p>
                  • The interview is a chance to SET YOURSELF APART from the other applicants.
                </p>
                <p>• Interviews are commonly scored and factor into the final ranking.</p>
                <p>
                  • The interview is the FINAL IMPRESSION you will leave on programs.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-4">
  {PREP_CATEGORIES.map((block) => (
    <Card key={block.title} className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(89,116,152,0.12),transparent_60%)]" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <span className="text-[#597498]">{block.icon}</span>
          {block.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-gray-600">
        {block.bullets.map((b, i) => (
          <p key={i}>{b}</p>
        ))}
      </CardContent>
    </Card>
  ))}
</div>
        </Container>
      </section>

      <Separator />

      {/* 2. Practice section – ONLY the tool has id="practice" */}
      <section id="practice" className="relative py-16 sm:py-20">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
              Practice
            </div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
              Run real interview reps
            </h2>
            <p className="mt-2 text-sm text-gray-600 max-w-xl">
              Use this tool to cycle through realistic questions, time your answers, and
              build fluency before the real thing.
            </p>
          </div>

          <div className="mt-6">
            <PracticeInterview />
          </div>
        </Container>
      </section>

      {/* 3. Interview season timeline */}
      <section id="timeline" className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
              Big picture
            </div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
              Interview season timeline
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Zoom out and know where you are in the process—from ERAS and aways through
              Universal Offer Day and the heart of interview season.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <NotebookPen className="h-4 w-4 text-[#597498]" />
                  Choosing Ortho
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-gray-600">
                <p>• Solidfy your “Why ortho?” and fully commit to the field.</p>
                <p>• Build an impressive CV.</p>
                <p>• Identify mentors to help you through the process.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#597498]" />
                  ERAS & aways
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-gray-600">
                <p>• Submit ERAS! Celebrate your successes.</p>
                <p>• Finish aways strong! You are so close to being an orthopaedic resident.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#597498]" />
                  Universal Offer Day
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-gray-600">
                <p>• 12 PM EST: invites roll out.</p>
                <p>• Afternoon: You start to realize you may not be getting interviews at some of your programs.</p>
                <p>• Evening: debrief, let yourself feel things, then refocus on what you have!</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#597498]" />
                  Interview season
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-gray-600">
                <p>• Travel around the country!</p>
                <p>• Showcase how awesome you are.</p>
                <p>• Review your notes and build a rank list that feels right.</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-[minmax(0,2fr),minmax(0,1.4fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Reframing the process</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <p>
                  You EARNED your interview spots. Someone read your application and decided you
                  belong in the room...that’s not random.
                </p>
                <p>
                  You don’t need to be perfect; you need to show who you really are when
                  you’re working hard, caring about patients, and supporting your team.
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      <Separator />

     {/* 4. Universal Offer Day */}
<section id="uod" className="py-14">
  <Container>
    <div className="mb-6">
      <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
        Universal Offer Day
      </div>
      <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
        What Universal Offer Day actually feels like
      </h2>
      <p className="mt-2 text-sm text-gray-600 max-w-2xl">
        On paper, it’s a coordinated invite release. In real life, it’s one of the
        most emotionally loaded days of medical school.
      </p>
    </div>

    <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1.1fr)]">
      {/* Left: simple vertical timeline */}
      <div className="relative text-sm text-gray-600">
        {/* vertical line (desktop) */}
        <div className="pointer-events-none absolute left-2 top-1 bottom-1 hidden border-l border-gray-200 sm:block" />

        {[
          { label: "Before the window opens", points: UOD_POINTS.buildup },
          { label: "When interviews are released", points: UOD_POINTS.whatItIs },
          { label: "By the end of the day", points: UOD_POINTS.highsLows },
        ].map((block) => (
          <div key={block.label} className="relative pl-7 sm:pl-9 mb-6 last:mb-0">
            {/* dot */}
            <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-[#597498]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {block.label}
            </p>
            <div className="mt-1 space-y-2">
              {block.points.map((p: string, i: number) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Right: playbook / how to handle it */}
      <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm space-y-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          How to navigate Universal Offer Day
        </p>

        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <p className="font-medium text-[#333]">Set realistic expectations</p>
            <ul className="mt-1 space-y-1">
              {UOD_POINTS.managing.realistic.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#597498]/70" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-medium text-[#333]">Plan for silence and mixed news</p>
            <ul className="mt-1 space-y-1">
              {UOD_POINTS.managing.silence.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#597498]/70" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-medium text-[#333]">Shift your focus forward</p>
            <ul className="mt-1 space-y-1">
              {UOD_POINTS.managing.shiftFocus.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#597498]/70" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          If Universal Offer Day doesn&apos;t go how you hoped, it&apos;s still one day in
          a much longer story. The goal is to process it, then move your energy toward
          the interviews and opportunities you do have.
        </p>
      </div>
    </div>
  </Container>
</section>

<Separator />



      {/* 5. FAQ – only Universal Offer Day */}
      <section id="faq" className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
              Universal Offer Day FAQ
            </div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
              Common questions about Universal Offer Day
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Quick answers to what most applicants wonder before, during, and after
              Universal Offer Day.
            </p>
          </div>

          <div className="space-y-3">
            <details className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-sm font-medium text-[#333]">
                  What if I don&apos;t get any invites on Universal Offer Day?
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-3 text-sm text-gray-600">
                Not all programs participate in UOD. If the day ends without invites, it&apos;s painful but
                not a verdict on your worth or future in orthopaedics. Focus on what you
                can still control: talking with mentors, considering prelim/categorical
                backup plans, and doubling down on growth for the next application cycle if
                needed.
              </div>
            </details>

            <details className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-sm font-medium text-[#333]">
                  Should I email programs on Universal Offer Day if I don&apos;t hear from them?
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-3 text-sm text-gray-600">
                In general, no. Programs are already flooded with logistics on UOD, and
                real-time &quot;Did I get an invite?&quot; emails rarely help. If you have a genuine
                contact it is appropriate to ask if they sent out interview invites.
              </div>
            </details>

            <details className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-sm font-medium text-[#333]">
                  How do I manage overlapping invites and time slots?
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-3 text-sm text-gray-600">
                Keep a paper or digital calendar. Accept
                your top-priority programs first, then politely decline or request
                alternate dates for others. It&apos;s okay to ask about switching dates once,
                but avoid multiple rapid-fire changes that create extra work for
                coordinators.
              </div>
            </details>

            <details className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-sm font-medium text-[#333]">
                  How do I handle social media and group chats on Universal Offer Day?
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-3 text-sm text-gray-600">
                Group chats can be helpful to learn if a program sent out invites but brutal for comparison. If you
                notice that seeing other people&apos;s invites is spiking your anxiety, mute
                or step away. Remember that UOD is just a piece of your journey. All it takes is one!
              </div>
            </details>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200/80 bg-[#f9f7f4] py-10">
        <Container>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-[#597498]">
              <Sparkles className="h-4 w-4" />
              Built by people who have lived this process
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-gray-700 sm:text-base">
              Created by{" "}
              <span className="font-semibold text-[#444]">the SnapOrtho team</span> to give you honest advice and practical tools, so you can show up as your best, authentic self.
            </p>
            <p className="text-sm text-gray-500">
              You earned your seat. Now let&apos;s help you keep it. 💪🦴
            </p>
          </div>
        </Container>
      </footer>
    </main>
  );
}
