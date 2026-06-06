type ResidentColorToken = {
  accent: string;
  border: string;
  subtleBorder: string;
  background: string;
  mutedBackground: string;
  text: string;
  badge: string;
  badgeText: string;
  // Vivid surface used for calendar assignment cards — more saturated than mutedBackground.
  cardBackground: string;
  cardBorder: string;
};

// 20 hue-distinct colors ordered so the first 10 alternate across the wheel —
// programs with up to 10 residents get maximally distinct colors.
// cardBackground uses -200 and cardBorder uses -400 for vivid, clearly distinguishable cards.
const RESIDENT_COLOR_TOKENS: ResidentColorToken[] = [
  // 0 – Blue (H ≈ 220)
  { accent: "bg-blue-500", border: "border-blue-300", subtleBorder: "border-blue-200", background: "bg-blue-50", mutedBackground: "bg-blue-50/70", text: "text-blue-900", badge: "bg-blue-100", badgeText: "text-blue-700", cardBackground: "bg-blue-200", cardBorder: "border-blue-400" },
  // 1 – Red (H ≈ 0)
  { accent: "bg-red-500", border: "border-red-300", subtleBorder: "border-red-200", background: "bg-red-50", mutedBackground: "bg-red-50/70", text: "text-red-900", badge: "bg-red-100", badgeText: "text-red-700", cardBackground: "bg-red-200", cardBorder: "border-red-400" },
  // 2 – Emerald (H ≈ 160)
  { accent: "bg-emerald-500", border: "border-emerald-300", subtleBorder: "border-emerald-200", background: "bg-emerald-50", mutedBackground: "bg-emerald-50/70", text: "text-emerald-900", badge: "bg-emerald-100", badgeText: "text-emerald-700", cardBackground: "bg-emerald-200", cardBorder: "border-emerald-400" },
  // 3 – Amber (H ≈ 40)
  { accent: "bg-amber-500", border: "border-amber-300", subtleBorder: "border-amber-200", background: "bg-amber-50", mutedBackground: "bg-amber-50/70", text: "text-amber-900", badge: "bg-amber-100", badgeText: "text-amber-700", cardBackground: "bg-amber-200", cardBorder: "border-amber-400" },
  // 4 – Violet (H ≈ 270)
  { accent: "bg-violet-500", border: "border-violet-300", subtleBorder: "border-violet-200", background: "bg-violet-50", mutedBackground: "bg-violet-50/70", text: "text-violet-900", badge: "bg-violet-100", badgeText: "text-violet-700", cardBackground: "bg-violet-200", cardBorder: "border-violet-400" },
  // 5 – Teal (H ≈ 175)
  { accent: "bg-teal-500", border: "border-teal-300", subtleBorder: "border-teal-200", background: "bg-teal-50", mutedBackground: "bg-teal-50/70", text: "text-teal-900", badge: "bg-teal-100", badgeText: "text-teal-700", cardBackground: "bg-teal-200", cardBorder: "border-teal-400" },
  // 6 – Rose (H ≈ 350)
  { accent: "bg-rose-500", border: "border-rose-300", subtleBorder: "border-rose-200", background: "bg-rose-50", mutedBackground: "bg-rose-50/70", text: "text-rose-900", badge: "bg-rose-100", badgeText: "text-rose-700", cardBackground: "bg-rose-200", cardBorder: "border-rose-400" },
  // 7 – Indigo (H ≈ 245)
  { accent: "bg-indigo-500", border: "border-indigo-300", subtleBorder: "border-indigo-200", background: "bg-indigo-50", mutedBackground: "bg-indigo-50/70", text: "text-indigo-900", badge: "bg-indigo-100", badgeText: "text-indigo-700", cardBackground: "bg-indigo-200", cardBorder: "border-indigo-400" },
  // 8 – Orange (H ≈ 30)
  { accent: "bg-orange-500", border: "border-orange-300", subtleBorder: "border-orange-200", background: "bg-orange-50", mutedBackground: "bg-orange-50/70", text: "text-orange-900", badge: "bg-orange-100", badgeText: "text-orange-700", cardBackground: "bg-orange-200", cardBorder: "border-orange-400" },
  // 9 – Pink (H ≈ 330)
  { accent: "bg-pink-500", border: "border-pink-300", subtleBorder: "border-pink-200", background: "bg-pink-50", mutedBackground: "bg-pink-50/70", text: "text-pink-900", badge: "bg-pink-100", badgeText: "text-pink-700", cardBackground: "bg-pink-200", cardBorder: "border-pink-400" },
  // 10 – Lime (H ≈ 85)
  { accent: "bg-lime-500", border: "border-lime-300", subtleBorder: "border-lime-200", background: "bg-lime-50", mutedBackground: "bg-lime-50/70", text: "text-lime-900", badge: "bg-lime-100", badgeText: "text-lime-700", cardBackground: "bg-lime-200", cardBorder: "border-lime-400" },
  // 11 – Sky (H ≈ 200)
  { accent: "bg-sky-500", border: "border-sky-300", subtleBorder: "border-sky-200", background: "bg-sky-50", mutedBackground: "bg-sky-50/70", text: "text-sky-900", badge: "bg-sky-100", badgeText: "text-sky-700", cardBackground: "bg-sky-200", cardBorder: "border-sky-400" },
  // 12 – Fuchsia (H ≈ 290)
  { accent: "bg-fuchsia-500", border: "border-fuchsia-300", subtleBorder: "border-fuchsia-200", background: "bg-fuchsia-50", mutedBackground: "bg-fuchsia-50/70", text: "text-fuchsia-900", badge: "bg-fuchsia-100", badgeText: "text-fuchsia-700", cardBackground: "bg-fuchsia-200", cardBorder: "border-fuchsia-400" },
  // 13 – Cyan (H ≈ 185)
  { accent: "bg-cyan-500", border: "border-cyan-300", subtleBorder: "border-cyan-200", background: "bg-cyan-50", mutedBackground: "bg-cyan-50/70", text: "text-cyan-900", badge: "bg-cyan-100", badgeText: "text-cyan-700", cardBackground: "bg-cyan-200", cardBorder: "border-cyan-400" },
  // 14 – Purple (H ≈ 280)
  { accent: "bg-purple-500", border: "border-purple-300", subtleBorder: "border-purple-200", background: "bg-purple-50", mutedBackground: "bg-purple-50/70", text: "text-purple-900", badge: "bg-purple-100", badgeText: "text-purple-700", cardBackground: "bg-purple-200", cardBorder: "border-purple-400" },
  // 15 – Yellow (H ≈ 55)
  { accent: "bg-yellow-500", border: "border-yellow-300", subtleBorder: "border-yellow-200", background: "bg-yellow-50", mutedBackground: "bg-yellow-50/70", text: "text-yellow-900", badge: "bg-yellow-100", badgeText: "text-yellow-700", cardBackground: "bg-yellow-200", cardBorder: "border-yellow-400" },
  // 16 – Green (H ≈ 145)
  { accent: "bg-green-500", border: "border-green-300", subtleBorder: "border-green-200", background: "bg-green-50", mutedBackground: "bg-green-50/70", text: "text-green-900", badge: "bg-green-100", badgeText: "text-green-700", cardBackground: "bg-green-200", cardBorder: "border-green-400" },
  // 17 – Slate (cool blue-gray)
  { accent: "bg-slate-500", border: "border-slate-300", subtleBorder: "border-slate-200", background: "bg-slate-50", mutedBackground: "bg-slate-50/70", text: "text-slate-900", badge: "bg-slate-100", badgeText: "text-slate-700", cardBackground: "bg-slate-200", cardBorder: "border-slate-400" },
  // 18 – Stone (warm gray)
  { accent: "bg-stone-500", border: "border-stone-300", subtleBorder: "border-stone-200", background: "bg-stone-50", mutedBackground: "bg-stone-50/70", text: "text-stone-900", badge: "bg-stone-100", badgeText: "text-stone-700", cardBackground: "bg-stone-200", cardBorder: "border-stone-400" },
  // 19 – Zinc (neutral gray)
  { accent: "bg-zinc-500", border: "border-zinc-300", subtleBorder: "border-zinc-200", background: "bg-zinc-50", mutedBackground: "bg-zinc-50/70", text: "text-zinc-900", badge: "bg-zinc-100", badgeText: "text-zinc-700", cardBackground: "bg-zinc-200", cardBorder: "border-zinc-400" },
];

