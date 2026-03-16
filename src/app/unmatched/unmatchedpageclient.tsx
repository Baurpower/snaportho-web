"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  GraduationCap,
  Heart,
  Lightbulb,
  Stethoscope,
  Target,
  UserRound,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

type AnswerValue = "1" | "2" | "3" | "4" | "5" | "unknown" | string;

type ScaleChoiceMeta = {
  label: string;
  explanation: string;
  leans?: "research" | "one-year" | "neutral";
};

type ScaleQuestionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
  scaleLabels?: {
    low: string;
    high: string;
  };
  answerGuide: Record<string, ScaleChoiceMeta>;
};

type Choice = {
  label: string;
  value: AnswerValue;
  description?: string;
};

type StepQuestionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  choices: Choice[];
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
};

function StepQuestion({
  eyebrow,
  title,
  description,
  choices,
  value,
  onChange,
}: StepQuestionProps) {
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
          {description}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {choices.map((choice) => {
          const active = value === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              onClick={() => onChange(choice.value)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                active
                  ? "border-sky-600 bg-sky-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    {choice.label}
                  </div>
                  {choice.description ? (
                    <div className="mt-1 text-sm leading-6 text-slate-600">
                      {choice.description}
                    </div>
                  ) : null}
                </div>
                {active ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
                ) : (
                  <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}

type ReflectionCardProps = {
  title: string;
  subtitle: string;
  summary: string;
  bullets: string[];
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
};

function ReflectionCard({
  title,
  subtitle,
  summary,
  bullets,
  icon,
  open,
  onToggle,
}: ReflectionCardProps) {
  return (
    <motion.div
      layout
      transition={{ duration: 0.28, ease: "easeInOut" }}
      className={`rounded-3xl border shadow-sm transition-all ${
        open
          ? "border-sky-200 bg-sky-50/70"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-6 text-left md:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                open ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-700"
              }`}
            >
              {icon}
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
                {subtitle}
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">{title}</h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 md:text-[15px]">
                {summary}
              </p>
            </div>
          </div>

          <ChevronRight
            className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${
              open ? "rotate-90 text-sky-700" : ""
            }`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-sky-100 px-6 pb-6 pt-5 md:px-7 md:pb-7">
              <ul className="space-y-3 text-sm leading-7 text-slate-700 md:text-[15px]">
                {bullets.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-sm font-medium text-sky-700">
                Tap again to collapse
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ScaleQuestion({
  eyebrow,
  title,
  description,
  value,
  onChange,
  scaleLabels = {
    low: "Strongly disagree",
    high: "Strongly agree",
  },
  answerGuide,
}: ScaleQuestionProps) {
  const selectedMeta = value ? answerGuide[value] : undefined;

  const scaleOptions = [
    { value: "1", shortLabel: "Strongly\ndisagree" },
    { value: "2", shortLabel: "Disagree" },
    { value: "3", shortLabel: "Neutral" },
    { value: "4", shortLabel: "Agree" },
    { value: "5", shortLabel: "Strongly\nagree" },
  ];

  const selectedIndex = scaleOptions.findIndex((option) => option.value === value);

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
          {eyebrow}
        </p>
      ) : null}

      <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
        {title}
      </h2>

      {description ? (
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
          {description}
        </p>
      ) : null}

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span>{scaleLabels.low}</span>
          <span>{scaleLabels.high}</span>
        </div>

        <div className="relative">
          <div className="absolute left-[5%] right-[5%] top-5 h-[2px] bg-slate-200" />

          {selectedIndex >= 0 && (
            <div
              className="absolute left-[5%] top-5 h-[2px] bg-sky-500 transition-all duration-300"
              style={{
                width: `${selectedIndex * 22.5}%`,
              }}
            />
          )}

          <div className="relative grid grid-cols-5">
            {scaleOptions.map((option) => {
              const active = value === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value)}
                  className="group flex flex-col items-center text-center"
                >
                  <div
                    className={`relative z-10 flex items-center justify-center rounded-full border-2 transition-all duration-200 ${
                      active
                        ? "h-11 w-11 border-sky-600 bg-sky-600 shadow-[0_0_0_6px_rgba(14,165,233,0.12)]"
                        : "h-10 w-10 border-slate-300 bg-white group-hover:border-slate-400"
                    }`}
                  >
                    <span
                      className={`rounded-full transition-all duration-200 ${
                        active
                          ? "h-3 w-3 bg-white"
                          : "h-2.5 w-2.5 bg-slate-300 group-hover:bg-slate-400"
                      }`}
                    />
                  </div>

                  <span
                    className={`mt-3 whitespace-pre-line text-xs font-semibold leading-4 md:text-sm ${
                      active ? "text-sky-700" : "text-slate-600"
                    }`}
                  >
                    {option.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => onChange("unknown")}
            className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              value === "unknown"
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            I don’t know yet
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {selectedMeta && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -4 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -4 }}
            transition={{ duration: 0.24, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Your answer: {selectedMeta.label}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {selectedMeta.explanation}
                  </p>
                </div>

                <div
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                    selectedMeta.leans === "research"
                      ? "bg-sky-100 text-sky-800"
                      : selectedMeta.leans === "one-year"
                      ? "bg-slate-200 text-slate-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {selectedMeta.leans === "research" && "Leans Research Year"}
                  {selectedMeta.leans === "one-year" && "Leans 1-Year Position"}
                  {selectedMeta.leans === "neutral" && "Needs More Reflection"}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

type SummaryCardProps = {
  title: string;
  subtitle: string;
  pros: string[];
  cons: string[];
  accent: "sky" | "slate";
  highlighted?: boolean;
};

function SummaryCard({
  title,
  subtitle,
  pros,
  cons,
  accent,
  highlighted = false,
}: SummaryCardProps) {
  const isSky = accent === "sky";

  const cardClasses = isSky
    ? highlighted
      ? "border-sky-300 bg-sky-100 shadow-md ring-2 ring-sky-200"
      : "border-slate-200 bg-white"
    : highlighted
    ? "border-slate-300 bg-slate-100 shadow-md ring-2 ring-slate-200"
    : "border-slate-200 bg-white";

  return (
    <div className={`rounded-3xl border p-6 shadow-sm transition-all duration-300 ${cardClasses}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>

        {highlighted && (
          <div
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
              isSky
                ? "bg-sky-700 text-white"
                : "bg-slate-900 text-white"
            }`}
          >
            Recommended
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Pros
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {pros.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">
            Tradeoffs
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {cons.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function UnmatchedPage() {
  const [reapplyChoice, setReapplyChoice] = useState<AnswerValue | undefined>();
  const [deficiencyChoice, setDeficiencyChoice] = useState<AnswerValue | undefined>();
  const [backupChoice, setBackupChoice] = useState<AnswerValue | undefined>();
  const [graduateChoice, setGraduateChoice] = useState<AnswerValue | undefined>();
  const [salaryChoice, setSalaryChoice] = useState<AnswerValue | undefined>();
  const [connectionsChoice, setConnectionsChoice] = useState<AnswerValue | undefined>();
  const [uncertaintyChoice, setUncertaintyChoice] = useState<AnswerValue | undefined>();
  const [awaysChoice, setAwaysChoice] = useState<AnswerValue | undefined>();
  const [enjoyResearch, setEnjoyResearch] = useState<AnswerValue | undefined>();
  const [startResidencyChoice, setStartResidencyChoice] = useState<AnswerValue | undefined>();
  const [openReflections, setOpenReflections] = useState<string[]>([]);

    const completedCount = useMemo(() => {
    const values = [
      reapplyChoice,
      deficiencyChoice,
      backupChoice,
      graduateChoice,
      salaryChoice,
      connectionsChoice,
      uncertaintyChoice,
      awaysChoice,
    ];
    return values.filter((value) => value && value !== "unknown").length;
  }, [
    reapplyChoice,
    deficiencyChoice,
    backupChoice,
    graduateChoice,
    salaryChoice,
    connectionsChoice,
    uncertaintyChoice,
    awaysChoice,
  ]);

  const decisionQuestions = [
  enjoyResearch,
  startResidencyChoice,
  salaryChoice,
  connectionsChoice,
  uncertaintyChoice,
  awaysChoice,
];

const getScaleScore = (value?: AnswerValue): number => {
  switch (value) {
    case "1":
      return -2;
    case "2":
      return -1;
    case "3":
      return 0;
    case "4":
      return 1;
    case "5":
      return 2;
    case "unknown":
    default:
      return 0;
  }
};

const decisionScore = useMemo(() => {
  return decisionQuestions.reduce((sum, value) => sum + getScaleScore(value), 0);
}, [
  enjoyResearch,
  startResidencyChoice,
  salaryChoice,
  connectionsChoice,
  uncertaintyChoice,
  awaysChoice,
]);

const unknownDecisionCount = useMemo(() => {
  return decisionQuestions.filter((value) => !value || value === "unknown").length;
}, [
  enjoyResearch,
  startResidencyChoice,
  salaryChoice,
  connectionsChoice,
  uncertaintyChoice,
  awaysChoice,
]);

const recommendation = useMemo(() => {
  if (unknownDecisionCount >= 3) {
    return "mixed";
  }

  if (decisionScore >= 6) return "strong-research";
  if (decisionScore >= 2) return "lean-research";
  if (decisionScore <= -6) return "strong-one-year";
  if (decisionScore <= -2) return "lean-one-year";
  return "mixed";
}, [decisionScore, unknownDecisionCount]);

  const reflectionCards = [
  {
    key: "academics",
    title: "Weak Academics",
    subtitle: "Grades / Board scores",
    summary:
      "Usually the hardest bucket to change. This requires honesty about how steep the climb may be.",
    icon: <GraduationCap className="h-6 w-6" />,
    bullets: [
      "Board scores and grades are already complete, so this is often the least modifiable category.",
      "That does not mean reapplying is impossible, but it can be more challenging.",
      "Applicants in this bucket usually need better targeting, and stronger advocacy (mentorship).",
      "Lean on mentors to assess your competitiveness as a reapplicant.",
    ],
  },
  {
    key: "research",
    title: "Weak Extracurriculars",
    subtitle: "Mostly research",
    summary:
      "More fixable than academics. This is an area where real improvement can happen before the next cycle.",
    icon: <Lightbulb className="h-6 w-6" />,
    bullets: [
      "If research was weak, this is one of the clearest areas where you can make measurable progress.",
      "You may be able to complete projects, and show productivity before the next application cycle.",
      "The challenge is that weak prior research can also make it harder to secure a strong research position.",
    ],
  },
  {
    key: "mentorship",
    title: "Weak Mentorship",
    subtitle: "Often the most fixable",
    summary:
      "For many applicants, this is the biggest lever to change before reapplying.",
    icon: <UserRound className="h-6 w-6" />,
    bullets: [
      "If you do a research year or internship year, you can gain real mentors who will genuinely go to bat for you.",
      "Strong mentors are often what can make the difference in the next application cycle.",
    ],
  },
  {
    key: "aways",
    title: "Weak Aways",
    subtitle: "Targeting or performance issues",
    summary:
      "Sometimes the problem is not effort. It is where you rotated, or other factors that influenced your rotation.",
    icon: <Target className="h-6 w-6" />,
    bullets: [
      "Ask whether you overshot your away rotations or rotated at places that were never realistic fits.",
      "Also ask whether there were performance, communication, or visibility issues that need to be addressed honestly.",
      "The good news is that this category is often more fixable than people think.",
      "Better targeting, stronger mentorship, and a more realistic strategy can change this dramatically.",
    ],
  },
];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-50 text-slate-900">
      <section className="relative overflow-hidden px-6 pb-16 pt-20 md:px-10 md:pb-24 md:pt-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_20%)]" />
        <div className="relative mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200 backdrop-blur">
              <Heart className="h-4 w-4" />
              SnapOrtho Guidance
            </div>
            <h1 className="mt-8 text-6xl font-black tracking-tight text-white md:text-8xl">
              UNMATCHED
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              Honest guidance for one of the hardest weeks in your medical career.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="px-6 md:px-10">
        <div className="mx-auto -mt-8 max-w-6xl rounded-[2rem] border border-white/10 bg-white p-6 shadow-2xl md:p-10">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
              A message from Alex
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              First — take a breath.
            </h2>
            <div className="mt-6 max-w-4xl space-y-5 text-base leading-8 text-slate-700">
              
              <p>
                If you&apos;re here, I&apos;m sorry. There is truly nothing I can say that will remove the emotions and feelings you&apos;re having right now.
              </p>
              <p>
                I will never forget the moment I found out I didn&apos;t match. I was in my apartment, and I had just opened the email. The wave of emotions that hit me was unlike anything I had ever experienced before.
              </p>
              <p>
                Just know that loved ones, time, and future success will help alleviate some of the pain.
              </p>
              <p>
                The decisions you make this week can have huge ramifications for the rest of your life. Try not to let emotion guide you or stun you into inaction.
              </p>
              <p>
                Let&apos;s walk through this clearly, honestly, and strategically.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-10 md:px-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Your progress
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  Interactive Decision Guide
                </p>
              </div>
              <div className="min-w-[220px]">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                  <span>{completedCount} of 8 questions answered</span>
                  <span>{Math.round((completedCount / 8) * 100)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-sky-600 transition-all duration-500"
                    style={{ width: `${(completedCount / 8) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <StepQuestion
              eyebrow="Step 1"
              title="Are you applying Orthopaedic Surgery again?"
              description="This is a big decision. You worked extremely hard for orthopaedics. The field is highly competitive, and it is only getting more competitive."
              value={reapplyChoice}
              onChange={setReapplyChoice}
              choices={[
                { label: "Yes — I want to apply ortho again", value: "yes" },
                { label: "No — I need to pivot", value: "no" },
                { label: "I’m not sure yet", value: "unsure" },
              ]}
            />

            <AnimatePresence>
              {(reapplyChoice === "yes" || reapplyChoice === "unsure") && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-8"
                >
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                      First reflection
                    </p>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                      Why do you think you didn&apos;t match?
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                      You do not need to type anything. Just be honest with yourself. Click each card to reveal the big buckets and the thoughts behind them.
                    </p>

                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
  {reflectionCards.map((card) => (
    <ReflectionCard
      key={card.key}
      title={card.title}
      subtitle={card.subtitle}
      summary={card.summary}
      icon={card.icon}
      bullets={card.bullets}
      open={openReflections.includes(card.key)}
onToggle={() =>
  setOpenReflections((prev) =>
    prev.includes(card.key)
      ? prev.filter((key) => key !== card.key)
      : [...prev, card.key]
  )
}
    />
  ))}
</div>
                  </section>

                  <StepQuestion
                    eyebrow="Step 2"
                    title="Can you address these deficiencies before applying ortho again?"
                    description="If the answer is no, reapplying becomes much riskier and you may need to seriously consider pivoting through SOAP."
                    value={deficiencyChoice}
                    onChange={setDeficiencyChoice}
                    choices={[
                      { label: "Yes", value: "yes" },
                      { label: "No", value: "no" },
                      { label: "Not sure", value: "unsure" },
                    ]}
                  />

                  {deficiencyChoice === "no" && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-700" />
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">Important reality check</h3>
                          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">
                            If you cannot meaningfully address the deficiencies that likely prevented you from matching, then reapplying ortho may not be the smartest move. In that case, you should seriously consider SOAPing into another specialty and building a path where you can still thrive.
                          </p>
                          <a
                            href="/unmatched/soap"
                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Redirect to SOAP page
                            <ArrowRight className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {(deficiencyChoice === "yes" || deficiencyChoice === "unsure") && (
                    <>
                      <StepQuestion
                        eyebrow="Step 3"
                        title="What is your backup plan if you do not match Orthopaedics again?"
                        description="This is a very important question. You cannot keep doing the same thing without understanding what your alternative path would be."
                        value={backupChoice}
                        onChange={setBackupChoice}
                        choices={[
                          { label: "General Surgery", value: "gen-surg" },
                          { label: "Sports Medicine pathway", value: "sports" },
                          { label: "PM&R", value: "pmr" },
                          { label: "Emergency Medicine", value: "er" },
                          { label: "Anesthesia", value: "anesthesia" },
                          { label: "I don’t know yet", value: "unknown" },
                        ]}
                      />

                      {backupChoice === "gen-surg" && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-3xl border border-sky-200 bg-sky-50 p-6 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <Stethoscope className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">Why prelim surgery may fit here</h3>
                              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">
                                If general surgery is your true backup, that is a strong reason to consider a preliminary surgery year. It keeps you close to orthopaedics, gives you a real clinical job, and gives you time to more honestly determine whether ortho is still worth pursuing versus building a path in general surgery.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {backupChoice === "sports" && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-3xl border border-sky-200 bg-sky-50 p-6 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <Stethoscope className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">Why not SOAP in FM/IM now?</h3>
                              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">
                                Beyond the obvious benefit that you could still match ortho, it also gives you the chance to match directly into a FM or IM program that is genuinely a strong fit for your long-term goals, rather than being limited to whatever positions happen to remain available in SOAP.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {backupChoice === "pmr" && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-3xl border border-sky-200 bg-sky-50 p-6 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <Stethoscope className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">Why not SOAP in PM&R now?</h3>
                              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">
                                Beyond the obvious benefit that you could still match orthopaedics, it also gives you the chance to match directly into a PM&R program that is genuinely a strong fit for your long-term goals, rather than being limited to whatever positions happen to remain available in SOAP.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {backupChoice === "er" && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-3xl border border-sky-200 bg-sky-50 p-6 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <Stethoscope className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">Why not SOAP into ER now?</h3>
                              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">
                                Beyond the obvious benefit that you could still match orthopaedics, it also gives you the chance to match directly into a ER program that is genuinely a strong fit for your long-term goals, rather than being limited to whatever positions happen to remain available in SOAP.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {backupChoice === "anesthesia" && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-3xl border border-sky-200 bg-sky-50 p-6 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <Stethoscope className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">Why prelim surgery or TY year may be smart</h3>
                              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">
                                Anesthesiology is a competitive specialty on its own, and there are typically very few (if any) positions available through SOAP. That means you generally should not expect to pivot into anesthesia during Match week. An attainable strategy is completing a preliminary surgery or transitional year and then dual applying orthopaedics and anesthesiology the following cycle.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {backupChoice === "unknown" && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-3xl border border-sky-200 bg-sky-50 p-6 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <Stethoscope className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">Don&apos;t be pressured to SOAP into a categorical position</h3>
                              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">
                                If you do not know what your backup specialty is, that is a strong signal that you should not just be pressured to SOAP into a categorical position! You should take this year to explore your interests and find a passion outside of ortho that you would enjoy.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <StepQuestion
                        eyebrow="Step 4"
                        title="Are you graduating on schedule?"
                        description="Some schools allow students to repeat fourth year. This varies widely, and the finances and logistics can be very different. But if available, it can create meaningful flexibility."
                        value={graduateChoice}
                        onChange={setGraduateChoice}
                        choices={[
                          { label: "Yes — I am graduating on schedule", value: "yes" },
                          { label: "No — my school may allow a repeat fourth year", value: "repeat" },
                          { label: "I’m not sure", value: "unsure" },
                        ]}
                      />

                      {graduateChoice === "repeat" && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm"
                        >
                          <h3 className="text-lg font-bold text-slate-900">Why repeating fourth year can help</h3>
                          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                            <li>• You will have more flexibility to correct poorly targeted away rotations.</li>
                            <li>• Many programs only allow current medical students to rotate.</li>
                            <li>• Can rotate outside of orthopaedics and create a strong backup application.</li>
                            <li>• You will not be flagged as a graduate on applications. May help with screening.</li>
                            <li>• Biggest negative is the cost (which is variable).</li>
                          </ul>
                        </motion.div>
                      )}
                      
                      {graduateChoice === "unsure" && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm"
                        >
                          <h3 className="text-lg font-bold text-slate-900">Why you should ask about repeating fourth year</h3>
                          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                            <li>• Many programs only allow current medical students to rotate.</li>
                            <li>• You will not be flagged as a graduate on applications.</li>
                            <li>• You can improve research, and mentorship while targetting better programs.</li>
                          </ul>
                        </motion.div>
                      )}

                      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                          Final branch point
                        </p>
                        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                          SOAP to a 1-year position or pursue a research year?
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                          Answer these questions in order. The goal is not to force a perfect answer — it is to make your tradeoffs visible.
                        </p>
                      </section>

                      <div className="grid gap-8">
  <ScaleQuestion
    eyebrow="Decision Question 1"
    title="I enjoy research."
    description="This is a job and it can be helpful if you are interested in research."
    value={enjoyResearch}
    onChange={setEnjoyResearch}
    scaleLabels={{
      low: "Strongly disagree",
      high: "Strongly agree",
    }}
    answerGuide={{
  "1": {
    label: "Strongly disagree",
    explanation:
      "If you truly dislike research, spending an entire year doing it can feel long and draining. A research year is unlikely to be enjoyable or sustainable for you.",
    leans: "one-year",
  },
  "2": {
    label: "Disagree",
    explanation:
      "Research is not something you naturally enjoy. While you could complete a research year, it may feel like a chore rather than an opportunity.",
    leans: "one-year",
  },
  "3": {
    label: "Neutral",
    explanation:
      "You do not love research, but you do not dislike it either. This factor alone probably should not determine your decision.",
    leans: "neutral",
  },
  "4": {
    label: "Agree",
    explanation:
      "You generally enjoy research and may find a research year productive and rewarding.",
    leans: "research",
  },
  "5": {
    label: "Strongly agree",
    explanation:
      "You genuinely enjoy research and would likely thrive in a research-focused year.",
    leans: "research",
  },
  unknown: {
    label: "I don’t know",
    explanation:
      "If you are unsure, think about your past experiences. If research has consistently felt tedious or frustrating, a full year devoted to it may not be the best fit.",
  },
}}
  />

  <ScaleQuestion
  eyebrow="Decision Question 2"
  title="I really want to start residency this fall."
  description="Some applicants strongly prefer continuing clinical medicine rather than stepping away for a research year."
  value={startResidencyChoice}
  onChange={setStartResidencyChoice}
  scaleLabels={{
    low: "Strongly disagree",
    high: "Strongly agree",
  }}
  answerGuide={{
    "1": {
      label: "Strongly disagree",
      explanation:
        "You are comfortable delaying residency if it improves your long-term chances. Taking a research year may feel like a reasonable investment.",
      leans: "research",
    },
    "2": {
      label: "Disagree",
      explanation:
        "Starting residency immediately is not a major priority for you. A year spent strengthening your application could be worthwhile.",
      leans: "research",
    },
    "3": {
      label: "Neutral",
      explanation:
        "You could reasonably go either direction. Starting residency now or taking a research year both remain viable options.",
      leans: "neutral",
    },
    "4": {
      label: "Agree",
      explanation:
        "You are eager to continue clinical medicine and begin residency training soon. Delaying for a research year may feel frustrating.",
      leans: "one-year",
    },
    "5": {
      label: "Strongly agree",
      explanation:
        "You strongly want to start residency and practice medicine this fall. A research year would likely feel like an unwanted delay.",
      leans: "one-year",
    },
    unknown: {
      label: "I don’t know",
      explanation:
        "If you are unsure, think about how strongly you feel about stepping away from clinical medicine for a full year. If that idea feels frustrating, a 1-year clinical position may fit you better.",
    },
  }}
/>
  
  <ScaleQuestion
    eyebrow="Decision Question 3"
    title="I can afford to make less money for a year."
    description="Research positions are often paid less than residency positions."
    value={salaryChoice}
    onChange={setSalaryChoice}
    scaleLabels={{
      low: "Strongly disagree",
      high: "Strongly agree",
    }}
    answerGuide={{
      "1": {
        label: "Strongly disagree",
        explanation:
          "You have accumulated significant debt and cannot afford to take a significant pay cut for a year. The resident-level pay and benefits are very important to you. That tends to favor a 1-year clinical position over a research year.",
        leans: "one-year",
      },
      "2": {
        label: "Disagree",
        explanation:
          "Lower pay and unclear benefits would create meaningful stress for you. That still leans toward a 1-year position.",
        leans: "one-year",
      },
      "3": {
        label: "Neutral",
        explanation:
          "Money matters, but it is not a deciding factor.",
        leans: "neutral",
      },
      "4": {
        label: "Agree",
        explanation:
          "You may be able to tolerate the lower pay and unclear benefits that often come with a research year.",
        leans: "research",
      },
      "5": {
        label: "Strongly agree",
        explanation:
          "Lower pay and unclear benefits would not be a major barrier for you.",
        leans: "research",
      },
      unknown: {
        label: "I don’t know",
        explanation:
          "If you are unsure, pause and think about life after graduation. Financially, things become much more real — you are responsible for income, insurance, loans, and everyday expenses. Because research positions vary widely in pay and benefits, consider whether a lower or less predictable salary would create meaningful financial pressure for you.",
      },
    }}
  />

  <ScaleQuestion
    eyebrow="Decision Question 4"
    title="I have strong enough connections to realistically secure a research position."
    description="Research positions are getting more competitive, and it is very possible to apply and not land one."
    value={connectionsChoice}
    onChange={setConnectionsChoice}
    scaleLabels={{
      low: "Strongly disagree",
      high: "Strongly agree",
    }}
    answerGuide={{
      "1": {
        label: "Strongly disagree",
        explanation:
          "You would likely be starting from scratch, which makes the research route riskier. That leans toward a 1-year position.",
        leans: "one-year",
      },
      "2": {
        label: "Disagree",
        explanation:
          "You may not have the mentor network or institutional support to confidently land a research year. This still leans toward a 1-year position.",
        leans: "one-year",
      },
      "3": {
        label: "Neutral",
        explanation:
          "Your network may be partial or inconsistent. This is a gray zone, so mentorship access should be clarified quickly before deciding.",
        leans: "neutral",
      },
      "4": {
        label: "Agree",
        explanation:
          "You likely have mentors or connections who can help you identify and secure a research position. That favors a research year.",
        leans: "research",
      },
      "5": {
        label: "Strongly agree",
        explanation:
          "You already have strong support and a realistic pathway toward a strong research position. That is one of the clearest reasons to consider a research year.",
        leans: "research",
      },
      unknown: {
        label: "I don’t know",
        explanation:
          "If you are unsure, ask yourself: who would make calls for you this week? Who could directly connect you to a PI or program? If the answer is nobody right now, the research route may be less secure than it seems. Research fellowship positions fill fast and the application process is different than residency. Connections are very important in landing a strong position.",
      },
    }}
  />

  <ScaleQuestion
    eyebrow="Decision Question 5"
    title="I can tolerate uncertainty for longer."
    description="Research positions may come together later and with less structure than SOAP."
    value={uncertaintyChoice}
    onChange={setUncertaintyChoice}
    scaleLabels={{
      low: "Strongly disagree",
      high: "Strongly agree",
    }}
    answerGuide={{
      "1": {
        label: "Strongly disagree",
        explanation:
          "You likely need a clearer plan quickly. That strongly favors SOAPing into a 1-year position.",
        leans: "one-year",
      },
      "2": {
        label: "Disagree",
        explanation:
          "Extended uncertainty would probably be very difficult for you. That leans toward a 1-year position.",
        leans: "one-year",
      },
      "3": {
        label: "Neutral",
        explanation:
          "You may tolerate some uncertainty, but only to a point. This factor alone probably should not make the decision for you.",
        leans: "neutral",
      },
      "4": {
        label: "Agree",
        explanation:
          "You can probably handle a less rigid timeline, which makes the research path more workable.",
        leans: "research",
      },
      "5": {
        label: "Strongly agree",
        explanation:
          "You are comfortable with uncertainty and can live without immediate clarity. That supports a research year.",
        leans: "research",
      },
      unknown: {
        label: "I don’t know",
        explanation:
          "Something to consider is how important moving on to the next chapter is and dealing with uncertainty. One of the strengths of SOAPing into a 1-year position is the clear timeline. You will know where you are going on Friday with all your other classmates. You will know when you start and have a clear schedule. If not having a clear plan for weeks/months would be destabilizing, a 1-year position may be healthier.",
        leans: "neutral",
      },
    }}
  />

  <ScaleQuestion
    eyebrow="Decision Question 6"
    title="Having flexibility for visits, shadowing, and better targeting would help me a lot."
    description="A research year usually gives you more freedom. A 1-year clinical position is a real job with much less flexibility."
    value={awaysChoice}
    onChange={setAwaysChoice}
    scaleLabels={{
      low: "Strongly disagree",
      high: "Strongly agree",
    }}
    answerGuide={{
      "1": {
        label: "Strongly disagree",
        explanation:
          "Extra flexibility is probably not a major need for you. That makes a 1-year position more reasonable.",
        leans: "one-year",
      },
      "2": {
        label: "Disagree",
        explanation:
          "You may not need much additional time for shadowing, away strategy, or networking. This still leans toward a 1-year position.",
        leans: "one-year",
      },
      "3": {
        label: "Neutral",
        explanation:
          "Flexibility may help, but it may not be central to your reapplication strategy.",
        leans: "neutral",
      },
      "4": {
        label: "Agree",
        explanation:
          "More flexibility would likely help you correct prior targeting issues and build stronger visibility. That favors a research year.",
        leans: "research",
      },
      "5": {
        label: "Strongly agree",
        explanation:
          "Flexibility is a major advantage for your next cycle. That is a strong point in favor of a research year.",
        leans: "research",
      },
      unknown: {
        label: "I don’t know",
        explanation:
          "If you are unsure, ask whether poor targeting, weak visibility, or limited face time hurt you this cycle. If yes, the flexibility of a research year may matter more than you think.",
        leans: "neutral",
      },
    }}
  />
</div>

                      {(salaryChoice || connectionsChoice || uncertaintyChoice || awaysChoice) && (
                        <motion.section
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-6"
                        >
                          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.05),transparent_30%)]" />

  <div className="relative">
    <div className="flex flex-col gap-6">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
          Your Recommendation
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
          Here’s what your answers suggest
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
          This is not a perfect rule. It is meant to make the tradeoffs more obvious so you can make a clearer, more strategic decision.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div
          className={`rounded-[1.75rem] border p-6 md:p-8 shadow-sm ${
            recommendation === "strong-research" || recommendation === "lean-research"
              ? "border-sky-200 bg-sky-50"
              : recommendation === "strong-one-year" || recommendation === "lean-one-year"
              ? "border-slate-300 bg-slate-100"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Primary take
          </p>

          {recommendation === "strong-research" && (
            <>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-sky-900 md:text-4xl">
                Strong Indication for Research
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-8 text-sky-950/80">
                Your answers suggest that a research year may give you the best combination of flexibility, mentorship opportunity, and strategic upside for the next cycle.
              </p>
            </>
          )}

          {recommendation === "lean-research" && (
            <>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-sky-900 md:text-4xl">
                Lean Toward Research
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-8 text-sky-950/80">
                Your answers modestly favor a research year, though the final decision still depends on the quality of positions available to you and your comfort with uncertainty.
              </p>
            </>
          )}

          {recommendation === "lean-one-year" && (
            <>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Lean Toward SOAP for a 1-Year Position
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-700">
                Your answers suggest that the structure, income, and immediate clinical path of a 1-year position may fit you better than stepping into a research year.
              </p>
            </>
          )}

          {recommendation === "strong-one-year" && (
            <>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Strong Indication to SOAP for a 1-Year Position
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-700">
                Your answers strongly favor a 1-year clinical position. For you, immediate structure, pay, and clinical momentum may outweigh the upside of a research year.
              </p>
            </>
          )}

          {recommendation === "mixed" && (
            <>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-amber-900 md:text-4xl">
                Mixed Decision
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-8 text-amber-950/80">
                Your answers do not point strongly in one direction. This likely comes down to your tolerance for uncertainty, financial pressure, and how realistic a strong research opportunity actually is.
              </p>
            </>
          )}
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            What matters most
          </p>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
              Research positions are less structured, but can be more flexible
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
              1-year positions offer more stability, pay, and a clearer timeline
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
              Mentorship and success can be obtained through either path!
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

                          <div className="grid gap-6 xl:grid-cols-2">
  <SummaryCard
    accent="sky"
    highlighted={
      recommendation === "strong-research" ||
      recommendation === "lean-research"
    }
    title="Research Year"
    subtitle="More upside in some situations, but with more uncertainty and variability."
    pros={[
      "Can strongly address research weakness",
      "Some positions work closely with ortho residency programs",
      "Some positions have a strong track record of matching their own research fellows",
      "More flexibility to do visits and shadowing elsewhere",
      "Build strong mentorship and ortho-specific advocacy",
    ]}
    cons={[
      "Usually less money",
      "More uncertainty and rolling timelines",
      "Positions are increasingly competitive",
      "If you still do not match ortho, you may feel like you lost a year",
      "Quality and match support vary widely across programs",
    ]}
  />

  <SummaryCard
    accent="slate"
    highlighted={
      recommendation === "strong-one-year" ||
      recommendation === "lean-one-year"
    }
    title="1-Year Position"
    subtitle="More immediate stability, more pay, less flexibility."
    pros={[
      "You know your plan on Friday through the Match/SOAP timeline",
      "You get paid as a resident",
      "You build real clinical experience that will help you in any future path",
      "If ortho does not work out, you may be able to continue as a PGY2 depending on pathway",
    ]}
    cons={[
      "Higher weekly hours. You are an intern. You will be working very hard.",
      "Much less flexibility for outside visits or shadowing",
      "Mentors may be strong but less likely to be in academic orthopaeics",
      "Fewer positions with a clear track-to-match in ortho",
    ]}
  />
</div>

                          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm md:p-8">
                            <h3 className="text-2xl font-bold tracking-tight">Whatever you choose, choose strategically.</h3>
                            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                              Many excellent orthopaedic surgeons did not match the first time. What matters now is not panic. It is making a smart, honest decision this week that gives you the best chance to build a future you can still be proud of.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                              <a
                                href="/unmatched/soap"
                                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                              >
                                SOAP Guide
                                <ArrowRight className="h-4 w-4" />
                              </a>
                              <a
                                href="/pathtoortho/research-fellowship"
                                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                              >
                                Research Position Guide
                                <ArrowRight className="h-4 w-4" />
                              </a>
                              <a
                                href="/unmatched/contact"
                                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                              >
                                Talk to Alex
                                <ArrowRight className="h-4 w-4" />
                              </a>
                            </div>
                          </div>
                        </motion.section>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {reapplyChoice === "no" && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
              >
                <div className="flex items-start gap-3">
                  <Briefcase className="mt-1 h-5 w-5 shrink-0 text-slate-700" />
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                      Pivoting is not failure.
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 md:text-base">
                      If you already know you do not want to reapply orthopaedics, then your next step is not this page — it is making the best SOAP decision possible. You still have time to build a strong, meaningful career.
                    </p>
                    <a
                      href="/unmatched/soap"
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Go to SOAP Page
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </motion.section>
            )}
          </div>
        </div>
      </section>

      <section className="px-6 pb-16 md:px-10 md:pb-24">
  <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
    <div className="relative border-b border-slate-200 px-6 py-8 md:px-8 md:py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.05),transparent_28%)]" />
      
      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            Where to go next
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
            Keep moving with the right next resource
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
            Whether you are preparing to SOAP, exploring research fellowships, or just want to review the evidence behind this page, start with the section that fits where you are right now.
          </p>
        </div>
      </div>
    </div>

    <div className="grid gap-0 md:grid-cols-3">
      <a
        href="/unmatched/soap"
        className="group border-b border-slate-200 p-6 transition hover:bg-slate-50 md:border-b-0 md:border-r"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 transition group-hover:bg-slate-900 group-hover:text-white">
          <Briefcase className="h-6 w-6" />
        </div>

        <h3 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
          SOAP Guide
        </h3>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          For applicants who may pivot now, need a clear plan this week, or want help thinking through categorical and preliminary options.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          Go to SOAP guide
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </a>

  <div className="group border-b border-slate-200 p-6 transition hover:bg-sky-50/50 md:border-b-0 md:border-r">
  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 transition group-hover:bg-sky-600 group-hover:text-white">
    <Lightbulb className="h-6 w-6" />
  </div>

  <h3 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
    Research Fellowships
  </h3>

  <p className="mt-3 text-sm leading-7 text-slate-600">
    Learn what a research year looks like and where to actually find open orthopaedic research fellowship positions.
  </p>

  <div className="mt-6 flex flex-col gap-3">

    <a
      href="/pathtoortho/research-fellowship"
      className="inline-flex items-center gap-2 text-sm font-semibold text-sky-800"
    >
      SnapOrtho Research Fellowship Guide
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </a>

    <a
      href="https://www.orthogate.org/forums/medical-student-research-fellowship"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
    >
      Browse open research positions on OrthoGate
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </a>

  </div>
</div>
      <a
        href="/unmatched/references"
        className="group p-6 transition hover:bg-slate-50"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
          <GraduationCap className="h-6 w-6" />
        </div>

        <h3 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
          References
        </h3>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          Review the articles, data points, and supporting material behind the guidance on this page.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          View references
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </a>
    </div>
  </div>
</section>
    </main>
  );
}
