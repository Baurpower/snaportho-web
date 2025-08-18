"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  MapPin,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Stars,
} from "lucide-react";

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
function CardHeader({ children, className = "" }: any) {
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
function CardContent({ children, className = "" }: any) {
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

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }
) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={
        "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm " +
        "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#597498] " +
        "focus:border-transparent " +
        className
      }
    />
  );
}

function Checkbox({
  checked,
  onChange,
  className = "",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={
        "mt-0.5 grid h-5 w-5 place-items-center rounded-md border " +
        (checked
          ? "border-[#597498] bg-[#597498] text-white"
          : "border-gray-300 bg-white text-transparent") +
        " " +
        className
      }
      aria-pressed={checked}
    >
      <CheckCircle2 className="h-4 w-4" />
    </button>
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
                (active
                  ? "bg-[#597498] text-white"
                  : "text-[#444] hover:bg-gray-50")
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
// --- ERAS cycle year (adjust each cycle) ---
const ERAS_YEAR = 2025;

const MONTH_IDX: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, sept: 8, october: 9, november: 10, december: 11,
};

function parseHumanDate(input: string): Date | null {
  const s = input.trim().toLowerCase();

  // e.g. "Sept 3, 2025" / "September 24, 2025" / "Aug 1, 2025"
  const full = /^([a-z]+)\s+(\d{1,2}),\s*(\d{4})$/i.exec(input);
  if (full) {
    const [, mon, dayStr, yrStr] = full;
    const m = MONTH_IDX[mon.toLowerCase()];
    if (m == null) return null;
    const d = Number(dayStr);
    const y = Number(yrStr);
    return new Date(y, m, d, 9, 0, 0);
  }

  // e.g. "Early June" / "Mid June" / "Late June"
  const approx = /^(early|mid|late)\s+([a-z]+)$/i.exec(input);
  if (approx) {
    const [, when, mon] = approx;
    const m = MONTH_IDX[mon.toLowerCase()];
    if (m == null) return null;
    const day = when.toLowerCase() === "early" ? 5 : when.toLowerCase() === "mid" ? 15 : 25;
    return new Date(ERAS_YEAR, m, day, 9, 0, 0);
  }

  // Fallback: single "Month Year" → use mid-month
  const monthYear = /^([a-z]+)\s+(\d{4})$/i.exec(input);
  if (monthYear) {
    const [, mon, yrStr] = monthYear;
    const m = MONTH_IDX[mon.toLowerCase()];
    if (m == null) return null;
    const y = Number(yrStr);
    return new Date(y, m, 15, 9, 0, 0);
  }

  return null;
}

function getNextTimelineItem<T extends { date: string; label: string }>(
  items: T[],
  now = new Date()
): (T & { when: Date }) | null {
  const withDates = items
    .map((it) => ({ ...it, when: parseHumanDate(it.date) }))
    .filter((it): it is T & { when: Date } => it.when instanceof Date);

  const upcoming = withDates.filter((it) => it.when.getTime() >= now.getTime());
  if (upcoming.length) {
    upcoming.sort((a, b) => a.when.getTime() - b.when.getTime());
    return upcoming[0];
  }
  // If all have passed, return the last one (or null)
  if (withDates.length) {
    withDates.sort((a, b) => a.when.getTime() - b.when.getTime());
    return withDates[withDates.length - 1];
  }
  return null;
}

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);


const TIMELINE = [
  { date: "Early June", label: "Get one-time access code & register with MyERAS" },
  { date: "June 4, 2025", label: "ERAS season opens (9:00 AM ET)" },
  { date: "Aug 1, 2025", label: "Request LORs (eSLOR + personal). Forego right to read." },
  { date: "Sept 3, 2025", label: "Can submit ERAS application" },
  { date: "Sept 24, 2025", label: "Programs begin reviewing (9:00 AM ET)" },
];

