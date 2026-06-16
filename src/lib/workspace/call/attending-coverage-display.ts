import type {
  ProgramAttendingCoverageSlot,
  ProgramCallAttendingAssignment,
} from "@/lib/workspace/call/types";
import {
  getAttendingDisplayName,
  getAttendingLastName,
  getAttendingShortName,
} from "@/lib/workspace/call/attendings-shared";

export type AttendingCoverageChip = {
  key: string;
  label: string;
  title: string;
  color: string | null;
  status: "assigned" | "overflow";
};

export type DayAttendingCoverageSummary = {
  date: string;
  assignments: ProgramCallAttendingAssignment[];
  missingSlots: ProgramAttendingCoverageSlot[];
  chips: AttendingCoverageChip[];
  title: string;
  isComplete: boolean;
};

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getSlotLabel(assignment: ProgramCallAttendingAssignment) {
  return assignment.slotName ?? assignment.slotAbbreviation ?? "Coverage";
}

export function buildAttendingCoverageSummaryByDate(params: {
  assignments: ProgramCallAttendingAssignment[];
  slots: ProgramAttendingCoverageSlot[];
  monthStart: string;
  monthEnd: string;
}): Map<string, DayAttendingCoverageSummary> {
  const { assignments, slots, monthStart, monthEnd } = params;
  const activeSlots = [...slots].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
  const slotIndex = new Map(activeSlots.map((slot, index) => [slot.id, index]));
  const assignmentsByDate = new Map<string, ProgramCallAttendingAssignment[]>();
  const attendingIdsByLastName = new Map<string, Set<string>>();

  for (const assignment of assignments) {
    const existing = assignmentsByDate.get(assignment.coverageDate) ?? [];
    existing.push(assignment);
    assignmentsByDate.set(assignment.coverageDate, existing);

    const lastName = getAttendingLastName(assignment).toLowerCase();
    if (lastName) {
      const ids = attendingIdsByLastName.get(lastName) ?? new Set<string>();
      ids.add(assignment.attendingId);
      attendingIdsByLastName.set(lastName, ids);
    }
  }

  for (const [date, list] of assignmentsByDate.entries()) {
    list.sort((a, b) => {
      const aSlot = a.slotId ? slotIndex.get(a.slotId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      const bSlot = b.slotId ? slotIndex.get(b.slotId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      if (aSlot !== bSlot) return aSlot - bSlot;
      return getAttendingDisplayName(a).localeCompare(getAttendingDisplayName(b));
    });
    assignmentsByDate.set(date, list);
  }

  const summaries = new Map<string, DayAttendingCoverageSummary>();

  if (activeSlots.length === 0) {
    return summaries;
  }

  const start = new Date(`${monthStart}T00:00:00.000Z`);
  const end = new Date(`${monthEnd}T00:00:00.000Z`);

  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const date = toDateKey(cursor);
    const dayAssignments = assignmentsByDate.get(date) ?? [];
    const assignedSlotIds = new Set(
      dayAssignments.map((assignment) => assignment.slotId).filter(Boolean)
    );
    const missingSlots = activeSlots.filter((slot) => !assignedSlotIds.has(slot.id));
    summaries.set(
      date,
      createSummary(
        date,
        dayAssignments,
        missingSlots,
        activeSlots,
        attendingIdsByLastName
      )
    );
  }

  return summaries;
}

function createSummary(
  date: string,
  assignments: ProgramCallAttendingAssignment[],
  missingSlots: ProgramAttendingCoverageSlot[],
  activeSlots: ProgramAttendingCoverageSlot[],
  attendingIdsByLastName: Map<string, Set<string>>
): DayAttendingCoverageSummary {
  const assignedChips: AttendingCoverageChip[] = assignments.map((assignment) => {
    const displayName = getAttendingDisplayName(assignment);
    const slotLabel = getSlotLabel(assignment);
    const lastNameKey = getAttendingLastName(assignment).toLowerCase();
    const hasSameLastNameConflict =
      lastNameKey.length > 0 &&
      (attendingIdsByLastName.get(lastNameKey)?.size ?? 0) > 1;

    return {
      key: assignment.id,
      label: getAttendingShortName(assignment, {
        disambiguate: hasSameLastNameConflict,
      }),
      title: `${slotLabel} — ${displayName}`,
      color: assignment.slotColor ?? null,
      status: "assigned",
    };
  });

  const detailLines = [
    ...assignments.map((assignment) => {
      const displayName = getAttendingDisplayName(assignment);
      return `${getSlotLabel(assignment)} — ${displayName}`;
    }),
  ];

  return {
    date,
    assignments,
    missingSlots,
    chips: assignedChips,
    title: detailLines.join("\n"),
    isComplete: activeSlots.length > 0 && missingSlots.length === 0,
  };
}
