"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  Check,
  GripVertical,
  PencilLine,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type { ProgramCallItem } from "./callmonthcalendar";
import type { ProgramCallSlotDefinition } from "@/lib/workspace/call/rule-definitions";
import {
  DEFAULT_SLOT_DEFINITIONS,
} from "@/lib/workspace/call/rule-definitions";
import type { ProgramRule } from "@/components/workspace/call/programcalltypes";
import {
  buildBuddyDateStateByDate,
  buildBulkPublishRowsFromSlotMap,
  buildCallHubValidationInput,
  formatPublishValidationError,
  getCallHubVisibleSlotDefinitions,
  getDropValidationMessage,
  getEligibleResidentsForSlotPicker,
  getTouchedDatesFromPendingChanges,
  slotMapToCallDraftAssignments,
  slotMapToDraftDayAssignments,
  type CallHubResident,
  type CallHubRotationAssignment,
  type CallHubTimeOffItem,
  type CallHubValidationContext,
} from "@/lib/workspace/call/call-hub-scheduling";
import type { DraftDayAssignment } from "@/components/workspace/call/programcalltypes";
import {
  type CallValidationIssue,
  type CallValidationResult,
  deserializeSlotId,
  isEditableQuickCall,
  normalizeCallType,
  serializeSlotId,
  validateCallMonthDraft,
} from "@/lib/workspace/call/validation";
import {
  getResidentValidationDisplay,
  getSlotValidationGuidance,
  getSlotValidationDisplay,
  getValidationBadgeText,
  getValidationSummary,
  getValidationSeverityClass,
  getValidationTooltip,
  getWorstValidationSeverity,
} from "@/lib/workspace/call/validation-display";
import { getCallMutationValidation } from "@/lib/workspace/call/mutation-error";
import {
  getResidentColorClasses,
  type ResidentColorClasses,
} from "@/lib/workspace/call/resident-colors";
import type {
  AttendingCoverageChip,
  DayAttendingCoverageSummary,
} from "@/lib/workspace/call/attending-coverage-display";

type ResidentOption = {
  rosterId: string;
  programMembershipId: string | null;
  residentName: string;
  trainingLevel: string | null;
  /** Explicit PGY year from the API. Used for conditional buddy-slot visibility. */
  pgyYear?: number | null;
  gradYear?: number | null;
  currentRotationLabel?: string | null;
};

/**
 * Parses "PGY-1", "PGY1", "pgy2" etc. from a trainingLevel string.
 * Fallback when pgyYear is not explicitly set on the resident or call.
 */
function parsePgyFromTrainingLevel(trainingLevel: string | null | undefined): number | null {
  if (!trainingLevel) return null;
  const match = trainingLevel.match(/pgy-?(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/** Formats a Date as a short relative string: "just now", "2 min ago", "3h ago". */
function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 90) return "1 min ago";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Converts the current slotMap to a DraftDayAssignment record keyed by YYYY-MM-DD.
 * Used to persist draft state to the backend draft API after each mutation.
 */
function slotMapToDraftAssignments(
  slotMap: Map<string, ProgramCallItem | null>
): Record<string, DraftDayAssignment> {
  const result: Record<string, DraftDayAssignment> = {};
  for (const [slotId, call] of slotMap.entries()) {
    if (!call?.callDate) continue;
    const { dateKey, callType } = deserializeSlotId(slotId);
    const rosterId = call.rosterId ?? call.membershipId ?? null;
    if (!rosterId) continue;
    if (!result[dateKey]) {
      result[dateKey] = { primaryRosterId: null, backupRosterId: null, buddyRosterId: null };
    }
    const ct = callType.toLowerCase();
    if (ct === "primary") result[dateKey].primaryRosterId = rosterId;
    else if (ct === "backup") result[dateKey].backupRosterId = rosterId;
    else if (ct === "buddy") result[dateKey].buddyRosterId = rosterId;
  }
  return result;
}

/**
 * Reconstructs slotMap and pendingChanges from a previously saved DraftDayAssignment
 * record. Compares against the initialSlotMap (published schedule) to determine
 * what kind of change each restored slot represents (create / replace / delete).
 */
function reconstructFromDraft(
  draftAssignments: Record<string, DraftDayAssignment>,
  initialSlotMap: Map<string, ProgramCallItem | null>,
  residentLookup: Map<string, ResidentOption>
): {
  slotMap: Map<string, ProgramCallItem | null>;
  pendingChanges: PendingChange[];
} {
  const nextSlotMap = new Map(initialSlotMap);
  const nextPendingChanges: PendingChange[] = [];
  let changeCount = 0;

  for (const [dateKey, draftDay] of Object.entries(draftAssignments)) {
    const slots: Array<{ callType: string; rosterId: string | null }> = [
      { callType: "Primary", rosterId: draftDay.primaryRosterId },
      { callType: "Backup", rosterId: draftDay.backupRosterId },
      { callType: "Buddy", rosterId: draftDay.buddyRosterId },
    ];

    for (const { callType, rosterId } of slots) {
      const slotId = serializeSlotId({ dateKey, callType });
      const publishedCall = initialSlotMap.get(slotId) ?? null;
      const publishedRosterId = publishedCall
        ? (publishedCall.rosterId ?? publishedCall.membershipId ?? null)
        : null;

      if (rosterId === publishedRosterId) continue; // no change from published

      if (rosterId && publishedCall) {
        // Draft has a different resident than published → restore as replace
        const resident = residentLookup.get(rosterId);
        if (!resident) continue;
        const nextCall = createOptimisticCall(resident, { dateKey, callType });
        nextSlotMap.set(slotId, nextCall);
        nextPendingChanges.push({
          id: `restore-${++changeCount}`,
          kind: "replace",
          slotId,
          callId: publishedCall.id,
          fromRosterId: publishedRosterId,
          resident,
        });
      } else if (rosterId && !publishedCall) {
        // Draft adds a resident where published is empty → restore as create
        const resident = residentLookup.get(rosterId);
        if (!resident) continue;
        const nextCall = createOptimisticCall(resident, { dateKey, callType });
        nextSlotMap.set(slotId, nextCall);
        nextPendingChanges.push({
          id: `restore-${++changeCount}`,
          kind: "create",
          slotId,
          slot: { dateKey, callType },
          resident,
          tempCallId: nextCall.id,
        });
      } else if (!rosterId && publishedCall) {
        // Draft removes a resident that published has → restore as delete
        nextSlotMap.set(slotId, null);
        nextPendingChanges.push({
          id: `restore-${++changeCount}`,
          kind: "delete",
          slotId,
          callId: publishedCall.id,
        });
      }
    }
  }

  return { slotMap: nextSlotMap, pendingChanges: nextPendingChanges };
}

function toCallHubResidents(residents: ResidentOption[]): CallHubResident[] {
  return residents.map((resident) => ({
    rosterId: resident.rosterId,
    programMembershipId: resident.programMembershipId,
    residentName: resident.residentName,
    trainingLevel: resident.trainingLevel,
    pgyYear: resident.pgyYear ?? null,
    gradYear: resident.gradYear ?? null,
  }));
}

export type ProgramCallSlot = {
  key: string;
  label: string;
  color?: string;
  shortLabel?: string;
};

type ActiveSlotAction =
  | {
      type: "replace";
      call: ProgramCallItem;
    }
  | {
      type: "create";
      dateKey: string;
      callType: string;
    }
  | null;

type CallSlotId = {
  dateKey: string;
  callType: string;
};

type DragCallData = {
  kind: "assignment";
  call: ProgramCallItem;
  sourceSlotId: string;
  sourceSlot: CallSlotId;
  residentId: string | null;
};

type DragResidentData = {
  kind: "pool-resident";
  resident: ResidentOption;
};

type SlotDroppableData = {
  kind: "slot";
  slotId: string;
  slot: CallSlotId;
  call: ProgramCallItem | null;
  dateKey: string;
  callType: string;
  canDrop: boolean;
  inMonth: boolean;
};

type SlotRenderItem = {
  slot: ProgramCallSlot;
  slotId: string;
  call: ProgramCallItem | null;
  inMonth: boolean;
  isToday: boolean;
};

type PendingChange =
  | {
      id: string;
      kind: "create";
      slotId: string;
      slot: CallSlotId;
      resident: ResidentOption;
      tempCallId: string;
    }
  | {
      id: string;
      kind: "replace";
      slotId: string;
      callId: string;
      fromRosterId: string | null;
      resident: ResidentOption;
    }
  | {
      id: string;
      kind: "move";
      sourceSlotId: string;
      targetSlotId: string;
      sourceCallId: string;
      resident: ResidentOption;
    }
  | {
      id: string;
      kind: "swap";
      firstSlotId: string;
      secondSlotId: string;
      firstCallId: string;
      secondCallId: string;
    }
  | {
      id: string;
      kind: "delete";
      slotId: string;
      callId: string;
    };

function ReadOnlyAttendingCoverageChips({
  summary,
}: {
  summary: DayAttendingCoverageSummary | null;
}) {
  if (!summary || summary.chips.length === 0) return null;

  const visibleChips =
    summary.chips.length <= 2
      ? summary.chips
      : [
          summary.chips[0],
          {
            key: `${summary.date}-overflow`,
            label: `+${summary.chips.length - 1}`,
            title: summary.title,
            color: null,
            status: "overflow" as const,
          },
        ];

  return (
    <div
      className="flex min-w-0 flex-1 flex-wrap justify-end gap-0.5"
      title={summary.title}
      aria-label={`Attending coverage: ${summary.title || "None"}`}
    >
      {visibleChips.map((chip) => (
        <ReadOnlyAttendingCoverageChip key={chip.key} chip={chip} />
      ))}
    </div>
  );
}

function ReadOnlyAttendingCoverageChip({
  chip,
}: {
  chip: AttendingCoverageChip;
}) {
  return (
    <span
      className="inline-flex max-w-[78px] items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 px-1 py-0.5 text-[8px] font-bold leading-none text-slate-700"
      title={chip.title}
    >
      {chip.color && chip.status === "assigned" ? (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: chip.color }}
        />
      ) : null}
      <span className="truncate">{chip.label}</span>
    </span>
  );
}