const ERAS_SECTIONS = [
  {
    title: "Meaningful Experiences",
    icon: <Stars className="h-5 w-5" />,
    points: [
      "10 entries (≤ 750 chars) + 3 Most Meaningful (+300 each).",
      "Select entries that complement PS/LORs; mix ortho + non-ortho.",
      "Draft early because you may get busy with aways.",
    ],
  },
  {
    title: "Personal Statement",
    icon: <NotebookPen className="h-5 w-5" />,
    points: [
      "Use multiple reviewers (ortho mentor + non-ortho reader).",
      "Share PS + CV with letter writers early.",
    ],
  },
  {
    title: "MSPE & Transcripts",
    icon: <FileText className="h-5 w-5" />,
    points: [
      "Review MSPE (June/July) to align content.",
      "USMLE transcript: transmit via ERAS.",
      "School uploads medical transcript.",
    ],
  },
  {
    title: "Letters of Recommendation",
    icon: <ShieldCheck className="h-5 w-5" />,
    points: [
      "Request by Aug 1 → arrival by Sept 1; follow up kindly.",
      "Use eSLOR when supported; traditional LORs OK.",
    ],
  },
  {
    title: "Program Selection & Signaling",
    icon: <MapPin className="h-5 w-5" />,
    points: [
      "Be strategic—signal ~30 strong-fit programs.",
      "Reserve a few for reaches with real ties.",
    ],
  },
  {
    title: "Headshot",
    icon: <GraduationCap className="h-5 w-5" />,
    points: [
      "Professional headshot (school photo day works)."
    ],
  },
];

const COSTING = [
  { label: "Apply to 30 signaled programs", est: "~$500" },
  { label: "Each additional application after 30", est: "~$25 ea" },
];

const CHECKLIST_DEFAULTS = [
  "Register in MyERAS (get code from school)",
  "Draft 10 experiences + 3 Most Meaningful",
  "Personal Statement v1 → peer/mentor review",
  "Meet MSPE writer (June/July)",
  "Request LORs by Aug 1 (eSLOR when possible)",
  "Upload headshot",
  "Transfer CV (education, awards, research, etc.)",
  "USMLE transcript + school transcript",
  "Program signaling set (~30) + target list",
  "Final Review",
  "Final Submission",
];

const SELECTION_MD = [
  "Target programs at/above your historical metric range.",
  "Confirm case mix aligns with goals; check logs + resident pages.",
  "Prioritize mentorship pipelines + research support.",
  "Use signals for fit/geography; avoid over-dilution on long shots.",
  "Choose aways that complement strengths; secure home + away LORs.",
];

const SELECTION_DO = [
  "Swallow your pride and understand there is bias. It is not you. It is the system.",
  "Try not to compare yourself with MD students.",
  "Start with previous AOA accredition programs (DO).",
  "Scan rosters for DO representation; favor DO-inclusive programs.",
  "Understand that culture matters more than metrics for many DO programs.",
  "Be aware that some programs are very small.",
  "Some residencies have strong connections with certain DO schools.",
  "Some programs only interview rotators."
];

