/**
 * Operative workflow section grouping.
 *
 * Maps section titles → display groups.
 * Used purely on the frontend — no DB schema changes.
 *
 * Legacy-safe: any section title not matched by canonicalTitles
 * or legacyAliases falls through to the UNGROUPED_ID bucket
 * ("Other") and is never destroyed.
 */

export const UNGROUPED_ID = "__other__" as const;

export type SectionGroupDef = {
  /** Stable identifier used for collapse state keys */
  id: string;
  title: string;
  description: string;
  /** Lucide icon component name */
  icon: string;
  /** Tailwind color token (used to generate bg-{color}-400/15 text-{color}-300) */
  color: string;
  /** Exact section titles that belong to this group (v2 default list) */
  canonicalTitles: readonly string[];
  /**
   * Legacy titles from v1 that should still map to this group
   * so old cards don't look broken after the rename/restructure.
   */
  legacyAliases?: readonly string[];
};

export const SECTION_GROUPS: readonly SectionGroupDef[] = [
  {
    id: "case-setup",
    title: "Case Setup",
    description: "Booking, equipment requests, vendors, and special setup needs.",
    icon: "ClipboardList",
    color: "sky",
    canonicalTitles: ["Case Setup"],
  },
  {
    id: "before-incision",
    title: "Before Incision",
    description: "Room setup, patient positioning, and prep before the incision.",
    icon: "Layers",
    color: "emerald",
    canonicalTitles: ["Room Setup & Equipment", "Patient Positioning", "Prep & Drape"],
  },
  {
    id: "operation",
    title: "Operation",
    description: "Incision through closure of the procedure.",
    icon: "Pencil",
    color: "violet",
    canonicalTitles: [
      "Incision",
      "Approach & Exposure",
      "General Steps",
      "Implants & Systems",
      "Imaging / C-Arm",
      "Suture & Closure",
    ],
    // v1 had Imaging before Incision and Key Anatomy/Trays & Instruments inline
    legacyAliases: ["Key Anatomy", "Trays & Instruments"],
  },
  {
    id: "post-op",
    title: "Post-op",
    description: "Dressings, braces, and post-operative orders/protocols.",
    icon: "HeartPulse",
    color: "teal",
    canonicalTitles: ["Dressing / Splint / Brace", "Postop Protocol / Orders"],
    // v1 name before the rename
    legacyAliases: ["Postop Protocol"],
  },
  {
    id: "attending-specific",
    title: "Attending-Specific",
    description: "Pearls, pitfalls, expectations, and notes unique to this attending.",
    icon: "Star",
    color: "amber",
    canonicalTitles: [
      "Attending Pearls",
      "Common Pitfalls",
      "Things to Never Forget",
      "Resident Role & Expectations",
      "Notes",
    ],
  },
] as const;

/** Build a lookup map: normalised title → group id */
const _titleToGroupId = new Map<string, string>();
for (const g of SECTION_GROUPS) {
  for (const t of g.canonicalTitles) {
    _titleToGroupId.set(t.trim().toLowerCase(), g.id);
  }
  for (const t of g.legacyAliases ?? []) {
    _titleToGroupId.set(t.trim().toLowerCase(), g.id);
  }
}

/** Map a section title to its group id (or UNGROUPED_ID). */
export function getGroupIdForTitle(title: string): string {
  return _titleToGroupId.get(title.trim().toLowerCase()) ?? UNGROUPED_ID;
}

/** Group definition for the "Other" bucket (legacy / unknown sections). */
export const UNGROUPED_GROUP: SectionGroupDef = {
  id: UNGROUPED_ID,
  title: "Other",
  description: "Legacy or custom sections not in the standard template.",
  icon: "FolderOpen",
  color: "slate",
  canonicalTitles: [],
};
