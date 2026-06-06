export type ResidentColorClasses = {
  bg: string;
  border: string;
  text: string;
  badge: string;
  badgeText: string;
  background: string;
  mutedBackground: string;
  subtleBorder: string;
  cardBackground: string;
  cardBorder: string;
};

type ResidentColorIdentity = {
  rosterId?: string | null;
  residentId?: string | null;
  membershipId?: string | null;
};

const RESIDENT_COLOR_PALETTE: ResidentColorClasses[] = [
  { bg: "bg-blue-200", border: "border-blue-500", text: "text-blue-900", badge: "bg-blue-300", badgeText: "text-blue-900", background: "bg-blue-200", mutedBackground: "bg-blue-200", subtleBorder: "border-blue-500", cardBackground: "bg-blue-200", cardBorder: "border-blue-500" },
  { bg: "bg-orange-200", border: "border-orange-500", text: "text-orange-900", badge: "bg-orange-300", badgeText: "text-orange-900", background: "bg-orange-200", mutedBackground: "bg-orange-200", subtleBorder: "border-orange-500", cardBackground: "bg-orange-200", cardBorder: "border-orange-500" },
  { bg: "bg-green-200", border: "border-green-600", text: "text-green-900", badge: "bg-green-300", badgeText: "text-green-900", background: "bg-green-200", mutedBackground: "bg-green-200", subtleBorder: "border-green-600", cardBackground: "bg-green-200", cardBorder: "border-green-600" },
  { bg: "bg-red-200", border: "border-red-500", text: "text-red-900", badge: "bg-red-300", badgeText: "text-red-900", background: "bg-red-200", mutedBackground: "bg-red-200", subtleBorder: "border-red-500", cardBackground: "bg-red-200", cardBorder: "border-red-500" },
  { bg: "bg-purple-200", border: "border-purple-500", text: "text-purple-900", badge: "bg-purple-300", badgeText: "text-purple-900", background: "bg-purple-200", mutedBackground: "bg-purple-200", subtleBorder: "border-purple-500", cardBackground: "bg-purple-200", cardBorder: "border-purple-500" },
  { bg: "bg-yellow-200", border: "border-yellow-500", text: "text-yellow-900", badge: "bg-yellow-300", badgeText: "text-yellow-900", background: "bg-yellow-200", mutedBackground: "bg-yellow-200", subtleBorder: "border-yellow-500", cardBackground: "bg-yellow-200", cardBorder: "border-yellow-500" },
  { bg: "bg-teal-200", border: "border-teal-500", text: "text-teal-900", badge: "bg-teal-300", badgeText: "text-teal-900", background: "bg-teal-200", mutedBackground: "bg-teal-200", subtleBorder: "border-teal-500", cardBackground: "bg-teal-200", cardBorder: "border-teal-500" },
  { bg: "bg-pink-200", border: "border-pink-500", text: "text-pink-900", badge: "bg-pink-300", badgeText: "text-pink-900", background: "bg-pink-200", mutedBackground: "bg-pink-200", subtleBorder: "border-pink-500", cardBackground: "bg-pink-200", cardBorder: "border-pink-500" },
  { bg: "bg-stone-300", border: "border-stone-600", text: "text-stone-900", badge: "bg-stone-400", badgeText: "text-stone-900", background: "bg-stone-300", mutedBackground: "bg-stone-300", subtleBorder: "border-stone-600", cardBackground: "bg-stone-300", cardBorder: "border-stone-600" },
  { bg: "bg-lime-200", border: "border-lime-600", text: "text-lime-900", badge: "bg-lime-300", badgeText: "text-lime-900", background: "bg-lime-200", mutedBackground: "bg-lime-200", subtleBorder: "border-lime-600", cardBackground: "bg-lime-200", cardBorder: "border-lime-600" },
  { bg: "bg-indigo-200", border: "border-indigo-500", text: "text-indigo-900", badge: "bg-indigo-300", badgeText: "text-indigo-900", background: "bg-indigo-200", mutedBackground: "bg-indigo-200", subtleBorder: "border-indigo-500", cardBackground: "bg-indigo-200", cardBorder: "border-indigo-500" },
  { bg: "bg-cyan-200", border: "border-cyan-500", text: "text-cyan-900", badge: "bg-cyan-300", badgeText: "text-cyan-900", background: "bg-cyan-200", mutedBackground: "bg-cyan-200", subtleBorder: "border-cyan-500", cardBackground: "bg-cyan-200", cardBorder: "border-cyan-500" },
  { bg: "bg-violet-200", border: "border-violet-500", text: "text-violet-900", badge: "bg-violet-300", badgeText: "text-violet-900", background: "bg-violet-200", mutedBackground: "bg-violet-200", subtleBorder: "border-violet-500", cardBackground: "bg-violet-200", cardBorder: "border-violet-500" },
  { bg: "bg-amber-200", border: "border-amber-600", text: "text-amber-900", badge: "bg-amber-300", badgeText: "text-amber-900", background: "bg-amber-200", mutedBackground: "bg-amber-200", subtleBorder: "border-amber-600", cardBackground: "bg-amber-200", cardBorder: "border-amber-600" },
  { bg: "bg-emerald-200", border: "border-emerald-600", text: "text-emerald-900", badge: "bg-emerald-300", badgeText: "text-emerald-900", background: "bg-emerald-200", mutedBackground: "bg-emerald-200", subtleBorder: "border-emerald-600", cardBackground: "bg-emerald-200", cardBorder: "border-emerald-600" },
  { bg: "bg-rose-200", border: "border-rose-500", text: "text-rose-900", badge: "bg-rose-300", badgeText: "text-rose-900", background: "bg-rose-200", mutedBackground: "bg-rose-200", subtleBorder: "border-rose-500", cardBackground: "bg-rose-200", cardBorder: "border-rose-500" },
  { bg: "bg-fuchsia-200", border: "border-fuchsia-500", text: "text-fuchsia-900", badge: "bg-fuchsia-300", badgeText: "text-fuchsia-900", background: "bg-fuchsia-200", mutedBackground: "bg-fuchsia-200", subtleBorder: "border-fuchsia-500", cardBackground: "bg-fuchsia-200", cardBorder: "border-fuchsia-500" },
  { bg: "bg-sky-200", border: "border-sky-500", text: "text-sky-900", badge: "bg-sky-300", badgeText: "text-sky-900", background: "bg-sky-200", mutedBackground: "bg-sky-200", subtleBorder: "border-sky-500", cardBackground: "bg-sky-200", cardBorder: "border-sky-500" },
  { bg: "bg-slate-200", border: "border-slate-500", text: "text-slate-900", badge: "bg-slate-300", badgeText: "text-slate-900", background: "bg-slate-200", mutedBackground: "bg-slate-200", subtleBorder: "border-slate-500", cardBackground: "bg-slate-200", cardBorder: "border-slate-500" },
  { bg: "bg-zinc-300", border: "border-zinc-600", text: "text-zinc-900", badge: "bg-zinc-400", badgeText: "text-zinc-900", background: "bg-zinc-300", mutedBackground: "bg-zinc-300", subtleBorder: "border-zinc-600", cardBackground: "bg-zinc-300", cardBorder: "border-zinc-600" },
  { bg: "bg-blue-300", border: "border-blue-600", text: "text-blue-950", badge: "bg-blue-400", badgeText: "text-blue-950", background: "bg-blue-300", mutedBackground: "bg-blue-300", subtleBorder: "border-blue-600", cardBackground: "bg-blue-300", cardBorder: "border-blue-600" },
  { bg: "bg-orange-300", border: "border-orange-600", text: "text-orange-950", badge: "bg-orange-400", badgeText: "text-orange-950", background: "bg-orange-300", mutedBackground: "bg-orange-300", subtleBorder: "border-orange-600", cardBackground: "bg-orange-300", cardBorder: "border-orange-600" },
  { bg: "bg-green-300", border: "border-green-700", text: "text-green-950", badge: "bg-green-400", badgeText: "text-green-950", background: "bg-green-300", mutedBackground: "bg-green-300", subtleBorder: "border-green-700", cardBackground: "bg-green-300", cardBorder: "border-green-700" },
  { bg: "bg-red-300", border: "border-red-600", text: "text-red-950", badge: "bg-red-400", badgeText: "text-red-950", background: "bg-red-300", mutedBackground: "bg-red-300", subtleBorder: "border-red-600", cardBackground: "bg-red-300", cardBorder: "border-red-600" },
];

function hashResidentColorKey(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getResidentColorKey(
  resident: ResidentColorIdentity | string | null | undefined
) {
  if (!resident) return null;
  if (typeof resident === "string") return resident;

  return resident.rosterId ?? resident.residentId ?? resident.membershipId ?? null;
}

export function getResidentColorClasses(
  resident: ResidentColorIdentity | string | null | undefined
) {
  const stableKey = getResidentColorKey(resident);
  if (!stableKey) return RESIDENT_COLOR_PALETTE[0];

  return RESIDENT_COLOR_PALETTE[
    hashResidentColorKey(stableKey) % RESIDENT_COLOR_PALETTE.length
  ];
}
