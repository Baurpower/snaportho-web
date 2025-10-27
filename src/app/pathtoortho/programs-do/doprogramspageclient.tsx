"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, Filter, ArrowUpDown, Download, RefreshCcw, Sparkles, Info } from "lucide-react";
import type React from "react";

/* ----------------------------- Local UI primitives ----------------------------- */
function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-24">{children}</div>;
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"bg-white rounded-2xl shadow-md border border-gray-200/80 hover:shadow-lg " + className}>
      {children}
    </div>
  );
}
function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={"p-6 " + className}>{children}</div>;
}
function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={"text-base font-semibold text-[#333] " + className}>{children}</h3>;
}
function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={"px-6 pb-6 " + className}>{children}</div>;
}
function Button({
  children,
  className = "",
  variant = "solid",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "outline"; size?: "sm" | "md" }) {
  const sizes = size === "sm" ? "px-3.5 py-2 text-sm rounded-xl" : "px-5 py-2.5 text-sm rounded-xl";
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
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${styles} ${className}`}>{children}</span>;
}
function Separator() {
  return <hr className="border-gray-200/80" />;
}

/* --------------------------------- Data model --------------------------------- */
type YesNo = "Yes" | "No" | "";
type Program = {
  program: string;
  city: string;
  state: string;
  residentsPerYear?: number;
  doPercentOverall?: number | null;     // % DO (entire residency)
  hasResearchFellow?: YesNo;            // Research Fellow
  doSchoolsWithin40?: number | null;    // DO med schools within 40 mi
  prefersHomeDO?: YesNo;                // Preference for "Home" DO Program(s)
  localDOShare?: number | null;         // % program from local DO school(s)
  localDOShareRaw?: string | null;      // preserve original string (e.g., '46%(21%+25%)')
};

const COLS = {
  residentsPerYear: "Residents / Year",
  doPercentOverall: "% DO (all residents)",
  hasResearchFellow: "Research Fellow",
  doSchoolsWithin40: "DO Schools within 40 mi",
  prefersHomeDO: `Prefers "Home" DO`,
  localDOShare: "% from local DO school(s)",
};

const pct = (v?: string | number | null) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const m = v.match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

/* ------------------------------- Source (37 rows) ------------------------------ */
const PROGRAMS: Program[] = [
  { program: "Jack Hughston Memorial Hospital Program", city: "Phenix City", state: "AL", residentsPerYear: 3, doPercentOverall: 60, hasResearchFellow: "No", doSchoolsWithin40: 1, prefersHomeDO: "Yes", localDOShare: pct("33%"), localDOShareRaw: "33%" },
  { program: "Valley Consortium for Medical Education Program", city: "Modesto", state: "CA", residentsPerYear: 3, doPercentOverall: 73, hasResearchFellow: "Yes", doSchoolsWithin40: 0, prefersHomeDO: "", localDOShare: null, localDOShareRaw: null },
  { program: "Riverside University Health System Program", city: "Moreno Valley", state: "CA", residentsPerYear: 4, doPercentOverall: 100, hasResearchFellow: "Yes", doSchoolsWithin40: 1, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "Community Memorial Health System Program", city: "Ventura", state: "CA", residentsPerYear: 4, doPercentOverall: 100, hasResearchFellow: "No", doSchoolsWithin40: 0, prefersHomeDO: "", localDOShare: null, localDOShareRaw: null },
  { program: "Broward Health Program", city: "Fort Lauderdale", state: "FL", residentsPerYear: 4, doPercentOverall: 94, hasResearchFellow: "No", doSchoolsWithin40: 1, prefersHomeDO: "Yes", localDOShare: pct("47%"), localDOShareRaw: "47%" },
  { program: "HCA Florida Healthcare/USF Morsani College of Medicine GME - Tampa South/Largo Hospital Program", city: "Largo", state: "FL", residentsPerYear: 2, doPercentOverall: 100, hasResearchFellow: "No", doSchoolsWithin40: 2, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "Larkin Community Hospital Program", city: "South Miami", state: "FL", residentsPerYear: 4, doPercentOverall: 50, hasResearchFellow: "Yes", doSchoolsWithin40: 1, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "Franciscan Health Olympia Fields Program", city: "Olympia Fields", state: "IL", residentsPerYear: 4, doPercentOverall: 100, hasResearchFellow: "No", doSchoolsWithin40: 2, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "Henry Ford Health/Henry Ford Macomb Hospital Program", city: "Clinton Township", state: "MI", residentsPerYear: 2, doPercentOverall: 90, hasResearchFellow: "", doSchoolsWithin40: 1, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "Corewell Health (Farmington Hills and Dearborn) Program", city: "Farmington Hills", state: "MI", residentsPerYear: 4, doPercentOverall: 100, hasResearchFellow: "", doSchoolsWithin40: 1, prefersHomeDO: "Yes", localDOShare: pct("55%"), localDOShareRaw: "55%" },
  { program: "Garden City Hospital Program", city: "Garden City", state: "MI", residentsPerYear: 2, doPercentOverall: 100, hasResearchFellow: "", doSchoolsWithin40: 1, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "Henry Ford Genesys Hospital Program", city: "Grand Blanc", state: "MI", residentsPerYear: 3, doPercentOverall: 93, hasResearchFellow: "No", doSchoolsWithin40: 1, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "McLaren Health Care / Greater Lansing / MSU Program", city: "Lansing", state: "MI", residentsPerYear: 4, doPercentOverall: 100, hasResearchFellow: "", doSchoolsWithin40: 1, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "McLaren Health Care / Oakland / MSU Program", city: "Pontiac", state: "MI", residentsPerYear: 3, doPercentOverall: 100, hasResearchFellow: "", doSchoolsWithin40: 1, prefersHomeDO: "Yes", localDOShare: pct("47%"), localDOShareRaw: "47%" },
  { program: "McLaren Health Care / Macomb / MSU Program", city: "Mt. Clemens", state: "MI", residentsPerYear: 3, doPercentOverall: 100, hasResearchFellow: "No", doSchoolsWithin40: 1, prefersHomeDO: "Yes", localDOShare: pct("33"), localDOShareRaw: "33" },
  { program: "Henry Ford Warren Hospital Program", city: "Warren", state: "MI", residentsPerYear: 2, doPercentOverall: 100, hasResearchFellow: "", doSchoolsWithin40: 1, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "University of Michigan Health-West Program", city: "Wyoming", state: "MI", residentsPerYear: 2, doPercentOverall: 100, hasResearchFellow: "No", doSchoolsWithin40: 0, prefersHomeDO: "", localDOShare: null, localDOShareRaw: null },
  { program: "Kansas City University GME Consortium (KCU-GME Consortium)/HCA Healthcare Kansas City Program", city: "Kansas City", state: "MO", residentsPerYear: 4, doPercentOverall: 100, hasResearchFellow: "", doSchoolsWithin40: 1, prefersHomeDO: "Yes", localDOShare: pct("42%"), localDOShareRaw: "42%" },
  { program: "Rutgers Health / Jersey City Medical Center Program", city: "Jersey City", state: "NJ", residentsPerYear: 3, doPercentOverall: 73, hasResearchFellow: "", doSchoolsWithin40: 1, prefersHomeDO: "Yes", localDOShare: pct("33%"), localDOShareRaw: "33%" },
  { program: "Jefferson Health New Jersey Program", city: "Stratford", state: "NJ", residentsPerYear: 5, doPercentOverall: 100, hasResearchFellow: "", doSchoolsWithin40: 2, prefersHomeDO: "Yes", localDOShare: pct("46%(21%+25%)"), localDOShareRaw: "46%(21%+25%)" },
  { program: "Inspira Health Network / Inspira Medical Center Vineland Program", city: "Vineland", state: "NJ", residentsPerYear: 3, doPercentOverall: null, hasResearchFellow: "", doSchoolsWithin40: 1, prefersHomeDO: "", localDOShare: null, localDOShareRaw: null },
  { program: "OPTI West/Valley Hospital Medical Center Program", city: "Las Vegas", state: "NV", residentsPerYear: 2, doPercentOverall: 80, hasResearchFellow: "No", doSchoolsWithin40: 1, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "Nassau University Medical Center Program", city: "East Meadow", state: "NY", residentsPerYear: 2, doPercentOverall: 80, hasResearchFellow: "", doSchoolsWithin40: 2, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "Zucker School of Medicine at Hofstra/Northwell at Huntington Hospital Program", city: "Huntington", state: "NY", residentsPerYear: 6, doPercentOverall: 57, hasResearchFellow: "Yes", doSchoolsWithin40: 2, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "OhioHealth / Doctors Hospital Program", city: "Columbus", state: "OH", residentsPerYear: 5, doPercentOverall: 100, hasResearchFellow: "", doSchoolsWithin40: 1, prefersHomeDO: "", localDOShare: null, localDOShareRaw: null },
  { program: "Western Reserve Hospital Program", city: "Cuyahoga Falls", state: "OH", residentsPerYear: 2, doPercentOverall: 100, hasResearchFellow: "", doSchoolsWithin40: 1, prefersHomeDO: "Yes", localDOShare: pct("40%"), localDOShareRaw: "40%" },
  { program: "Kettering Health Network Program", city: "Dayton", state: "OH", residentsPerYear: 4, doPercentOverall: 100, hasResearchFellow: "Yes", doSchoolsWithin40: 0, prefersHomeDO: "", localDOShare: null, localDOShareRaw: null },
  { program: "Mercy St Vincent Medical Center Program", city: "Toledo", state: "OH", residentsPerYear: 3, doPercentOverall: 100, hasResearchFellow: "", doSchoolsWithin40: 0, prefersHomeDO: "Yes", localDOShare: null, localDOShareRaw: null },
  { program: "St Elizabeth Youngstown Hospital Program", city: "Youngstown", state: "OH", residentsPerYear: 3, doPercentOverall: 100, hasResearchFellow: "", doSchoolsWithin40: 0, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "Cleveland Clinic Foundation/South Pointe Hospital Program", city: "Warrensville Heights", state: "OH", residentsPerYear: 3, doPercentOverall: 100, hasResearchFellow: "", doSchoolsWithin40: 1, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "Oklahoma State University Center for Health Sciences Program", city: "Tulsa", state: "OK", residentsPerYear: 3, doPercentOverall: 87, hasResearchFellow: "", doSchoolsWithin40: 1, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "Samaritan Health Services - Corvallis Program", city: "Corvallis", state: "OR", residentsPerYear: 3, doPercentOverall: 67, hasResearchFellow: "No", doSchoolsWithin40: 1, prefersHomeDO: "No", localDOShare: null, localDOShareRaw: null },
  { program: "UPMC Medical Education (Harrisburg) Program", city: "Harrisburg", state: "PA", residentsPerYear: 5, doPercentOverall: 100, hasResearchFellow: "No", doSchoolsWithin40: 0, prefersHomeDO: "", localDOShare: null, localDOShareRaw: null },
  { program: "Philadelphia College of Osteopathic Medicine Program", city: "Philadelphia", state: "PA", residentsPerYear: 4, doPercentOverall: 100, hasResearchFellow: "", doSchoolsWithin40: 1, prefersHomeDO: "Yes", localDOShare: pct("50%"), localDOShareRaw: "50%" },
  { program: "Wellspan Health/York Hospital Program", city: "York", state: "PA", residentsPerYear: 3, doPercentOverall: 100, hasResearchFellow: "No", doSchoolsWithin40: 0, prefersHomeDO: "", localDOShare: null, localDOShareRaw: null },
  { program: "East Tennessee State University/Quillen College of Medicine Program", city: "Johnson City", state: "TN", residentsPerYear: 3, doPercentOverall: 67, hasResearchFellow: "", doSchoolsWithin40: 0, prefersHomeDO: "", localDOShare: null, localDOShareRaw: null },
];

/* ------------------------------- Utilities ------------------------------------ */
type SortKey = keyof Program | "programCityState";
type SortDir = "asc" | "desc";
type Sortable = string | number | YesNo | null | undefined;
const keyVal = (p: Program, k: SortKey): Sortable =>
  k === "programCityState"
    ? `${p.program} ${p.city} ${p.state}`
    : p[k as keyof Program];

function sortRows(rows: Program[], key: SortKey, dir: SortDir) {
  const m = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = keyVal(a, key);
    const bv = keyVal(b, key);
    const na = typeof av === "number" ? av : Number.NaN;
    const nb = typeof bv === "number" ? bv : Number.NaN;
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return (na - nb) * m;
    return String(av ?? "").localeCompare(String(bv ?? ""), undefined, { sensitivity: "base" }) * m;
  });
}
const uniq = <T,>(xs: T[]) => Array.from(new Set(xs));

function toCSV(rows: Program[]) {
  const header = [
    "Program",
    "City",
    "State",
    COLS.residentsPerYear,
    COLS.doPercentOverall,
    COLS.hasResearchFellow,
    COLS.doSchoolsWithin40,
    COLS.prefersHomeDO,
    COLS.localDOShare,
  ];
  const lines = rows.map((r) => [
    r.program,
    r.city,
    r.state,
    r.residentsPerYear ?? "",
    r.doPercentOverall ?? "",
    r.hasResearchFellow ?? "",
    r.doSchoolsWithin40 ?? "",
    r.prefersHomeDO ?? "",
    r.localDOShareRaw ?? (r.localDOShare !== null ? `${r.localDOShare}%` : ""),
  ]);
  return [header, ...lines]
    .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

/* ----------------------------------- Page ------------------------------------- */
export default function DoProgramsPage() {
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [minResidents, setMinResidents] = useState(0);
  const [excludeResearchFellow, setExcludeResearchFellow] = useState(false);
  const [minDOOverall, setMinDOOverall] = useState(0);
  const [excludeHomePref, setExcludeHomePref] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("programCityState");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // hydrate from URL
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ(p.get("q") ?? "");
    setStateFilter(p.get("state") ?? "All");
    setMinResidents(Number(p.get("minRes") ?? 0));
    setExcludeResearchFellow(p.get("xr") === "1");
    setMinDOOverall(Number(p.get("minDO") ?? 0));
    setExcludeHomePref(p.get("xh") === "1");
    setSortKey((p.get("sortKey") as SortKey) ?? "programCityState");
    setSortDir((p.get("sortDir") as SortDir) ?? "asc");
  }, []);

  // sync to URL
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (stateFilter !== "All") p.set("state", stateFilter);
    if (minResidents > 0) p.set("minRes", String(minResidents));
    if (excludeResearchFellow) p.set("xr", "1");;
    if (minDOOverall > 0) p.set("minDO", String(minDOOverall));
    if (excludeHomePref) p.set("xh", "1");
    if (sortKey !== "programCityState") p.set("sortKey", sortKey);
    if (sortDir !== "asc") p.set("sortDir", sortDir);
    const s = p.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  }, [q, stateFilter, minResidents, excludeResearchFellow, minDOOverall, excludeHomePref, sortKey, sortDir]);

  const states = useMemo(() => ["All", ...uniq(PROGRAMS.map((r) => r.state)).sort()], []);
  const maxRes = useMemo(() => Math.max(...PROGRAMS.map((r) => r.residentsPerYear ?? 0)), []);
  const filtered = useMemo(() => {
  const qlc = q.trim().toLowerCase();
  const base = PROGRAMS.filter((r) => {
    const matchesQ =
      !qlc ||
      r.program.toLowerCase().includes(qlc) ||
      r.city.toLowerCase().includes(qlc) ||
      r.state.toLowerCase().includes(qlc);

    const matchesState = stateFilter === "All" || r.state === stateFilter;
    const matchesRes = (r.residentsPerYear ?? 0) >= minResidents;
    const matchesRF = !excludeResearchFellow || r.hasResearchFellow !== "Yes";
    const matchesDOOverall =
      (r.doPercentOverall ?? -1) >= (minDOOverall || 0) ||
      (r.doPercentOverall == null && minDOOverall === 0);
    const matchesHome = !excludeHomePref || r.prefersHomeDO !== "Yes";

    return (
      matchesQ &&
      matchesState &&
      matchesRes &&
      matchesRF &&
      matchesDOOverall &&
      matchesHome
    );
  });
  return sortRows(base, sortKey, sortDir);
}, [q, stateFilter, minResidents, excludeResearchFellow, minDOOverall, excludeHomePref, sortKey, sortDir]);

  const exportCSV = () => {
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "programs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (k: SortKey) => (sortKey === k ? setSortDir((d) => (d === "asc" ? "desc" : "asc")) : (setSortKey(k), setSortDir("asc")));

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-[#1f2937]">
      {/* Glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute left-1/2 top-[-10%] h-[60vh] w-[80vw] -translate-x-1/2 rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgba(89,116,152,0.15),transparent_60%)] blur-2xl"
        />
      </div>

    {/* Header */}
<header className="sticky top-0 z-40 border-b border-gray-200/70 bg-[#f9f7f4]/80 backdrop-blur supports-[backdrop-filter]:backdrop-saturate-150">
  <Container>
    <div className="flex h-14 sm:h-16 items-center justify-between">
      <div className="flex items-center gap-2 text-[#444]">
        <Sparkles className="h-5 w-5 text-[#597498]" />
        <span className="text-sm font-medium tracking-tight">SnapOrtho · Program Database</span>
      </div>
      <nav className="hidden sm:flex items-center gap-2">
        <Link
          href="/away-rotations"
          className="rounded-lg px-3 py-2 text-sm text-[#444] hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200"
        >
          Away Rotations
        </Link>
        <a
          href="#filters"
          className="rounded-lg px-3 py-2 text-sm text-[#444] hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200"
        >
          Filters
        </a>
        <a
          href="#table"
          className="rounded-lg px-3 py-2 text-sm text-[#444] hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200"
        >
          Programs
        </a>
      </nav>
    </div>
  </Container>
</header>

{/* Hero */}
<section className="py-10 sm:py-14">
  <Container>
    <div className="grid gap-6 lg:gap-10 lg:grid-cols-12 lg:items-start">
      {/* Title + blurb */}
      <div className="lg:col-span-7">
        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#2f2f2f] leading-tight"
        >
          <span className="block text-[#597498]">Historically DO</span>
          Orthopaedic Programs
        </motion.h1>

        <p className="mt-4 max-w-prose text-[15px] leading-7 text-gray-600">
          <p>
                This database compiles programs that were <strong>formerly AOA-accredited</strong> and
                are now fully <strong>ACGME-accredited</strong>.
              </p>
        </p>
      </div>

      {/* Background callout */}
      <div className="lg:col-span-5">
        <div className="relative">
          <Card className="bg-white/95 ring-1 ring-gray-100 shadow-md overflow-hidden">
            {/* left accent bar */}
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[#597498]/80" aria-hidden />
            <CardHeader className="pb-2 pl-8">
              <CardTitle className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#597498]/10">
                  <Info className="h-4 w-4 text-[#597498]" />
                </span>
                Background
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-8 pr-6 pb-6 text-[14px] text-gray-700 space-y-3 leading-6">
              <p>
                Unfortunately, there is still <strong>DO bias</strong> in orthopaedic surgery. Former AOA sites have higher DO representation and are more DO-friendly.<p>
                Data current for the <strong>2026 ERAS application cycle</strong>.
              </p>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </Container>
</section>


      <Separator />

      {/* Filters */}
      <section id="filters" className="py-10">
        <Container>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-[#597498]" />
                Filters & Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Search */}
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-gray-600">Search (program / city / state)</span>
                  <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5">
                    <Search className="h-4 w-4 text-gray-400" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g., Jersey, Toledo, MI" className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400" />
                  </div>
                </label>

                {/* State */}
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-gray-600">State</span>
                  <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm">
                    {states.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Residents min */}
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-gray-600">
                    Min {COLS.residentsPerYear} <Badge className="ml-1">{minResidents}</Badge>
                  </span>
                  <input type="range" min={0} max={maxRes} value={minResidents} onChange={(e) => setMinResidents(Number(e.target.value))} />
                </label>

                {/* %DO overall min */}
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-gray-600">
                    Min {COLS.doPercentOverall} <Badge className="ml-1">{minDOOverall}%</Badge>
                  </span>
                  <input type="range" min={0} max={100} value={minDOOverall} onChange={(e) => setMinDOOverall(Number(e.target.value))} />
                </label>

                {/* Research fellow toggle */}
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={excludeResearchFellow} onChange={(e) => setExcludeResearchFellow(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                        Exclude programs with a Research Fellow
                </label>

                {/* Prefers Home DO toggle */}
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={excludeHomePref} onChange={(e) => setExcludeHomePref(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                    Exclude Home Preference
                </label>
                
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setQ("");
                    setStateFilter("All");
                    setMinResidents(0);
                    setExcludeResearchFellow(false);
                    setMinDOOverall(0);
                    setExcludeHomePref(false);
                    setSortKey("programCityState");
                    setSortDir("asc");
                  }}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset
                </Button>
                <Button onClick={exportCSV}>
                  <Download className="h-4 w-4" />
                  Export CSV ({filtered.length})
                </Button>
                <Badge variant="primary" className="ml-auto">
                  {PROGRAMS.length} programs total
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Container>
      </section>

      <Separator />

      {/* Table */}
      <section id="table" className="py-10">
        <Container>
          <div className="mb-4">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">Results</div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">Programs ({filtered.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-700">
                  {[
                    { key: "programCityState" as SortKey, label: "Program" },
                    { key: "state" as SortKey, label: "State" },
                    { key: "residentsPerYear" as SortKey, label: COLS.residentsPerYear },
                    { key: "doPercentOverall" as SortKey, label: COLS.doPercentOverall },
                    { key: "hasResearchFellow" as SortKey, label: COLS.hasResearchFellow },
                    { key: "doSchoolsWithin40" as SortKey, label: COLS.doSchoolsWithin40 },
                    { key: "prefersHomeDO" as SortKey, label: COLS.prefersHomeDO },
                    { key: "localDOShare" as SortKey, label: COLS.localDOShare },
                  ].map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                      <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 text-[#444]" title="Sort">
                        {c.label}
                        <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={`${r.program}-${i}`} className="border-b border-gray-100 hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="max-w-[32rem]">
                        <div className="font-medium text-[#333]">{r.program}</div>
                        <div className="text-xs text-gray-500">
                          {r.city}, {r.state}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{r.state}</td>
                    <td className="px-4 py-3">{r.residentsPerYear ?? "-"}</td>
                    <td className="px-4 py-3">{r.doPercentOverall != null ? `${r.doPercentOverall}%` : "-"}</td>
                    <td className="px-4 py-3">
                      {r.hasResearchFellow ? (
                        <Badge variant={r.hasResearchFellow === "Yes" ? "primary" : "secondary"}>{r.hasResearchFellow}</Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">{r.doSchoolsWithin40 ?? "-"}</td>
                    <td className="px-4 py-3">
                      {r.prefersHomeDO ? (
                        <Badge variant={r.prefersHomeDO === "Yes" ? "primary" : "secondary"}>{r.prefersHomeDO}</Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">{r.localDOShareRaw ?? (r.localDOShare != null ? `${r.localDOShare}%` : "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <Card className="mt-6">
              <CardContent className="py-8 text-center text-sm text-gray-600">No programs match your filters. Try widening your search.</CardContent>
            </Card>
          )}
        </Container>
      </section>

      <footer className="border-t border-gray-200/80 bg-[#f9f7f4] py-10">
        <Container>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="inline-flex items-center gap-2 text-[#597498] font-medium text-sm tracking-wide uppercase">
              <Sparkles className="h-4 w-4" />
              Built for quick decisions
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="max-w-3xl text-gray-700 text-sm sm:text-base leading-relaxed">Share filtered links. CSV export mirrors your current view.</p>
          </div>
        </Container>
      </footer>
    </main>
  );
}