export type ResidentRotationAssignmentLike = {
  startDate?: string | null;
  start_date?: string | null;
  endDate?: string | null;
  end_date?: string | null;
  rotationName?: string | null;
  rotation_name?: string | null;
  rotationShortName?: string | null;
  rotation_short_name?: string | null;
  teamLabel?: string | null;
  team_label?: string | null;
  siteLabel?: string | null;
  site_label?: string | null;
};

function hashResidentKey(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getResidentColorToken(
  residentIdOrRosterId: string | null | undefined
) {
  if (!residentIdOrRosterId) {
    return RESIDENT_COLOR_TOKENS[0];
  }

  return RESIDENT_COLOR_TOKENS[
    hashResidentKey(residentIdOrRosterId) % RESIDENT_COLOR_TOKENS.length
  ];
}

function getAssignmentRange(assignment: ResidentRotationAssignmentLike) {
  return {
    startDate: assignment.startDate ?? assignment.start_date ?? null,
    endDate: assignment.endDate ?? assignment.end_date ?? null,
  };
}

export function getRotationDisplayLabel(
  assignment: ResidentRotationAssignmentLike | null | undefined
) {
  if (!assignment) return "No rotation listed";

  return (
    assignment.rotationShortName ??
    assignment.rotation_short_name ??
    assignment.rotationName ??
    assignment.rotation_name ??
    assignment.teamLabel ??
    assignment.team_label ??
    assignment.siteLabel ??
    assignment.site_label ??
    "No rotation listed"
  );
}

export function getRotationAssignmentForDate(
  assignments: ResidentRotationAssignmentLike[] | null | undefined,
  effectiveDate: string | null | undefined
) {
  if (!assignments?.length || !effectiveDate) return null;

  return (
    assignments.find((assignment) => {
      const { startDate, endDate } = getAssignmentRange(assignment);
      const startsOk = !startDate || startDate <= effectiveDate;
      const endsOk = !endDate || endDate >= effectiveDate;
      return startsOk && endsOk;
    }) ?? null
  );
}
