import type { AcademicCalendarPermissionLevel } from "./permissions";

export class AssignmentsListAccessError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AssignmentsListAccessError";
    this.status = status;
  }
}

export function normalizeRequiredProgramId(
  programId: string | null | undefined
): string | null {
  if (!programId) return null;
  const trimmed = programId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveAssignmentsListPermissionLevel(
  mineOnly: boolean
): AcademicCalendarPermissionLevel {
  return mineOnly ? "view" : "edit";
}

export function buildAssignmentsProgramFilter(programId: string) {
  return {
    eventProgramId: programId,
  };
}

export function buildSwapRosterQueryFilters(params: {
  programId: string;
  rosterId: string;
  direction: "incoming" | "outgoing";
}) {
  if (!params.programId.trim() || !params.rosterId.trim()) {
    throw new Error("programId and rosterId are required for swap roster queries.");
  }

  return {
    program_id: params.programId.trim(),
    roster_column:
      params.direction === "incoming"
        ? "recipient_roster_id"
        : "requester_roster_id",
    roster_id: params.rosterId.trim(),
  };
}

export function swapRowsMatchProgramScope<T extends { program_id: string }>(
  rows: T[],
  programId: string
) {
  return rows.every((row) => row.program_id === programId);
}