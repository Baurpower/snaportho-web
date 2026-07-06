import type { StudentWorkspaceRotation } from "@/lib/student-workspace/types";

export const SUBSPECIALTY_TRACK_IDS = [
  "trauma",
  "hand",
  "spine",
  "adult-reconstruction",
  "sports",
  "pediatrics",
  "foot-ankle",
  "shoulder-elbow",
  "tumor",
  "basic-science",
] as const;

export const FUNDAMENTALS_TRACK_IDS = [
  "or-fundamentals",
  "clinic-fundamentals",
] as const;

export type SubspecialtyTrackId = (typeof SUBSPECIALTY_TRACK_IDS)[number];
export type FundamentalsTrackId = (typeof FUNDAMENTALS_TRACK_IDS)[number];
export type CurriculumTrackFilterId =
  | SubspecialtyTrackId
  | FundamentalsTrackId;

const SERVICE_TRACK_RULES: Array<{
  trackId: CurriculumTrackFilterId;
  patterns: RegExp[];
}> = [
  { trackId: "trauma", patterns: [/trauma/i, /\bfracture/i, /\borif\b/i] },
  { trackId: "hand", patterns: [/hand/i, /wrist/i, /finger/i] },
  { trackId: "spine", patterns: [/spine/i, /spinal/i, /back/i, /neuro/i] },
  {
    trackId: "adult-reconstruction",
    patterns: [
      /arthroplasty/i,
      /reconstruction/i,
      /joint replacement/i,
      /adult recon/i,
      /total (hip|knee)/i,
    ],
  },
  { trackId: "sports", patterns: [/sports/i, /athletic/i, /acl/i, /meniscus/i] },
  {
    trackId: "pediatrics",
    patterns: [/pediatric/i, /peds/i, /children/i, /child/i],
  },
  {
    trackId: "foot-ankle",
    patterns: [/foot/i, /ankle/i, /lower extremity/i],
  },
  {
    trackId: "shoulder-elbow",
    patterns: [/shoulder/i, /elbow/i, /upper extremity/i],
  },
  {
    trackId: "tumor",
    patterns: [/tumor/i, /tumou?r/i, /oncolog/i, /sarcoma/i, /metast/i],
  },
  {
    trackId: "basic-science",
    patterns: [/basic science/i, /oite/i, /board prep/i, /biomechan/i],
  },
  {
    trackId: "or-fundamentals",
    patterns: [/or fundamentals/i, /operating room/i, /\bor\b/i, /scrub/i],
  },
  {
    trackId: "clinic-fundamentals",
    patterns: [/clinic fundamentals/i, /ambulatory/i, /outpatient/i],
  },
];

function normalizeServiceLabel(value: string): string {
  return value.trim().toLowerCase();
}

export function inferTrackIdFromService(
  service: string | null | undefined
): CurriculumTrackFilterId | null {
  const normalized = normalizeServiceLabel(service ?? "");
  if (!normalized) {
    return null;
  }

  for (const rule of SERVICE_TRACK_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.trackId;
    }
  }

  return null;
}

export function inferTrackIdFromRotation(
  rotation: StudentWorkspaceRotation | null | undefined
): CurriculumTrackFilterId | null {
  if (!rotation) {
    return null;
  }

  return (
    inferTrackIdFromService(rotation.service) ??
    inferTrackIdFromService(rotation.title)
  );
}

export function isSubspecialtyTrackId(
  trackId: string
): trackId is SubspecialtyTrackId {
  return (SUBSPECIALTY_TRACK_IDS as readonly string[]).includes(trackId);
}

export function isFundamentalsTrackId(
  trackId: string
): trackId is FundamentalsTrackId {
  return (FUNDAMENTALS_TRACK_IDS as readonly string[]).includes(trackId);
}