function buildPoolResidentDndId(rosterId: string) {
  return `pool-resident:${rosterId}`;
}

function buildAssignmentDndId(slotId: string) {
  return `assignment:${slotId}`;
}

function buildSlotDndId(slotId: string) {
  return `slot:${slotId}`;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeekSunday(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1);
}

function endOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0);
}

function buildCalendarWeeksSunday(year: number, monthIndex: number) {
  const monthStart = startOfMonth(year, monthIndex);
  const monthEnd = endOfMonth(year, monthIndex);

  const gridStart = startOfWeekSunday(monthStart);
  const gridEnd = addDays(startOfWeekSunday(monthEnd), 6);

  const weeks: Date[][] = [];
  let cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function isSameMonth(date: Date, year: number, monthIndex: number) {
  return date.getFullYear() === year && date.getMonth() === monthIndex;
}


function formatShortDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}




/**
 * Returns the short role label shown in the slot badge.
 * Legacy "Weekday" / "Weekend" call types map to "Primary".
 */
function getSlotRoleLabel(callType: string | null | undefined): string {
  const lower = normalizeCallType(callType).toLowerCase();
  if (lower === "primary" || lower === "weekday" || lower === "weekend") return "Primary";
  if (lower === "backup") return "Backup";
  if (lower === "buddy") return "Bud";
  // Custom slot types: cap at 6 chars
  const raw = (callType ?? "").trim();
  return raw.slice(0, 6) || "Slot";
}

/** Tailwind badge classes keyed by call type. */
function getRoleBadgeClass(callType: string | null | undefined): string {
  const lower = normalizeCallType(callType).toLowerCase();
  if (lower === "primary" || lower === "weekday" || lower === "weekend") {
    return "bg-amber-100 text-amber-700";
  }
  if (lower === "backup") return "bg-sky-100 text-sky-700";
  if (lower === "buddy") return "bg-violet-100 text-violet-700";
  return "bg-slate-100 text-slate-600";
}

function normalizeSlotKey(value: string | null | undefined) {
  return normalizeCallType(value).toLowerCase();
}

/** Derive slot list from existing calls (legacy fallback when no slotDefinitions provided). */
function getDefaultCallSlots(calls: ProgramCallItem[]) {
  const hasBackup = calls.some((call) => normalizeSlotKey(call.callType) === "backup");
  const hasBuddy = calls.some((call) => normalizeSlotKey(call.callType) === "buddy");

  return [
    { key: "Primary", label: "Primary", color: "amber" },
    ...(hasBuddy ? [{ key: "Buddy", label: "Buddy", color: "violet" }] : []),
    ...(hasBackup ? [{ key: "Backup", label: "Backup", color: "sky" }] : []),
  ];
}

/** Convert slot definitions to ProgramCallSlot[] (ALL slots, for building the global slotMap). */
function slotDefsToCallSlots(defs: ProgramCallSlotDefinition[]): ProgramCallSlot[] {
  return defs.map((def) => ({
    key: def.callType,
    label: def.label,
    color: def.colorKey,
    shortLabel: def.shortLabel,
  }));
}

function buildSlotMap(
  weeks: Date[][],
  slots: ProgramCallSlot[],
  calls: ProgramCallItem[]
) {
  const map = new Map<string, ProgramCallItem | null>();

  for (const week of weeks) {
    for (const date of week) {
      const dateKey = toDateKey(date);
      for (const slot of slots) {
        map.set(
          serializeSlotId({
            dateKey,
            callType: slot.key,
          }),
          null
        );
      }
    }
  }

  for (const call of calls) {
    if (!call.callDate) continue;

    const matchingSlot =
      slots.find(
        (slot) => normalizeSlotKey(slot.key) === normalizeSlotKey(call.callType)
      ) ?? slots[0];

    if (!matchingSlot) continue;

    map.set(
      serializeSlotId({
        dateKey: call.callDate,
        callType: matchingSlot.key,
      }),
      call
    );
  }

  return map;
}

function createOptimisticCall(
  resident: ResidentOption,
  slot: CallSlotId,
  existingCall?: ProgramCallItem | null
): ProgramCallItem {
  return {
    id:
      existingCall?.id ??
      `temp-${slot.dateKey}-${normalizeSlotKey(slot.callType)}-${resident.rosterId}`,
    rosterId: resident.rosterId,
    programMembershipId: resident.programMembershipId,
    membershipId: resident.rosterId,
    residentName: resident.residentName,
    trainingLevel: resident.trainingLevel,
    // Propagate pgyYear so slotItemsByDate can evaluate conditional buddy visibility
    // immediately after drag, before the change is saved to the database.
    pgyYear: resident.pgyYear ?? parsePgyFromTrainingLevel(resident.trainingLevel) ?? undefined,
    classYear: existingCall?.classYear ?? null,
    userId: existingCall?.userId ?? null,
    callType: normalizeCallType(slot.callType),
    callDate: slot.dateKey,
    startDatetime: existingCall?.startDatetime ?? null,
    endDatetime: existingCall?.endDatetime ?? null,
    site: existingCall?.site ?? null,
    isHomeCall: existingCall?.isHomeCall ?? false,
    notes: existingCall?.notes ?? null,
    isMine: existingCall?.isMine ?? false,
  };
}

function getResidentCountMap(slotMap: Map<string, ProgramCallItem | null>) {
  const counts = new Map<string, number>();

  for (const call of slotMap.values()) {
    const residentKey = call?.rosterId ?? call?.membershipId;
    if (!residentKey) continue;
    counts.set(residentKey, (counts.get(residentKey) ?? 0) + 1);
  }

  return counts;
}

function getAssignmentEditState(params: {
  call: ProgramCallItem | null | undefined;
  inMonth: boolean;
  canEdit: boolean;
  working: boolean;
  deleteMode: boolean;
}) {
  const { call, inMonth, canEdit, working, deleteMode } = params;
  const hasAssignment = Boolean(call);
  const hasCallDate = Boolean(call?.callDate);
  const isPast =
    typeof call?.callDate === "string"
      ? call.callDate < toDateKey(new Date())
      : false;
  const legacyQuickEditEligible = call ? isEditableQuickCall(call) : false;

  const disabledReason =
    !canEdit
      ? "cannot-edit"
      : !inMonth
      ? "outside-month"
      : deleteMode
      ? "delete-mode"
      : working
      ? "saving"
      : !hasAssignment
      ? "no-assignment"
      : !hasCallDate
      ? "missing-call-date"
      : null;

  return {
    disabledReason,
    isDragDisabled: disabledReason !== null,
    hasAssignment,
    hasCallDate,
    isPast,
    legacyQuickEditEligible,
  };
}

