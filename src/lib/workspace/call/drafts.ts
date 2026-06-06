import type { DraftDayAssignment, QuickAssignSlotMode } from "@/components/workspace/call/programcalltypes";

export const PROGRAM_CALL_DRAFT_SCHEMA_VERSION = 2;

export type ProgramCallScheduleDraftPayload = {
  month: string;
  assignments: Record<string, DraftDayAssignment>;
  scheduleSlotMode: "Primary" | "Both";
  quickAssignSlotMode: QuickAssignSlotMode;
  quickAssignResidentId: string | null;
};

export type ProgramCallScheduleDraftRecord = {
  id: string;
  monthStart: string;
  schemaVersion: number;
  updatedAt: string;
  publishedScheduleUpdatedAt: string | null;
  payload: ProgramCallScheduleDraftPayload;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isDraftDayAssignment(value: unknown): value is DraftDayAssignment {
  if (!isRecord(value)) return false;

  // v2 field names
  const primaryOk = isStringOrNull(value.primaryRosterId);
  const backupOk = isStringOrNull(value.backupRosterId);
  const buddyOk = value.buddyRosterId === undefined || isStringOrNull(value.buddyRosterId);

  // Also accept v1 field names so the normalizer can migrate them
  const v1PrimaryOk = isStringOrNull(value.primaryMembershipId);
  const v1BackupOk = isStringOrNull(value.backupMembershipId);

  return (primaryOk && backupOk && buddyOk) || (v1PrimaryOk && v1BackupOk);
}

export function normalizeDraftAssignments(
  assignments: Record<string, unknown>
): Record<string, DraftDayAssignment> {
  const normalized: Record<string, DraftDayAssignment> = {};

  for (const [dateKey, value] of Object.entries(assignments)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    if (!isDraftDayAssignment(value)) continue;

    const raw = value as Record<string, unknown>;

    // Prefer v2 field names; fall back to v1 names for old drafts being migrated
    const primaryRosterId = isStringOrNull(raw.primaryRosterId)
      ? (raw.primaryRosterId as string | null)
      : isStringOrNull(raw.primaryMembershipId)
      ? (raw.primaryMembershipId as string | null)
      : null;

    const backupRosterId = isStringOrNull(raw.backupRosterId)
      ? (raw.backupRosterId as string | null)
      : isStringOrNull(raw.backupMembershipId)
      ? (raw.backupMembershipId as string | null)
      : null;

    const buddyRosterId = isStringOrNull(raw.buddyRosterId)
      ? (raw.buddyRosterId as string | null)
      : null;

    if (!primaryRosterId && !backupRosterId && !buddyRosterId) continue;

    normalized[dateKey] = {
      primaryRosterId,
      backupRosterId,
      buddyRosterId,
    };
  }

  return normalized;
}

export function normalizeProgramCallScheduleDraftPayload(
  value: unknown
): ProgramCallScheduleDraftPayload | null {
  if (!isRecord(value)) return null;

  const month = value.month;
  const assignments = value.assignments;
  const scheduleSlotMode = value.scheduleSlotMode;
  const quickAssignSlotMode = value.quickAssignSlotMode;
  const quickAssignResidentId = value.quickAssignResidentId;

  if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  if (!isRecord(assignments)) {
    return null;
  }

  if (scheduleSlotMode !== "Primary" && scheduleSlotMode !== "Both") {
    return null;
  }

  if (
    quickAssignSlotMode !== "Primary" &&
    quickAssignSlotMode !== "Backup" &&
    quickAssignSlotMode !== "Buddy" &&
    quickAssignSlotMode !== "Both"
  ) {
    return null;
  }

  if (quickAssignResidentId !== null && typeof quickAssignResidentId !== "string") {
    return null;
  }

  return {
    month,
    assignments: normalizeDraftAssignments(assignments as Record<string, unknown>),
    scheduleSlotMode,
    quickAssignSlotMode,
    quickAssignResidentId,
  };
}

export function areDraftAssignmentsEqual(
  left: Record<string, DraftDayAssignment>,
  right: Record<string, DraftDayAssignment>
) {
  const leftNormalized = normalizeDraftAssignments(left as Record<string, unknown>);
  const rightNormalized = normalizeDraftAssignments(right as Record<string, unknown>);

  const leftKeys = Object.keys(leftNormalized).sort();
  const rightKeys = Object.keys(rightNormalized).sort();

  if (leftKeys.length !== rightKeys.length) return false;

  for (let index = 0; index < leftKeys.length; index += 1) {
    const key = leftKeys[index];
    if (key !== rightKeys[index]) return false;

    const leftValue = leftNormalized[key];
    const rightValue = rightNormalized[key];

    if (
      leftValue.primaryRosterId !== rightValue.primaryRosterId ||
      leftValue.backupRosterId !== rightValue.backupRosterId ||
      leftValue.buddyRosterId !== rightValue.buddyRosterId
    ) {
      return false;
    }
  }

  return true;
}

export function areProgramCallDraftPayloadsEqual(
  left: ProgramCallScheduleDraftPayload,
  right: ProgramCallScheduleDraftPayload
) {
  return (
    left.month === right.month &&
    left.scheduleSlotMode === right.scheduleSlotMode &&
    left.quickAssignSlotMode === right.quickAssignSlotMode &&
    left.quickAssignResidentId === right.quickAssignResidentId &&
    areDraftAssignmentsEqual(left.assignments, right.assignments)
  );
}