// ---------- Page ----------
export default function ERASPage() {
  const [items, setItems] = useState(
    CHECKLIST_DEFAULTS.map((text, i) => ({ id: i + 1, text, done: false }))
  );
  const [newItem, setNewItem] = useState("");
  const [tab, setTab] = useState<"md" | "do">("md");

  const progress = useMemo(() => {
    const done = items.filter((i) => i.done).length;
    return Math.round((done / items.length) * 100) || 0;
  }, [items]);

  // ✅ ADDED: compute the next upcoming timeline item
  const nextItem = useMemo(() => getNextTimelineItem(TIMELINE), []);

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        text: newItem.trim(),
        done: false,
      },
    ]);
    setNewItem("");
  };

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
              <span className="text-sm font-medium tracking-tight">
                SnapOrtho · ERAS
              </span>
            </div>
            <nav className="hidden gap-6 text-sm sm:flex">
              <a className="hover:underline" href="#timeline">Timeline</a>
              <a className="hover:underline" href="#application">Application</a>
              <a className="hover:underline" href="#selection">Residency Selection</a>
              <a className="hover:underline" href="#checklist">Checklist</a>
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
                Guide to <span className="text-[#597498]">ERAS</span> Ortho Applications{" "}.
              </motion.h1>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Your orthopaedic residency application hub—dates, requirements,
                signaling, MSPE/LORs, and a built-in checklist.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="sm" className="gap-2">
                  <a href="#checklist" className="inline-flex items-center gap-2">
                    Complete checklist <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button size="sm" variant="outline">
                  <a href="#selection">Program selection</a>
                </Button>
              </div>
            </div>

            <Card className="bg-white/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-[#597498]" />
                  ERAS Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Checklist completion</span>
                    <span className="tabular-nums font-medium text-[#333]">
                      {progress}%
                    </span>
                  </div>
                  <Progress value={progress} />
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
  <div className="rounded-xl border border-gray-200 p-3">
    <div className="font-medium text-[#333]">Next Date</div>
    {nextItem ? (
      <>
        <div className="mt-1">{fmtDate(nextItem.when)}</div>
        <div className="mt-0.5">{nextItem.label}</div>
      </>
    ) : (
      <div className="mt-1 text-gray-500">No upcoming dates</div>
    )}
  </div>
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
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
              Timeline
            </div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
              Key ERAS Dates
            </h2>
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
                    <Badge variant="secondary" className="shrink-0">
                      {t.date}
                    </Badge>
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

      {/* Application */}
      <section id="application" className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
              Application
            </div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
              Build a compelling ERAS application
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            {ERAS_SECTIONS.map((sec, i) => (
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
                  <span className="font-medium text-[#333]">Signaling strategy:</span>{" "}
                  Focus your 30 signals on programs where you have fit and genuine
                  interest; consider a few reaches if you have a clear connection.
                </p>
                <p>Keep your story consistent across PS, experiences, and LORs.</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Separator />

      {/* Residency Selection (Tabs) */}
      <section id="selection" className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
              MD / DO Toggle
            </div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
              Residency selection guidance
            </h2>
          </div>

          <div className="w-full">
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as "md" | "do")}
              options={[
                { value: "md", label: "MD-focused advice" },
                { value: "do", label: "DO-focused advice" },
              ]}
            />

            <div className="mt-6 grid gap-3 text-sm text-gray-600">
              {(tab === "md" ? SELECTION_MD : SELECTION_DO).map((s, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
                  {s}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cost snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                {COSTING.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3"
                  >
                    <span className="max-w-[60%]">{c.label}</span>
                    <span className="font-medium text-[#333]">{c.est}</span>
                  </div>
                ))}
                <p className="text-xs">
                  Keep a buffer for transcript fees and photo services; travel/interview
                  costs live on a separate page.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick filters to build a smart list</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>• Resident roster mix (MD/DO), case volume, fellowship matches.</p>
                <p>• Geography & support systems; night float vs q4 call; trauma level.</p>
                <p>• Research infrastructure and mentorship stability.</p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      <Separator />

      {/* Checklist */}
      <section id="checklist" className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
              Action Center
            </div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
              Your ERAS checklist
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <Card className="sm:col-span-2">
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add a custom task (e.g., Verify transcript transmission)"
                    value={newItem}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewItem(e.target.value)
                    }
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                      e.key === "Enter" && addItem()
                    }
                  />
                  <Button onClick={addItem}>Add</Button>
                </div>

                <ul className="space-y-3">
                  {items.map((it) => (
                    <li key={it.id} className="flex items-start gap-3">
                      <Checkbox
                        checked={it.done}
                        onChange={(v: boolean) =>
                          setItems((prev) =>
                            prev.map((p) =>
                              p.id === it.id ? { ...p, done: v } : p
                            )
                          )
                        }
                      />
                      <div
                        className={
                          "text-sm " +
                          (it.done ? "text-gray-500 line-through" : "text-[#1f2937]")
                        }
                      >
                        {it.text}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Completion</span>
                    <span className="tabular-nums font-medium text-[#333]">
                      {progress}%
                    </span>
                  </div>
                  <Progress value={progress} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Helpful notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>• Align PS, experiences, and LORs around 3–4 themes.</p>
                <p>• Double-check dates, authorship order, and conference names.</p>
                <p>• Ask letter writers early.</p>
                <p>• Spend time curating a very good list. Not too competitive and not too safe.</p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      <footer className="border-t border-gray-200/80 bg-[#f9f7f4] py-10">
  <Container>
    <div className="flex flex-col items-center text-center gap-4">
      <div className="inline-flex items-center gap-2 text-[#597498] font-medium text-sm tracking-wide uppercase">
        <Sparkles className="h-4 w-4" />
        Crafted with experience from both sides of the match
        <Sparkles className="h-4 w-4" />
      </div>
      <p className="max-w-3xl text-gray-700 text-sm sm:text-base leading-relaxed">
        Built by{" "}
        <span className="font-semibold text-[#444]">Alexander Baur DO</span>{" "}
        (Ortho applicant),{" "}
        <span className="font-semibold text-[#444]">Brandon Gettleman MD</span>{" "}
        (Ortho resident · UCLA), and{" "}
        <span className="font-semibold text-[#444]">Austin Nguyen MD</span>{" "}
        (Ortho resident · Houston Methodist).
      </p>
      <p className="text-sm text-gray-500">Wishing you the best of luck on your journey! 🎓</p>
    </div>
  </Container>
</footer>
    </main>
  );
}