function DraggableCallCard({
  call,
  slotId,
  onClick,
  disabled,
  color,
}: {
  call: ProgramCallItem;
  slotId: string;
  onClick: () => void;
  disabled: boolean;
  color: ResidentColorClasses;
}) {
  const sourceSlot = deserializeSlotId(slotId);
  const residentId = call.rosterId ?? call.membershipId ?? null;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: buildAssignmentDndId(slotId),
      data: {
        kind: "assignment",
        call,
        sourceSlotId: slotId,
        sourceSlot,
        residentId,
      } satisfies DragCallData,
      disabled,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    touchAction: "none" as const,
    WebkitUserSelect: "none" as const,
    userSelect: "none" as const,
  };
  const dragProps = disabled
    ? {}
    : {
        ...attributes,
        ...listeners,
      };

  const roleLabel = getSlotRoleLabel(call.callType);
  const roleBadgeClass = getRoleBadgeClass(call.callType);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      ref={setNodeRef}
      style={style}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      {...dragProps}
      className={[
        "flex h-full w-full min-h-0 max-w-full select-none flex-col justify-center overflow-hidden rounded-md border px-1.5 py-0.5 text-left transition",
        `${color.bg} ${color.border}`,
        disabled
          ? "cursor-default opacity-70"
          : "cursor-grab active:cursor-grabbing hover:brightness-95",
        isDragging ? "opacity-40 shadow-lg" : "",
      ].join(" ")}
    >
      {/* Name row — resident name takes priority, role badge sits to the right */}
      <div className="flex min-w-0 items-center gap-1">
        <p className={`min-w-0 flex-1 truncate text-[11px] font-semibold leading-none ${color.text}`}>
          {call.residentName?.trim() || "Unknown"}
        </p>
        <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold leading-none ${roleBadgeClass}`}>
          {roleLabel}
        </span>
      </div>

      {/* Secondary row: training level — hidden at smaller breakpoints to preserve space */}
      {call.trainingLevel ? (
        <p className="mt-0.5 hidden truncate text-[9px] leading-none text-slate-400 xl:block">
          {call.trainingLevel}
        </p>
      ) : null}
    </div>
  );
}

function DraggableResidentCard({
  resident,
  count,
  validationIssues,
  disabled,
  color,
}: {
  resident: ResidentOption;
  count: number;
  validationIssues: CallValidationIssue[];
  disabled: boolean;
  color: ResidentColorClasses;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: buildPoolResidentDndId(resident.rosterId),
      data: {
        kind: "pool-resident",
        resident,
      } satisfies DragResidentData,
      disabled,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    touchAction: "none" as const,
    WebkitUserSelect: "none" as const,
    userSelect: "none" as const,
  };
  const dragProps = disabled
    ? {}
    : {
        ...attributes,
        ...listeners,
      };
  const residentIssueSeverity = getWorstValidationSeverity(validationIssues);
  const hasIssue = residentIssueSeverity === "error" || residentIssueSeverity === "warning";
  const residentIssueTitle = getValidationTooltip(validationIssues);
  const rotationLabel = resident.currentRotationLabel ?? "No rotation listed";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragProps}
      title={residentIssueTitle}
      className={`select-none rounded-md border px-2 py-1.5 shadow-sm transition ${
        hasIssue
          ? residentIssueSeverity === "error"
            ? "border-rose-300 bg-rose-50"
            : "border-amber-300 bg-amber-50"
          : `${color.border} ${color.bg}`
      } ${
        disabled
          ? "cursor-default opacity-70"
          : "cursor-grab hover:brightness-95 hover:shadow-md active:cursor-grabbing"
      } ${isDragging ? "opacity-40 shadow-lg" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <p className={`truncate text-[11px] font-semibold leading-4 ${color.text}`}>
              {resident.residentName?.trim() || "Unknown"}
            </p>
          </div>
          <p className="mt-0.5 truncate text-[10px] leading-3 text-slate-500">
            {rotationLabel}
          </p>
          {resident.trainingLevel ? (
            <p className="mt-0.5 text-[10px] leading-3 text-slate-500">
              {resident.trainingLevel}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {validationIssues.length > 0 ? (
            <span
              title={residentIssueTitle}
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                residentIssueSeverity === "error"
                  ? "bg-rose-600 text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              {validationIssues.length}
            </span>
          ) : null}
          <div className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${color.badge} ${color.badgeText}`}>
            {count}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotDropZone({
  slotId,
  dateKey,
  callType,
  call,
  inMonth,
  isToday,
  deleteMode,
  deleteSelected,
  draggingKind,
  pendingStyle,
  validationIssues,
  validationTitle,
  onClick,
  children,
  canEditAssignments,
  working,
}: {
  slotId: string;
  dateKey: string;
  callType: string;
  call: ProgramCallItem | null;
  inMonth: boolean;
  isToday: boolean;
  deleteMode: boolean;
  deleteSelected?: boolean;
  draggingKind: "call" | "resident" | null;
  pendingStyle?: string;
  validationIssues?: CallValidationIssue[];
  validationTitle?: string;
  onClick: () => void;
  children: React.ReactNode;
  canEditAssignments: boolean;
  working: boolean;
}) {
  const editState = getAssignmentEditState({
    call,
    inMonth,
    canEdit: canEditAssignments,
    working,
    deleteMode,
  });
  const canDrop =
    inMonth &&
    !deleteMode &&
    (!call || !editState.isDragDisabled);

  const { isOver, setNodeRef } = useDroppable({
    id: buildSlotDndId(slotId),
    data: {
      kind: "slot",
      slotId,
      slot: {
        dateKey,
        callType,
      },
      call,
      dateKey,
      callType,
      canDrop,
      inMonth,
    } satisfies SlotDroppableData,
  });

  const targetStateLabel = !draggingKind
    ? null
    : !canDrop
    ? "Locked"
    : call
    ? draggingKind === "resident"
      ? "Replace"
      : "Swap"
    : "Assign";
  const slotIssues = validationIssues ?? [];
  const slotIssueBadge = getValidationBadgeText(slotIssues);
  const slotIssueTitle = validationTitle ?? getValidationTooltip(slotIssues);

  return (
    // Using div instead of button avoids invalid nested-button HTML
    // (DraggableCallCard is also a button). Keyboard access preserved via role/tabIndex/onKeyDown.
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={inMonth && !deleteMode ? 0 : -1}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={[
        "relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md border px-1.5 py-1 text-left transition",
        call
          ? "border-slate-200 bg-white hover:border-amber-300"
          : "border-dashed border-slate-200 bg-slate-50/80",
        !call && canDrop ? "cursor-pointer hover:border-amber-300 hover:bg-amber-50/60" : "",
        !call && !canDrop ? "cursor-default opacity-70" : "",
        deleteMode && call && !editState.isDragDisabled
          ? deleteSelected
            ? "border-rose-400 bg-rose-100 ring-2 ring-rose-300"
            : "border-rose-200 bg-rose-50 hover:border-rose-400 hover:bg-rose-100"
          : "",
        isToday ? "ring-1 ring-slate-900/10" : "",
        isOver && canDrop ? "ring-2 ring-amber-300" : "",
        isOver && !canDrop ? "opacity-60" : "",
        pendingStyle ?? "",
      ].join(" ")}
    >
      {children}

      {deleteMode && deleteSelected ? (
        <div className="pointer-events-none absolute right-1 top-1 inline-flex items-center gap-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-white shadow-sm">
          <Check className="h-2.5 w-2.5" />
          Selected
        </div>
      ) : null}

      {slotIssueBadge && !(deleteMode && deleteSelected) ? (
        <div
          title={slotIssueTitle}
          className={`pointer-events-none absolute left-1 top-1 rounded-full px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] ${
            slotIssueBadge === "Error"
              ? "bg-rose-600 text-white"
              : "bg-amber-500 text-white"
          }`}
        >
          {slotIssueBadge}
        </div>
      ) : null}

      {targetStateLabel && !(deleteMode && deleteSelected) ? (
        <div
          className={`pointer-events-none absolute right-1 top-1 rounded-full px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] ${
            canDrop
              ? call
                ? "bg-slate-900 text-white"
              : "bg-amber-500 text-white"
              : "bg-slate-200 text-slate-500"
          }`}
        >
          {targetStateLabel}
        </div>
      ) : null}
    </div>
  );
}

export default function EditCallMonthCalendar({
  year,
  monthIndex,
  calls,
  loading,
  residents,
  onCancel,
  onSwitch,
  onSwap,
  onDelete,
  onCreate,
  callSlots,
  slotDefinitions,
  programRules = [],
  rotationAssignments = [],
  timeOffItems = [],
  initialDraftAssignments,
  onDraftChange,
  onBulkPublish,
  draftSaveStatus = "idle",
  draftLastSavedAt,
  attendingCoverageByDate,
}: {
  year: number;
  monthIndex: number;
  calls: ProgramCallItem[];
  loading?: boolean;
  residents: ResidentOption[];
  onCancel: () => void;
  onSwitch?: (payload: {
    callId: string;
    fromRosterId: string | null;
    toRosterId: string;
    toProgramMembershipId?: string | null;
  }) => Promise<void> | void;
  onSwap?: (payload: {
    firstCallId: string;
    secondCallId: string;
  }) => Promise<void> | void;
  onDelete?: (payload: { callId: string }) => Promise<void> | void;
  onCreate?: (payload: {
    rosterId: string;
    callDate: string;
    callType: string;
    programMembershipId?: string | null;
  }) => Promise<void> | void;
  callSlots?: ProgramCallSlot[];
  slotDefinitions?: ProgramCallSlotDefinition[];
  programRules?: ProgramRule[];
  rotationAssignments?: CallHubRotationAssignment[];
  timeOffItems?: CallHubTimeOffItem[];
  onBulkPublish?: (payload: {
    rows: ReturnType<typeof buildBulkPublishRowsFromSlotMap>;
    replaceExistingForDates: string[];
  }) => Promise<void>;
  /**
   * Pre-populated draft assignments restored from the backend draft API.
   * When provided, the calendar reconstructs its pending-change state so the
   * user sees their unsaved work immediately on page load / edit-mode re-entry.
   */
  initialDraftAssignments?: Record<string, DraftDayAssignment> | null;
  /**
   * Called after each slotMap mutation (create / replace / move / swap / delete)
   * with the new draft assignment record, or null when changes are discarded.
   * The parent (callhubclient) debounces this and persists to the backend draft API.
   */
  onDraftChange?: (assignments: Record<string, DraftDayAssignment> | null) => void;
  /** Save lifecycle status — drives the draft status badge. */
  draftSaveStatus?: "idle" | "pending" | "saving" | "saved" | "error" | "conflict";
  /** Timestamp of the last successful autosave — drives "saved X ago" text. */
  draftLastSavedAt?: Date | null;
  attendingCoverageByDate?: Map<string, DayAttendingCoverageSummary>;
}) {
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [activeSlotAction, setActiveSlotAction] = useState<ActiveSlotAction>(null);
  const [targetRosterId, setTargetRosterId] = useState("");
  const [working, setWorking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [serverValidationResult, setServerValidationResult] =
    useState<CallValidationResult | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [residentSearch, setResidentSearch] = useState("");
  const [activeDragCall, setActiveDragCall] = useState<ProgramCallItem | null>(null);
  const [activeDragResident, setActiveDragResident] = useState<ResidentOption | null>(null);
  const canEditAssignments =
    Boolean(onCreate) && Boolean(onDelete) && Boolean(onSwitch) && Boolean(onSwap);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const weeks = useMemo(
    () => buildCalendarWeeksSunday(year, monthIndex),
    [year, monthIndex]
  );

  const todayKey = toDateKey(new Date());

  // resolvedCallSlots = ALL possible slots for this program.
  // Used to populate the slotMap so every slot type has a drop target.
  // Visibility per day is handled separately in slotItemsByDate.
  const resolvedCallSlots = useMemo((): ProgramCallSlot[] => {
    if (slotDefinitions && slotDefinitions.length > 0) {
      return slotDefsToCallSlots(slotDefinitions);
    }
    if (callSlots && callSlots.length > 0) return callSlots;
    return getDefaultCallSlots(calls);
  }, [slotDefinitions, callSlots, calls]);

  // Lookup from callType (lowercase) → slot definition (for per-day condition checks).
  const slotDefByCallType = useMemo(() => {
    const map = new Map<string, ProgramCallSlotDefinition>();
    const defs = slotDefinitions && slotDefinitions.length > 0
      ? slotDefinitions
      : DEFAULT_SLOT_DEFINITIONS;
    for (const def of defs) {
      map.set(def.callType.toLowerCase(), def);
    }
    return map;
  }, [slotDefinitions]);
  const initialSlotMap = useMemo(
    () => buildSlotMap(weeks, resolvedCallSlots, calls),
    [weeks, resolvedCallSlots, calls]
  );
  const [baselineSlotMap, setBaselineSlotMap] = useState<Map<string, ProgramCallItem | null>>(
    initialSlotMap
  );
  const [slotMap, setSlotMap] = useState<Map<string, ProgramCallItem | null>>(initialSlotMap);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [deleteSelectedCallIds, setDeleteSelectedCallIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const pendingIdRef = useRef(0);

  // Stable ref for onDraftChange so the autosave effect does not re-fire when
  // the parent re-renders with a new function identity.
  const onDraftChangeRef = useRef(onDraftChange);
  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  });

  // Track whether this is the initial render so we don't autosave on mount.
  const draftAutosaveReady = useRef(false);

  // ─── Draft restoration ─────────────────────────────────────────────────────
  // On mount (or when initialDraftAssignments first arrives), reconstruct pending
  // state from the saved backend draft so the user sees their unsaved work.
  useEffect(() => {
    if (!initialDraftAssignments || Object.keys(initialDraftAssignments).length === 0) {
      draftAutosaveReady.current = true;
      return;
    }

    const residentLookup = new Map<string, ResidentOption>();
    for (const r of residents) residentLookup.set(r.rosterId, r);

    const { slotMap: nextSlotMap, pendingChanges: nextPendingChanges } =
      reconstructFromDraft(initialDraftAssignments, initialSlotMap, residentLookup);

    if (nextPendingChanges.length > 0) {
      setBaselineSlotMap(initialSlotMap);
      setSlotMap(nextSlotMap);
      setPendingChanges(nextPendingChanges);
    }

    // Allow autosave only AFTER restoration is complete so we don't immediately
    // re-write a draft equal to what we just loaded.
    draftAutosaveReady.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount

  // ─── Draft autosave ────────────────────────────────────────────────────────
  // After each slotMap mutation, notify the parent so it can debounce-persist
  // the current draft to the backend.
  useEffect(() => {
    if (!draftAutosaveReady.current) return;
    if (!onDraftChangeRef.current) return;
    onDraftChangeRef.current(
      pendingChanges.length > 0 ? slotMapToDraftAssignments(slotMap) : null
    );
  }, [slotMap, pendingChanges.length]);

  useEffect(() => {
    if (pendingChanges.length === 0) {
      setBaselineSlotMap(initialSlotMap);
      setSlotMap(initialSlotMap);
    }
  }, [initialSlotMap, pendingChanges.length]);

  useEffect(() => {
    setLocalError(null);
  }, [selectedDateKey, activeSlotAction, deleteMode, pendingChanges.length, deleteSelectedCallIds.length]);

  const activeCall = activeSlotAction?.type === "replace" ? activeSlotAction.call : null;
  const modalOpen = activeSlotAction !== null;
  const modalCallType =
    activeSlotAction?.type === "replace"
      ? activeSlotAction.call.callType ?? "Primary"
      : activeSlotAction?.type === "create"
      ? activeSlotAction.callType
      : "Call";

  const switchTargetResident = useMemo(
    () =>
      residents.find((resident) => resident.rosterId === targetRosterId) ?? null,
    [residents, targetRosterId]
  );
  const deleteSelectedCallIdSet = useMemo(
    () => new Set(deleteSelectedCallIds),
    [deleteSelectedCallIds]
  );
  const hasPendingChanges = pendingChanges.length > 0;
  const selectedDeleteAssignments = useMemo(
    () =>
      Array.from(slotMap.entries())
        .map(([slotId, call]) => {
          if (!call || !deleteSelectedCallIdSet.has(call.id)) return null;
          return { slotId, call, slot: deserializeSlotId(slotId) };
        })
        .filter(
          (
            item
          ): item is {
            slotId: string;
            call: ProgramCallItem;
            slot: CallSlotId;
          } => !!item
        ),
    [deleteSelectedCallIdSet, slotMap]
  );

  const residentCounts = useMemo(() => getResidentCountMap(slotMap), [slotMap]);
  const draftDayAssignments = useMemo(
    () => slotMapToDraftDayAssignments(slotMap),
    [slotMap]
  );
  const draftAssignments = useMemo(
    () => slotMapToCallDraftAssignments(slotMap),
    [slotMap]
  );
  const effectiveSlotDefinitions = useMemo(
    () =>
      slotDefinitions && slotDefinitions.length > 0
        ? slotDefinitions
        : DEFAULT_SLOT_DEFINITIONS,
    [slotDefinitions]
  );
  const validationContext = useMemo(
    (): CallHubValidationContext => ({
      rules: programRules,
      slotDefinitions: effectiveSlotDefinitions,
      residents: toCallHubResidents(residents),
      rotations: rotationAssignments,
      timeOff: timeOffItems,
    }),
    [
      programRules,
      effectiveSlotDefinitions,
      residents,
      rotationAssignments,
      timeOffItems,
    ]
  );
  const modalPickerEligibility = useMemo(() => {
    if (!activeSlotAction) return null;

    const targetSlotId =
      activeSlotAction.type === "create"
        ? serializeSlotId({
            dateKey: activeSlotAction.dateKey,
            callType: activeSlotAction.callType,
          })
        : serializeSlotId({
            dateKey: activeSlotAction.call.callDate ?? selectedDateKey ?? "",
            callType: activeSlotAction.call.callType ?? "Primary",
          });

    const excludeRosterIds =
      activeSlotAction.type === "replace"
        ? [
            activeSlotAction.call.rosterId ??
              activeSlotAction.call.membershipId ??
              "",
          ].filter(Boolean)
        : [];

    return getEligibleResidentsForSlotPicker({
      slotMap,
      targetSlotId,
      context: validationContext,
      existingCall:
        activeSlotAction.type === "replace" ? activeSlotAction.call : null,
      ignoreCallId:
        activeSlotAction.type === "replace" ? activeSlotAction.call.id : null,
      excludeRosterIds,
    });
  }, [activeSlotAction, selectedDateKey, slotMap, validationContext]);
  const buddyDateStateByDate = useMemo(
    () =>
      buildBuddyDateStateByDate({
        year,
        monthIndex,
        residents: toCallHubResidents(residents),
        rotations: rotationAssignments,
        rules: programRules,
        slotDefinitions: effectiveSlotDefinitions,
        draftAssignments: draftDayAssignments,
      }),
    [
      year,
      monthIndex,
      residents,
      rotationAssignments,
      programRules,
      effectiveSlotDefinitions,
      draftDayAssignments,
    ]
  );
  const touchedValidationDates = useMemo(
    () => getTouchedDatesFromPendingChanges(pendingChanges),
    [pendingChanges]
  );
  const draftValidation = useMemo(
    () =>
      validateCallMonthDraft(
        buildCallHubValidationInput({
          assignments: draftAssignments,
          context: validationContext,
          touchedDates:
            touchedValidationDates.length > 0
              ? touchedValidationDates
              : Object.keys(draftDayAssignments),
        })
      ),
    [
      draftAssignments,
      validationContext,
      touchedValidationDates,
      draftDayAssignments,
    ]
  );
  const displayValidation = serverValidationResult ?? draftValidation;
  const validationSummary = getValidationSummary(displayValidation);
  const displayValidationSource = serverValidationResult ? "server" : "client";
  const hasDisplayValidation =
    displayValidation.hasErrors || displayValidation.hasWarnings;

  function getSlotValidationIssues(slotId: string) {
    return getSlotValidationDisplay(displayValidation, slotId).issues;
  }

  function getSlotValidationTitle(slotId: string) {
    return getSlotValidationGuidance(displayValidation, slotId).tooltip;
  }

  function getResidentValidationIssues(rosterId: string) {
    return getResidentValidationDisplay(displayValidation, rosterId).issues;
  }
  const filteredResidents = useMemo(() => {
    const query = residentSearch.trim().toLowerCase();
    if (!query) return residents;

    return residents.filter((resident) => {
      return (
        resident.residentName.toLowerCase().includes(query) ||
        resident.trainingLevel?.toLowerCase().includes(query)
      );
    });
  }, [residentSearch, residents]);
  const residentGroups = useMemo(
    () =>
      ["PGY-1", "PGY-2", "PGY-3", "PGY-4", "PGY-5"].map((level) => ({
        level,
        residents: filteredResidents.filter(
          (resident) => resident.trainingLevel === level
        ),
      })),
    [filteredResidents]
  );

  const slotItemsByDate = useMemo(() => {
    const map = new Map<string, SlotRenderItem[]>();

    for (const week of weeks) {
      for (const date of week) {
        const dateKey = toDateKey(date);
        const dayOfWeek = date.getDay();
        const inMonth = isSameMonth(date, year, monthIndex);

        // Find the Primary call for this date to evaluate conditional visibility.
        // Buddy visibility must be derived from draft assignments so conditional buddy
        // slots appear before save — pgyYear is set on optimistic calls by createOptimisticCall.
        const primarySlotId = serializeSlotId({ dateKey, callType: "Primary" });
        const primaryCall = slotMap.get(primarySlotId) ?? null;
        const primaryCallPgyYear =
          primaryCall?.pgyYear ??
          parsePgyFromTrainingLevel(primaryCall?.trainingLevel) ??
          null;

        // Which call types already have a saved assignment on this day?
        const assignedCallTypeKeys = new Set<string>();
        for (const slot of resolvedCallSlots) {
          const sid = serializeSlotId({ dateKey, callType: slot.key });
          if (slotMap.get(sid)) {
            assignedCallTypeKeys.add(slot.key.toLowerCase());
          }
        }

        // Determine which slots are visible on this specific day.
        const visibleSlotKeys = new Set<string>();
        if (slotDefinitions && slotDefinitions.length > 0) {
          const visibleDefs = getCallHubVisibleSlotDefinitions({
            dayOfWeek,
            primaryCallPgyYear,
            assignedCallTypeKeys,
            slotDefinitions: effectiveSlotDefinitions,
            buddyDateState: buddyDateStateByDate.get(dateKey) ?? null,
            draftDayAssignment: draftDayAssignments[dateKey] ?? null,
          });
          for (const def of visibleDefs) {
            visibleSlotKeys.add(def.callType.toLowerCase());
          }
        } else {
          // No slot definitions: show all slots that the resolvedCallSlots list contains.
          for (const slot of resolvedCallSlots) {
            visibleSlotKeys.add(slot.key.toLowerCase());
          }
        }

        const items: SlotRenderItem[] = [];
        for (const slot of resolvedCallSlots) {
          if (!visibleSlotKeys.has(slot.key.toLowerCase())) continue;

          const slotId = serializeSlotId({ dateKey, callType: slot.key });

          // Enrich slot with shortLabel from definition if available.
          const def = slotDefByCallType.get(slot.key.toLowerCase());
          const enrichedSlot: ProgramCallSlot = def
            ? { ...slot, shortLabel: def.shortLabel, color: def.colorKey }
            : slot;

          items.push({
            slot: enrichedSlot,
            slotId,
            call: slotMap.get(slotId) ?? null,
            inMonth,
            isToday: dateKey === todayKey,
          });
        }

        map.set(dateKey, items);
      }
    }

    return map;
  }, [
    monthIndex,
    resolvedCallSlots,
    slotMap,
    todayKey,
    weeks,
    year,
    slotDefinitions,
    slotDefByCallType,
    effectiveSlotDefinitions,
    buddyDateStateByDate,
    draftDayAssignments,
  ]);

  function closeModal() {
    setActiveSlotAction(null);
    setTargetRosterId("");
  }

  function clearServerValidation() {
    setServerValidationResult(null);
  }

  function getNextPendingId() {
    pendingIdRef.current += 1;
    return `pending-${pendingIdRef.current}`;
  }

  function findResidentByRosterId(rosterId: string) {
    return residents.find((resident) => resident.rosterId === rosterId) ?? null;
  }

  function getAssignedRosterId(call: ProgramCallItem | null | undefined) {
    return call?.rosterId ?? call?.membershipId ?? null;
  }

  function getPendingStyle(slotId: string, callId?: string | null) {
    const validationIssues = getSlotValidationIssues(slotId);
    const validationStyle = getValidationSeverityClass(validationIssues);

    if (callId && deleteSelectedCallIdSet.has(callId)) {
      return [
        "ring-2 ring-rose-300 border-rose-300 bg-rose-50/90 opacity-90",
        validationStyle,
      ]
        .filter(Boolean)
        .join(" ");
    }

    let style = "";

    for (const change of pendingChanges) {
      if (change.kind === "create" && change.slotId === slotId) {
        style = "ring-2 ring-emerald-300 border-emerald-300 bg-emerald-50";
      }

      if (change.kind === "replace" && change.slotId === slotId) {
        style = "ring-2 ring-amber-300 border-amber-300 bg-amber-50";
      }

      if (
        change.kind === "move" &&
        (change.sourceSlotId === slotId || change.targetSlotId === slotId)
      ) {
        style = "ring-2 ring-sky-300 border-sky-300 bg-sky-50";
      }

      if (
        change.kind === "swap" &&
        (change.firstSlotId === slotId || change.secondSlotId === slotId)
      ) {
        style = "ring-2 ring-sky-300 border-sky-300 bg-sky-50";
      }

      if (change.kind === "delete" && change.slotId === slotId) {
        style = "ring-2 ring-rose-300 border-rose-300 bg-rose-50/90 opacity-90";
      }
    }

    return [style, validationStyle].filter(Boolean).join(" ");
  }

  function resetPendingState(nextBaseline?: Map<string, ProgramCallItem | null>) {
    const baseline = nextBaseline ?? baselineSlotMap;
    setSlotMap(new Map(baseline));
    setPendingChanges([]);
    setDeleteSelectedCallIds([]);
    setDeleteMode(false);
    setShowDeleteConfirm(false);
    setSelectedDateKey(null);
    setLocalError(null);
    clearServerValidation();
  }

  function updateCreateChange(
    changes: PendingChange[],
    tempCallId: string,
    updater: (change: Extract<PendingChange, { kind: "create" }>) => PendingChange | null
  ) {
    let didUpdate = false;
    const nextChanges = changes.flatMap((change) => {
      if (change.kind !== "create" || change.tempCallId !== tempCallId) {
        return [change];
      }

      didUpdate = true;
      const nextChange = updater(change);
      return nextChange ? [nextChange] : [];
    });

    return {
      didUpdate,
      nextChanges,
    };
  }

  function hasDuplicateAssignment(
    rosterId: string,
    callDate: string,
    callType: string,
    ignoreCallId?: string
  ) {
    for (const call of slotMap.values()) {
      if (!call) continue;
      const callRosterId = call?.rosterId ?? call?.membershipId;
      if (!callRosterId) continue;
      if (ignoreCallId && call.id === ignoreCallId) continue;
      if (callRosterId !== rosterId) continue;
      if (call.callDate !== callDate) continue;
      if (normalizeSlotKey(call.callType) !== normalizeSlotKey(callType)) continue;
      return true;
    }

    return false;
  }

  function queueCreate(slotId: string, slot: CallSlotId, resident: ResidentOption) {
    clearServerValidation();
    const nextCall = createOptimisticCall(resident, slot);
    setSlotMap((previous) => {
      const next = new Map(previous);
      next.set(slotId, nextCall);
      return next;
    });
    setPendingChanges((previous) => [
      ...previous,
      {
        id: getNextPendingId(),
        kind: "create",
        slotId,
        slot,
        resident,
        tempCallId: nextCall.id,
      },
    ]);
  }

  function queueReplace(call: ProgramCallItem, slotId: string, resident: ResidentOption) {
    clearServerValidation();
    const nextCall = createOptimisticCall(resident, deserializeSlotId(slotId), call);
    setSlotMap((previous) => {
      const next = new Map(previous);
      next.set(slotId, nextCall);
      return next;
    });

    setPendingChanges((previous) => {
      const createUpdate = updateCreateChange(previous, call.id, (change) => ({
        ...change,
        resident,
      }));

      if (createUpdate.didUpdate) {
        return createUpdate.nextChanges;
      }

      const existingMoveIndex = previous.findIndex(
        (change) => change.kind === "move" && change.sourceCallId === call.id
      );

      if (existingMoveIndex >= 0) {
        const nextChanges = [...previous];
        const moveChange = nextChanges[existingMoveIndex] as Extract<PendingChange, { kind: "move" }>;
        nextChanges[existingMoveIndex] = {
          ...moveChange,
          resident,
        };
        return nextChanges;
      }

      const nextChanges = previous.filter(
        (change) => !(change.kind === "replace" && change.callId === call.id)
      );

      nextChanges.push({
        id: getNextPendingId(),
        kind: "replace",
        slotId,
        callId: call.id,
        fromRosterId: getAssignedRosterId(call),
        resident,
      });

      return nextChanges;
    });
  }

  function queueMove(sourceCall: ProgramCallItem, sourceSlotId: string, targetSlotId: string) {
    clearServerValidation();
    const targetSlot = deserializeSlotId(targetSlotId);
    const sourceResidentId = getAssignedRosterId(sourceCall);
    const resident = sourceResidentId ? findResidentByRosterId(sourceResidentId) : null;

    if (!resident) {
      setLocalError("Target resident could not be found.");
      return;
    }

    const nextCall = createOptimisticCall(resident, targetSlot, sourceCall);
    setSlotMap((previous) => {
      const next = new Map(previous);
      next.set(sourceSlotId, null);
      next.set(targetSlotId, nextCall);
      return next;
    });

    setPendingChanges((previous) => {
      const createUpdate = updateCreateChange(previous, sourceCall.id, (change) => ({
        ...change,
        slotId: targetSlotId,
        slot: targetSlot,
      }));

      if (createUpdate.didUpdate) {
        return createUpdate.nextChanges;
      }

      const moveIndex = previous.findIndex(
        (change) => change.kind === "move" && change.sourceCallId === sourceCall.id
      );

      if (moveIndex >= 0) {
        const nextChanges = [...previous];
        const moveChange = nextChanges[moveIndex] as Extract<PendingChange, { kind: "move" }>;
        nextChanges[moveIndex] = {
          ...moveChange,
          targetSlotId,
          resident,
        };
        return nextChanges;
      }

      return [
        ...previous,
        {
          id: getNextPendingId(),
          kind: "move",
          sourceSlotId,
          targetSlotId,
          sourceCallId: sourceCall.id,
          resident,
        },
      ];
    });
  }

  function queueSwap(
    sourceCall: ProgramCallItem,
    sourceSlotId: string,
    targetCall: ProgramCallItem,
    targetSlotId: string
  ) {
    clearServerValidation();
    setSlotMap((previous) => {
      const next = new Map(previous);
      next.set(sourceSlotId, targetCall);
      next.set(targetSlotId, sourceCall);
      return next;
    });

    setPendingChanges((previous) => {
        const sourceCreateUpdate = updateCreateChange(previous, sourceCall.id, (change) => ({
          ...change,
          slotId: targetSlotId,
          slot: deserializeSlotId(targetSlotId),
        }));

        const targetCreateUpdate = updateCreateChange(
          sourceCreateUpdate.didUpdate ? sourceCreateUpdate.nextChanges : previous,
          targetCall.id,
          (change) => ({
            ...change,
            slotId: sourceSlotId,
            slot: deserializeSlotId(sourceSlotId),
          })
        );

        if (sourceCreateUpdate.didUpdate && targetCreateUpdate.didUpdate) {
          return targetCreateUpdate.nextChanges;
        }

        if (sourceCreateUpdate.didUpdate) {
          const residentId = getAssignedRosterId(targetCall);
          const resident = residentId ? findResidentByRosterId(residentId) : null;

          if (!resident) return sourceCreateUpdate.nextChanges;

          const moveIndex = sourceCreateUpdate.nextChanges.findIndex(
            (change) => change.kind === "move" && change.sourceCallId === targetCall.id
          );

          if (moveIndex >= 0) {
            const nextChanges = [...sourceCreateUpdate.nextChanges];
            nextChanges[moveIndex] = {
              ...(nextChanges[moveIndex] as Extract<PendingChange, { kind: "move" }>),
              targetSlotId: sourceSlotId,
              resident,
            };
            return nextChanges;
          }

          return [
            ...sourceCreateUpdate.nextChanges,
            {
              id: getNextPendingId(),
              kind: "move",
              sourceSlotId: targetSlotId,
              targetSlotId: sourceSlotId,
              sourceCallId: targetCall.id,
              resident,
            },
          ];
        }

        if (targetCreateUpdate.didUpdate) {
          const residentId = getAssignedRosterId(sourceCall);
          const resident = residentId ? findResidentByRosterId(residentId) : null;

          if (!resident) return targetCreateUpdate.nextChanges;

          const moveIndex = targetCreateUpdate.nextChanges.findIndex(
            (change) => change.kind === "move" && change.sourceCallId === sourceCall.id
          );

          if (moveIndex >= 0) {
            const nextChanges = [...targetCreateUpdate.nextChanges];
            nextChanges[moveIndex] = {
              ...(nextChanges[moveIndex] as Extract<PendingChange, { kind: "move" }>),
              targetSlotId,
              resident,
            };
            return nextChanges;
          }

          return [
            ...targetCreateUpdate.nextChanges,
            {
              id: getNextPendingId(),
              kind: "move",
              sourceSlotId,
              targetSlotId,
              sourceCallId: sourceCall.id,
              resident,
            },
          ];
        }

        return [
          ...previous,
          {
            id: getNextPendingId(),
            kind: "swap",
            firstSlotId: sourceSlotId,
            secondSlotId: targetSlotId,
            firstCallId: sourceCall.id,
            secondCallId: targetCall.id,
          },
        ];
    });
  }

  function queueDelete(call: ProgramCallItem, slotId: string) {
    clearServerValidation();
    setSlotMap((previous) => {
      const next = new Map(previous);
      next.set(slotId, null);
      return next;
    });

    setPendingChanges((previous) => {
      const createUpdate = updateCreateChange(previous, call.id, () => null);

      if (createUpdate.didUpdate) {
        return createUpdate.nextChanges.filter((change) => {
          if (change.kind === "move" && change.sourceCallId === call.id) return false;
          if (change.kind === "swap") {
            return change.firstCallId !== call.id && change.secondCallId !== call.id;
          }
          return true;
        });
      }

      return [
        ...previous.filter((change) => {
          if (change.kind === "replace" && change.callId === call.id) return false;
          if (change.kind === "move" && change.sourceCallId === call.id) return false;
          return true;
        }),
        {
          id: getNextPendingId(),
          kind: "delete",
          slotId,
          callId: call.id,
        },
      ];
    });
  }

  function toggleDeleteSelection(callId: string) {
    setDeleteSelectedCallIds((previous) =>
      previous.includes(callId)
        ? previous.filter((id) => id !== callId)
        : [...previous, callId]
    );
  }

  function confirmDeleteSelection() {
    clearServerValidation();
    // Pass deleteMode:false so the editState check evaluates actual editability,
    // not the delete-mode drag-disable flag (which would filter out everything).
    const selectedSlots = selectedDeleteAssignments.filter(({ call }) => {
      const editState = getAssignmentEditState({
        call,
        inMonth: true,
        canEdit: canEditAssignments,
        working,
        deleteMode: false,
      });
      return !editState.isDragDisabled;
    });

    if (selectedSlots.length === 0) {
      setShowDeleteConfirm(false);
      setDeleteSelectedCallIds([]);
      return;
    }

    for (const entry of selectedSlots) {
      queueDelete(entry.call, entry.slotId);
    }

    setDeleteSelectedCallIds([]);
    setShowDeleteConfirm(false);
    setDeleteMode(false);
  }

  function handleDiscardChanges() {
    closeModal();
    resetPendingState();
    // Signal parent to delete the backend draft so the user starts fresh next time.
    onDraftChangeRef.current?.(null);
  }

  async function handlePublishChanges() {
    if (!hasPendingChanges) return;
    if (draftValidation.hasErrors) {
      setLocalError(formatPublishValidationError(draftValidation));
      return;
    }

    const slotMapSnapshot = new Map(slotMap);
    const pendingSnapshot = [...pendingChanges];
    const touchedDates = getTouchedDatesFromPendingChanges(pendingSnapshot);

    try {
      setWorking(true);
      setLocalError(null);

      if (onBulkPublish) {
        const rows = buildBulkPublishRowsFromSlotMap({
          slotMap: slotMapSnapshot,
          touchedDateKeys: touchedDates,
          residentsByRosterId: new Map(
            toCallHubResidents(residents).map((resident) => [resident.rosterId, resident])
          ),
        });

        await onBulkPublish({
          rows,
          replaceExistingForDates: touchedDates,
        });
      } else {
        for (const change of pendingSnapshot) {
          if (change.kind === "create") {
            if (!onCreate) {
              throw new Error("Creating assignments is not available yet for this calendar.");
            }

            await onCreate({
              rosterId: change.resident.rosterId,
              callDate: change.slot.dateKey,
              callType: change.slot.callType,
              programMembershipId: change.resident.programMembershipId,
            });
            continue;
          }

          if (change.kind === "replace") {
            if (!onSwitch) {
              throw new Error("Replacing assignments is not available yet for this calendar.");
            }

            await onSwitch({
              callId: change.callId,
              fromRosterId: change.fromRosterId,
              toRosterId: change.resident.rosterId,
              toProgramMembershipId: change.resident.programMembershipId,
            });
            continue;
          }

          if (change.kind === "move") {
            if (!onCreate || !onDelete) {
              throw new Error("Moving assignments is not available yet for this calendar.");
            }

            const targetSlot = deserializeSlotId(change.targetSlotId);
            await onCreate({
              rosterId: change.resident.rosterId,
              callDate: targetSlot.dateKey,
              callType: targetSlot.callType,
              programMembershipId: change.resident.programMembershipId,
            });
            await onDelete({ callId: change.sourceCallId });
            continue;
          }

          if (change.kind === "swap") {
            if (!onSwap) {
              throw new Error("Swapping assignments is not available yet for this calendar.");
            }

            await onSwap({
              firstCallId: change.firstCallId,
              secondCallId: change.secondCallId,
            });
            continue;
          }

          if (!onDelete) {
            throw new Error("Deleting assignments is not available yet for this calendar.");
          }

          await onDelete({ callId: change.callId });
        }
      }

      const committedBaseline = new Map(slotMapSnapshot);
      setBaselineSlotMap(committedBaseline);
      clearServerValidation();
      setPendingChanges([]);
      setDeleteSelectedCallIds([]);
      setDeleteMode(false);
      setShowDeleteConfirm(false);
      onDraftChangeRef.current?.(null);
    } catch (err) {
      const serverValidation = getCallMutationValidation(err);

      if (serverValidation) {
        setServerValidationResult(serverValidation);
        setLocalError(formatPublishValidationError(serverValidation));
      } else {
        setLocalError(
          err instanceof Error ? err.message : "Failed to save pending changes."
        );
      }
    } finally {
      setWorking(false);
    }
  }

  function handleConfirmAssignment() {
    if (!activeSlotAction || !targetRosterId) return;

    try {
      setLocalError(null);

      if (activeSlotAction.type === "replace") {
        const selectedCall = activeSlotAction.call;
        const editState = getAssignmentEditState({
          call: selectedCall,
          inMonth: true,
          canEdit: canEditAssignments,
          working,
          deleteMode,
        });

        if (editState.isDragDisabled) {
          throw new Error(
            `This assignment is locked for edit mode: ${editState.disabledReason ?? "unknown"}`
          );
        }

        const selectedCallRosterId = selectedCall.rosterId ?? selectedCall.membershipId;

        if (selectedCallRosterId === targetRosterId) {
          throw new Error("That resident already owns this call.");
        }

        if (
          selectedCall.callDate &&
          hasDuplicateAssignment(
            targetRosterId,
            selectedCall.callDate,
            selectedCall.callType ?? "Primary",
            selectedCall.id
          )
        ) {
          throw new Error("That resident is already assigned to this slot on the same date.");
        }

        const resident = residents.find(
          (item) => item.rosterId === targetRosterId
        );

        if (!resident) {
          throw new Error("Target resident could not be found.");
        }

        const slotId = serializeSlotId({
          dateKey: selectedCall.callDate ?? selectedDateKey ?? "",
          callType: selectedCall.callType ?? "Primary",
        });

        const replaceRejection = getDropValidationMessage({
          slotMap,
          targetSlotId: slotId,
          resident: toCallHubResidents([resident])[0],
          context: validationContext,
          existingCall: selectedCall,
          ignoreCallId: selectedCall.id,
        });
        if (replaceRejection) {
          throw new Error(replaceRejection);
        }

        queueReplace(selectedCall, slotId, resident);
      }

      if (activeSlotAction.type === "create") {
        if (
          hasDuplicateAssignment(
            targetRosterId,
            activeSlotAction.dateKey,
            activeSlotAction.callType
          )
        ) {
          throw new Error("That resident is already assigned to this slot on the same date.");
        }

        const resident = residents.find(
          (item) => item.rosterId === targetRosterId
        );

        if (!resident) {
          throw new Error("Target resident could not be found.");
        }

        const slotId = serializeSlotId({
          dateKey: activeSlotAction.dateKey,
          callType: activeSlotAction.callType,
        });

        const createRejection = getDropValidationMessage({
          slotMap,
          targetSlotId: slotId,
          resident: toCallHubResidents([resident])[0],
          context: validationContext,
        });
        if (createRejection) {
          throw new Error(createRejection);
        }

        queueCreate(slotId, {
          dateKey: activeSlotAction.dateKey,
          callType: activeSlotAction.callType,
        }, resident);
      }

      closeModal();
      setSelectedDateKey(null);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to update call assignment."
      );
      throw err;
    }
  }

  function openReplaceModal(call: ProgramCallItem) {
    const editState = getAssignmentEditState({
      call,
      inMonth: true,
      canEdit: canEditAssignments,
      working,
      deleteMode,
    });

    if (editState.isDragDisabled) {
      setLocalError(
        `This assignment is locked for edit mode: ${editState.disabledReason ?? "unknown"}`
      );
      return;
    }

    setSelectedDateKey(call.callDate ?? null);
    setActiveSlotAction({
      type: "replace",
      call,
    });
    setTargetRosterId("");
  }

  function openCreateModal(dateKey: string, callType: string) {
    if (!onCreate) return;

    setSelectedDateKey(dateKey);
    setActiveSlotAction({
      type: "create",
      dateKey,
      callType,
    });
    setTargetRosterId("");
  }

  function handleDropOnSlot(
    overData: SlotDroppableData,
    sourceData: DragCallData | DragResidentData
  ) {
    const targetSlot = deserializeSlotId(overData.slotId);

    if (!overData.canDrop) {
      setLocalError("This slot is locked and cannot accept assignments.");
      return;
    }

    if (sourceData.kind === "assignment") {
      const sourceCall = sourceData.call;
      const sourceSlotId = sourceData.sourceSlotId;
      const sourceEditState = getAssignmentEditState({
        call: sourceCall,
        inMonth: true,
        canEdit: canEditAssignments,
        working,
        deleteMode,
      });

      if (sourceSlotId === overData.slotId) return;
      if (sourceEditState.isDragDisabled) return;

      if (overData.call) {
        const targetEditState = getAssignmentEditState({
          call: overData.call,
          inMonth: overData.inMonth,
          canEdit: canEditAssignments,
          working,
          deleteMode,
        });
        if (targetEditState.isDragDisabled) return;
        setLocalError(null);
        queueSwap(sourceCall, sourceSlotId, overData.call, overData.slotId);
        return;
      }

      const sourceRosterId = sourceCall.rosterId ?? sourceCall.membershipId;

      if (!sourceRosterId) {
        setLocalError("This call cannot be moved because the resident assignment is missing.");
        return;
      }

      if (
        hasDuplicateAssignment(
          sourceRosterId,
          targetSlot.dateKey,
          targetSlot.callType,
          sourceCall.id
        )
      ) {
        setLocalError("That resident is already assigned to this slot on the same date.");
        return;
      }

      const moveResident = findResidentByRosterId(sourceRosterId);
      if (!moveResident) {
        setLocalError("This call cannot be moved because the resident could not be found.");
        return;
      }

      const moveRejection = getDropValidationMessage({
        slotMap,
        targetSlotId: overData.slotId,
        resident: toCallHubResidents([moveResident])[0],
        context: validationContext,
        existingCall: sourceCall,
        ignoreCallId: sourceCall.id,
      });
      if (moveRejection) {
        setLocalError(moveRejection);
        return;
      }

      setLocalError(null);
      queueMove(sourceCall, sourceSlotId, overData.slotId);
      return;
    }

    const resident = sourceData.resident;

    if (
      hasDuplicateAssignment(
        resident.rosterId,
        targetSlot.dateKey,
        targetSlot.callType,
        overData.call?.id
      )
    ) {
      setLocalError("That resident is already assigned to this slot on the same date.");
      return;
    }

    const residentRejection = getDropValidationMessage({
      slotMap,
      targetSlotId: overData.slotId,
      resident: toCallHubResidents([resident])[0],
      context: validationContext,
      existingCall: overData.call,
      ignoreCallId: overData.call?.id,
    });
    if (residentRejection) {
      setLocalError(residentRejection);
      return;
    }

    if (overData.call) {
      const targetEditState = getAssignmentEditState({
        call: overData.call,
        inMonth: overData.inMonth,
        canEdit: canEditAssignments,
        working,
        deleteMode,
      });
      if (targetEditState.isDragDisabled) return;
      setLocalError(null);
      queueReplace(overData.call, overData.slotId, resident);
      return;
    }

    setLocalError(null);
    queueCreate(overData.slotId, targetSlot, resident);
  }

  function handleDragStart(event: DragStartEvent) {
    if (deleteMode) {
      setActiveDragCall(null);
      setActiveDragResident(null);
      return;
    }

    const data = event.active.data.current as DragCallData | DragResidentData | undefined;
    if (!data) return;

    if (data.kind === "assignment") {
      setActiveDragCall(data.call);
      setActiveDragResident(null);
      return;
    }

    setActiveDragCall(null);
    setActiveDragResident(data.resident);
  }

  // handleDragOver intentionally left empty — dnd-kit handles live feedback internally.
  function handleDragOver() {}

  function handleDragEnd(event: DragEndEvent) {
    if (deleteMode) {
      setActiveDragCall(null);
      setActiveDragResident(null);
      return;
    }

    const sourceData = event.active.data.current as
      | DragCallData
      | DragResidentData
      | undefined;
    const overData = event.over?.data.current as SlotDroppableData | undefined;

    setActiveDragCall(null);
    setActiveDragResident(null);

    if (!sourceData || !overData || overData.kind !== "slot") return;
    handleDropOnSlot(overData, sourceData);
  }

  function handleDragCancel() {
    setActiveDragCall(null);
    setActiveDragResident(null);
  }

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[1.5rem] border border-amber-200 bg-white shadow-xl">
        <div className="border-b border-amber-200 px-4 py-4 md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Staffing Board
              </h2>
              <p className="mt-1 text-xs text-slate-500 md:text-sm">
                Loading editable calendar...
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 text-sm text-slate-500">Loading edit mode...</div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-[1.5rem] border border-amber-200 bg-white shadow-xl">
        <div className="border-b border-amber-200 px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-950">
                  Staffing Board
                </h2>
                <p className="mt-1 text-xs text-slate-500 md:text-sm">
                  Drag residents onto slots to assign, replace, move, or swap call.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setDeleteMode((current) => {
                    clearServerValidation();
                    const next = !current;
                    if (!next) {
                      setDeleteSelectedCallIds([]);
                      setShowDeleteConfirm(false);
                    }
                    return next;
                  })
                }
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  deleteMode
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Trash2 className="h-4 w-4" />
                {deleteMode ? "Delete Mode On" : "Delete Mode"}
              </button>

              <button
                type="button"
                onClick={() => {
                  clearServerValidation();
                  setDeleteSelectedCallIds([]);
                  onCancel();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Exit Edit
              </button>
            </div>
          </div>
        </div>

        {localError ? (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:px-5">
            {localError}
          </div>
        ) : null}

        <DndContext
          id="call-month-editor"
          accessibility={{
            screenReaderInstructions: {
              draggable:
                "Press space to pick up a resident assignment. Use the arrow keys to move between call slots, press space to drop, or press escape to cancel.",
            },
          }}
          sensors={sensors}
          collisionDetection={(args) => {
            const pointerHits = pointerWithin(args);
            if (pointerHits.length > 0) return pointerHits;
            return closestCenter(args);
          }}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="space-y-1.5">
  <aside className="border-b border-slate-200 bg-slate-50 px-2.5 py-2">
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
          <UserRound className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold tracking-tight text-slate-950 md:text-base">
            Resident Pool
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Drag residents onto slots to assign, replace, and balance call burden.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 md:min-w-[220px] md:max-w-[280px] md:flex-1">
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            value={residentSearch}
            onChange={(event) => setResidentSearch(event.target.value)}
            placeholder="Search residents"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>
      </div>

      <div className="mt-2 grid gap-2 md:max-h-[160px] md:grid-cols-5 md:overflow-hidden">
  {residentGroups.map(({ level, residents: levelResidents }) => {
    return (
      <div key={level} className="min-w-0 md:flex md:min-h-0 md:flex-col">
        <div className="mb-1 flex items-center justify-between rounded-md bg-slate-100 px-2 py-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
            {level}
          </p>
          <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
            {levelResidents.length}
          </span>
        </div>

        <div className="space-y-1 md:max-h-[128px] md:min-h-0 md:overflow-y-auto md:pr-1">
          {levelResidents.map((resident) => (
            <DraggableResidentCard
              key={resident.rosterId}
              resident={resident}
              count={residentCounts.get(resident.rosterId) ?? 0}
              validationIssues={getResidentValidationIssues(resident.rosterId)}
              disabled={working || deleteMode}
              color={getResidentColorClasses(resident.rosterId)}
            />
          ))}
        </div>
      </div>
    );
  })}
</div>
    </div>
  </aside>

  <div className="min-w-0">
    <div className="overflow-x-hidden px-1.5 pb-1.5 pt-1 md:px-2">
      <div className="sticky top-0 z-20 mb-1 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur">
        {/* ── Draft status badge ─────────────────────────────────────────── */}
        {(() => {
          const n = pendingChanges.length;
          const changeLabel = n === 1 ? "1 unpublished change" : `${n} unpublished changes`;
          if (draftSaveStatus === "conflict") {
            return (
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                Draft changed elsewhere — reload to review
              </span>
            );
          }
          if (draftSaveStatus === "error") {
            return (
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                Draft save failed — retrying
              </span>
            );
          }
          if (draftSaveStatus === "saving" || draftSaveStatus === "pending") {
            return (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                Autosaving draft…
              </span>
            );
          }
          if (n === 0) {
            return (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                No unpublished changes
              </span>
            );
          }
          if (draftSaveStatus === "saved" && draftLastSavedAt) {
            return (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                Draft autosaved {formatRelativeTime(draftLastSavedAt)} · {changeLabel}
              </span>
            );
          }
          return (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              {changeLabel}
            </span>
          );
        })()}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handlePublishChanges()}
            disabled={!hasPendingChanges || working || draftValidation.hasErrors || draftSaveStatus === "conflict"}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PencilLine className="h-3.5 w-3.5" />
            {working ? "Publishing..." : "Publish changes"}
          </button>
          <button
            type="button"
            onClick={handleDiscardChanges}
            disabled={!hasPendingChanges || working}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Discard changes
          </button>
        </div>
      </div>

      {hasDisplayValidation ? (
        <div
          className={`sticky top-[42px] z-20 mb-1 rounded-lg border px-2 py-1.5 shadow-sm backdrop-blur ${
            validationSummary.hasErrors
              ? "border-rose-200 bg-rose-50/95"
              : "border-amber-200 bg-amber-50/95"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                validationSummary.hasErrors
                  ? "bg-rose-600 text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              {displayValidationSource === "server"
                ? "Server validation"
                : "Draft validation"}
            </span>
            <span className="font-semibold text-slate-900">
              {displayValidationSource === "server"
                ? "Server rejected this schedule"
                : validationSummary.hasErrors
                ? "Fix errors before publishing"
                : "Warnings will not block publish"}
            </span>
            <span className="text-slate-700">
              {validationSummary.counts.error} error
              {validationSummary.counts.error === 1 ? "" : "s"} ·{" "}
              {validationSummary.counts.warning} warning
              {validationSummary.counts.warning === 1 ? "" : "s"}{" "}
              {displayValidationSource === "server"
                ? "returned by server"
                : "found in draft"}
            </span>
            {validationSummary.firstIssues.map((issue, index) => (
              <span
                key={`${issue.code}-${issue.slotId ?? issue.residentId ?? index}`}
                className="text-slate-700"
                title={issue.message}
              >
                • {issue.message}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {deleteMode ? (
        <div
          className={`sticky z-20 mb-1 flex flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50/95 px-2 py-1.5 shadow-sm backdrop-blur ${
            hasDisplayValidation ? "top-[78px]" : "top-[42px]"
          }`}
        >
          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
            Delete mode
          </span>
          <span className="text-xs font-semibold text-rose-900">
            {deleteSelectedCallIds.length} selected
          </span>
          <span className="text-[11px] text-rose-700">
            Click filled editable assignments to select or deselect them.
          </span>
          <button
            type="button"
            onClick={() => {
              clearServerValidation();
              setDeleteMode(false);
              setDeleteSelectedCallIds([]);
              setShowDeleteConfirm(false);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <X className="h-3.5 w-3.5" />
            Cancel delete mode
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteSelectedCallIds.length === 0}
            className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete selected
          </button>
        </div>
      ) : null}

      <div className="sticky top-0 z-10 mb-0.5 grid grid-cols-7 gap-0.5 bg-white/95 py-0.5 backdrop-blur">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="py-0.5 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="space-y-0.5">
        {weeks.map((week, weekIndex) => (
          <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-0.5">
            {week.map((date) => {
              const dateKey = toDateKey(date);
              const inMonth = isSameMonth(date, year, monthIndex);
              const isToday = dateKey === todayKey;
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const dayItems = slotItemsByDate.get(dateKey) ?? [];
              const attendingCoverage = attendingCoverageByDate?.get(dateKey) ?? null;

              return (
                <div
                  key={dateKey}
                  className={[
                    "flex h-[108px] min-h-0 flex-col overflow-hidden rounded-md border px-1 py-0.5 text-left transition md:h-[124px] xl:h-[136px]",
                    inMonth && isWeekend
                      ? "border-slate-200 bg-orange-50/40"
                      : inMonth
                      ? "border-slate-200 bg-white"
                      : "border-transparent bg-slate-50/40",
                    isToday && inMonth ? "ring-2 ring-amber-400 bg-amber-50/40" : "",
                    selectedDateKey === dateKey ? "ring-2 ring-sky-300" : "",
                  ].join(" ")}
                >
                  <div className="mb-0.5 flex items-center justify-between gap-1">
                    <span
                      className={[
                        "text-[10px] font-bold leading-none",
                        isToday && inMonth
                          ? "rounded-full bg-amber-500 px-1.5 py-0.5 text-white"
                          : inMonth
                          ? isWeekend ? "text-orange-700" : "text-slate-700"
                          : "text-slate-300",
                      ].join(" ")}
                    >
                      {date.getDate()}
                    </span>
                    {inMonth ? (
                      <ReadOnlyAttendingCoverageChips summary={attendingCoverage} />
                    ) : isWeekend ? (
                      <span className="text-[8px] font-semibold uppercase tracking-wide text-orange-400">
                        {date.getDay() === 6 ? "Sa" : "Su"}
                      </span>
                    ) : null}
                  </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                      {dayItems.map((item) => {
                        const slotKey = normalizeCallType(item.slot.key);
                        const slotCall = item.call;
                        const assignmentEditState = getAssignmentEditState({
                          call: slotCall,
                          inMonth,
                          canEdit: canEditAssignments,
                          working,
                          deleteMode,
                        });
                        const isDeleteSelected = item.call
                          ? deleteSelectedCallIds.includes(item.call.id)
                          : false;
                        const slotValidationIssues = getSlotValidationIssues(
                          item.slotId
                        );
                        const slotValidationTitle = getSlotValidationTitle(
                          item.slotId
                        );

                        return (
                          <SlotDropZone
                            key={item.slotId}
                            slotId={item.slotId}
                            dateKey={dateKey}
                            callType={slotKey}
                            call={item.call}
                            inMonth={inMonth}
                            isToday={isToday}
                            deleteMode={deleteMode}
                            deleteSelected={isDeleteSelected}
                            draggingKind={
                              activeDragCall
                                ? "call"
                                : activeDragResident
                                ? "resident"
                                : null
                            }
                            pendingStyle={getPendingStyle(item.slotId, item.call?.id)}
                            validationIssues={slotValidationIssues}
                            validationTitle={slotValidationTitle}
                            canEditAssignments={canEditAssignments}
                            working={working}
                            onClick={() => {
                              setSelectedDateKey(dateKey);

                              if (item.call) {
                                if (deleteMode) {
                                  if (!assignmentEditState.isDragDisabled) {
                                    toggleDeleteSelection(item.call.id);
                                  } else {
                                    setLocalError(
                                      `This assignment is locked for edit mode: ${assignmentEditState.disabledReason ?? "unknown"}`
                                    );
                                  }
                                  return;
                                }

                                openReplaceModal(item.call);
                                return;
                              }

                              if (deleteMode) return;

                              if (onCreate && inMonth) {
                                openCreateModal(dateKey, item.slot.key);
                              }
                            }}
                          >
                            {slotCall ? (
                              <DraggableCallCard
                                call={slotCall}
                                slotId={item.slotId}
                                disabled={assignmentEditState.isDragDisabled}
                                color={getResidentColorClasses(
                                  slotCall.rosterId ?? slotCall.membershipId
                                )}
                                onClick={() => {
                                  setSelectedDateKey(dateKey);

                                  if (deleteMode) {
                                    toggleDeleteSelection(slotCall.id);
                                    return;
                                  }

                                  openReplaceModal(slotCall);
                                }}
                              />
                            ) : (
                              // Open slot: "Open" + role badge — matches the occupied card's layout
                              <div className="flex h-full w-full items-center gap-1 overflow-hidden px-0.5">
                                <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-slate-400">
                                  Open
                                </span>
                                <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold leading-none opacity-60 ${getRoleBadgeClass(item.slot.key)}`}>
                                  {getSlotRoleLabel(item.slot.key)}
                                </span>
                              </div>
                            )}
                          </SlotDropZone>
                        );
                      })}
                    </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  </div>
</div>

          <DragOverlay>
            {deleteMode ? null : activeDragCall ? (
              (() => {
                const c = getResidentColorClasses(
                  activeDragCall.rosterId ?? activeDragCall.membershipId
                );
                return (
                  <div className={`w-[220px] rounded-lg border-2 px-3 py-2.5 shadow-2xl ${c.bg} ${c.border}`}>
                    <div className="mb-1 flex items-center gap-1.5">
                      <p className={`flex-1 text-[15px] font-bold leading-tight ${c.text}`}>
                        {activeDragCall.residentName?.trim() || "Unknown"}
                      </p>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${getRoleBadgeClass(activeDragCall.callType)}`}>
                        {getSlotRoleLabel(activeDragCall.callType)}
                      </span>
                    </div>
                    {activeDragCall.trainingLevel ? (
                      <p className="text-[10px] text-slate-500">{activeDragCall.trainingLevel}</p>
                    ) : null}
                  </div>
                );
              })()
            ) : activeDragResident ? (
              (() => {
                const c = getResidentColorClasses(activeDragResident.rosterId);
                return (
                  <div className={`w-[220px] rounded-lg border-2 px-3 py-2.5 shadow-2xl ${c.bg} ${c.border}`}>
                    <p className={`text-[15px] font-bold leading-tight ${c.text}`}>
                      {activeDragResident.residentName?.trim() || "Unknown"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {activeDragResident.currentRotationLabel ?? activeDragResident.trainingLevel ?? "Resident"}
                    </p>
                  </div>
                );
              })()
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {activeSlotAction?.type === "create" ? "Assign Call" : "Replace Call"}
                </p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                  {activeSlotAction?.type === "create"
                    ? `Assign ${modalCallType}`
                    : "Replace resident"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {activeSlotAction?.type === "replace" && activeCall
                    ? `${activeCall.residentName} • ${activeCall.callType ?? "Call"} • ${formatShortDate(activeCall.callDate)}`
                    : activeSlotAction?.type === "create"
                    ? `${modalCallType} • ${formatShortDate(activeSlotAction.dateKey)}`
                    : "No slot selected"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {activeSlotAction?.type === "create"
                  ? "Assign resident"
                  : "Replace with resident"}
              </label>

              {modalPickerEligibility?.groups.length ? (
                <div className="max-h-72 space-y-4 overflow-y-auto rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                  {modalPickerEligibility.groups.map((group) => (
                    <div key={group.label}>
                      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {group.label}
                      </p>
                      <div className="space-y-2">
                        {group.residents.map(({ resident, warnings }) => {
                          const isSelected = targetRosterId === resident.rosterId;
                          const warningMessage = warnings[0]?.message ?? null;

                          return (
                            <button
                              key={resident.rosterId}
                              type="button"
                              onClick={() => setTargetRosterId(resident.rosterId)}
                              title={warningMessage ?? undefined}
                              className={`flex w-full items-center justify-between gap-3 rounded-[0.9rem] border px-3 py-2.5 text-left transition ${
                                isSelected
                                  ? "border-amber-300 bg-amber-50"
                                  : warnings.length > 0
                                  ? "border-amber-200 bg-amber-50/70 hover:bg-amber-50"
                                  : "border-slate-200 bg-white hover:border-amber-200 hover:bg-white"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {resident.residentName}
                                </p>
                                {warningMessage ? (
                                  <p className="mt-0.5 text-xs text-amber-700">
                                    {warningMessage}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {warnings.length > 0 ? (
                                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                                    Warning
                                  </span>
                                ) : null}
                                {isSelected ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                                    <Check className="h-3 w-3" />
                                    Selected
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <UserRound className="mx-auto h-7 w-7 text-slate-400" />
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    No eligible residents
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {modalPickerEligibility?.emptyStateMessage ??
                      "No residents can be assigned to this slot with the current schedule and rules."}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAssignment}
                disabled={!targetRosterId || working}
                className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PencilLine className="h-4 w-4" />
                {working
                  ? "Saving..."
                  : `${
                      activeSlotAction?.type === "create" ? "Assign" : "Replace"
                    }${switchTargetResident ? ` → ${switchTargetResident.residentName}` : ""}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Confirm Delete
                </p>
                <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-950">
                  Delete selected call assignments?
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {deleteSelectedCallIds.length} assignment{deleteSelectedCallIds.length === 1 ? "" : "s"} will be added to your pending deletions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {selectedDeleteAssignments.map(({ slotId, call, slot }) => (
                <div
                  key={slotId}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {call.residentName?.trim() || "Unknown"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatShortDate(slot.dateKey)} • {normalizeCallType(slot.callType)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-rose-700">
                    Delete
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteSelection}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete assignments
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
