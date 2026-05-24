"use client";

import type {
  RotationTrackBlockItem,
} from "@/app/work/settings/settingsclient";

export type PlannerMonth = {
  key: string;
  index: number;
  monthLabel: string;
  shortLabel: string;
  rangeLabel: string;
  startDate: string;
  endDate: string;
};

export type MonthDraft = {
  monthKey: string;
  rotationId: string;
  siteLabel: string;
  teamLabel: string;
  notes: string;
};

export type HydrationResult = {
  drafts: MonthDraft[];
  warnings: string[];
};

export type BlockPayload = {
  id?: string;
  rotationId: string;
  startDate: string;
  endDate: string;
  siteLabel?: string | null;
  teamLabel?: string | null;
  notes?: string | null;
  sortOrder?: number | null;
};

export function buildAcademicMonths(academicYearStart: number): PlannerMonth[] {
  return Array.from({ length: 12 }, (_, index) => {
    const year = index < 6 ? academicYearStart : academicYearStart + 1;
    const month = (index + 6) % 12;
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 0));
    const shortMonth = start.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    });

    return {
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      index,
      monthLabel: start.toLocaleDateString("en-US", {
        month: "long",
        timeZone: "UTC",
      }),
      shortLabel: shortMonth,
      rangeLabel: `${shortMonth} ${start.getUTCDate()}–${shortMonth} ${end.getUTCDate()}`,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  });
}

export function normalizeRotationId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeDateValue(value: unknown) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!slashMatch) return "";

  const month = slashMatch[1].padStart(2, "0");
  const day = slashMatch[2].padStart(2, "0");
  const year = slashMatch[3];

  return `${year}-${month}-${day}`;
}

export function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function monthOverlapsBlock(month: PlannerMonth, block: RotationTrackBlockItem) {
  const startDate = normalizeDateValue(block.startDate);
  const endDate = normalizeDateValue(block.endDate);
  if (!startDate || !endDate) return false;
  return startDate <= month.endDate && endDate >= month.startDate;
}

function blockCoversFullMonth(month: PlannerMonth, block: RotationTrackBlockItem) {
  const startDate = normalizeDateValue(block.startDate);
  const endDate = normalizeDateValue(block.endDate);
  return startDate === month.startDate && endDate === month.endDate;
}

export function getEmptyMonthDrafts(months: PlannerMonth[]): MonthDraft[] {
  return months.map((month) => ({
    monthKey: month.key,
    rotationId: "",
    siteLabel: "",
    teamLabel: "",
    notes: "",
  }));
}

export function hydrateBlocksToMonths(
  months: PlannerMonth[],
  blocks: RotationTrackBlockItem[]
): HydrationResult {
  const drafts = getEmptyMonthDrafts(months);
  const warnings: string[] = [];

  const orderedBlocks = [...blocks].sort((a, b) => {
    const aStart = normalizeDateValue(a.startDate);
    const bStart = normalizeDateValue(b.startDate);
    if (aStart !== bStart) return aStart.localeCompare(bStart);
    const aEnd = normalizeDateValue(a.endDate);
    const bEnd = normalizeDateValue(b.endDate);
    return aEnd.localeCompare(bEnd);
  });

  for (const block of orderedBlocks) {
    let filledMonths = 0;

    for (const month of months) {
      if (!monthOverlapsBlock(month, block)) continue;

      const draft = drafts[month.index];
      draft.rotationId = normalizeRotationId(block.rotationId);
      draft.siteLabel = block.siteLabel ?? "";
      draft.teamLabel = block.teamLabel ?? "";
      draft.notes = block.notes ?? "";
      filledMonths += 1;

      if (!blockCoversFullMonth(month, block)) {
        warnings.push(
          `${month.monthLabel} contains a partial saved block (${normalizeDateValue(
            block.startDate
          )} to ${normalizeDateValue(block.endDate)}). It is shown here as a full-month assignment.`
        );
      }
    }

    if (filledMonths === 0) {
      warnings.push(
        `A saved block from ${normalizeDateValue(block.startDate)} to ${normalizeDateValue(
          block.endDate
        )} falls outside this academic year view.`
      );
    }
  }

  return {
    drafts,
    warnings: Array.from(new Set(warnings)),
  };
}

export function convertMonthsToBlocks(
  months: PlannerMonth[],
  drafts: MonthDraft[]
): BlockPayload[] {
  const payloads: BlockPayload[] = [];
  let current:
    | {
        rotationId: string;
        startDate: string;
        endDate: string;
        siteLabel: string;
        teamLabel: string;
        notes: string;
      }
    | null = null;

  for (const month of months) {
    const draft = drafts[month.index];
    const rotationId = normalizeRotationId(draft?.rotationId);

    if (!rotationId) {
      if (current) {
        payloads.push({
          rotationId: current.rotationId,
          startDate: current.startDate,
          endDate: current.endDate,
          siteLabel: current.siteLabel || null,
          teamLabel: current.teamLabel || null,
          notes: current.notes || null,
        });
        current = null;
      }
      continue;
    }

    const siteLabel = normalizeOptionalText(draft.siteLabel);
    const teamLabel = normalizeOptionalText(draft.teamLabel);
    const notes = normalizeOptionalText(draft.notes);

    if (
      current &&
      current.rotationId === rotationId &&
      current.siteLabel === siteLabel &&
      current.teamLabel === teamLabel &&
      current.notes === notes
    ) {
      current.endDate = month.endDate;
      continue;
    }

    if (current) {
      payloads.push({
        rotationId: current.rotationId,
        startDate: current.startDate,
        endDate: current.endDate,
        siteLabel: current.siteLabel || null,
        teamLabel: current.teamLabel || null,
        notes: current.notes || null,
      });
    }

    current = {
      rotationId,
      startDate: month.startDate,
      endDate: month.endDate,
      siteLabel,
      teamLabel,
      notes,
    };
  }

  if (current) {
    payloads.push({
      rotationId: current.rotationId,
      startDate: current.startDate,
      endDate: current.endDate,
      siteLabel: current.siteLabel || null,
      teamLabel: current.teamLabel || null,
      notes: current.notes || null,
    });
  }

  return payloads.map((block, index) => ({
    ...block,
    sortOrder: index,
  }));
}

export function countUnassignedMonths(drafts: MonthDraft[]) {
  return drafts.filter((draft) => !normalizeRotationId(draft.rotationId)).length;
}
