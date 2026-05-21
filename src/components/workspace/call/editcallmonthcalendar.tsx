"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
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
  Clock3,
  GripVertical,
  PencilLine,
  PhoneCall,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type { ProgramCallItem } from "./callmonthcalendar";
import {
  type CallValidationResident,
  type CallValidationIssue,
  type CallValidationResult,
  type CallDraftAssignment,
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

type ResidentOption = {
  rosterId: string;
  programMembershipId: string | null;
  residentName: string;
  trainingLevel: string | null;
};

function buildValidationResidents(
  residents: ResidentOption[]
): CallValidationResident[] {
  return residents.map((resident) => ({
    residentId: resident.rosterId,
    membershipId: resident.rosterId,
    rosterId: resident.rosterId,
    programMembershipId: resident.programMembershipId,
    residentName: resident.residentName,
    displayName: resident.residentName,
    trainingLevel: resident.trainingLevel,
  }));
}

export type ProgramCallSlot = {
  key: string;
  label: string;
  color?: string;
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
  kind: "call";
  call: ProgramCallItem;
  sourceSlotId: string;
};

type DragResidentData = {
  kind: "resident";
  resident: ResidentOption;
};

type SlotDroppableData = {
  kind: "slot";
  slotId: string;
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

function getCallTone(call: ProgramCallItem) {
  if (call.isMine) {
    return {
      card: "border-sky-300 bg-sky-50",
      chip: "bg-sky-600 text-white",
      text: "text-sky-950",
    };
  }

  if (call.isHomeCall) {
    return {
      card: "border-violet-200 bg-violet-50",
      chip: "bg-violet-600 text-white",
      text: "text-violet-950",
    };
  }

  return {
    card: "border-slate-200 bg-slate-50",
    chip: "bg-slate-900 text-white",
    text: "text-slate-900",
  };
}

function formatShortDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatCompactResidentName(name: string | null | undefined) {
  const parts =
    name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean) ?? [];

  if (parts.length <= 1) return name?.trim() || "Unknown";

  const firstInitial = parts[0]?.[0]?.toUpperCase();
  const lastName = parts[parts.length - 1];

  if (!firstInitial || !lastName) return name?.trim() || "Unknown";
  return `${firstInitial}. ${lastName}`;
}

function formatSlotShortLabel(label: string | null | undefined) {
  const normalized = normalizeCallType(label);
  const lower = normalized.toLowerCase();

  if (lower === "primary") return "1°";
  if (lower === "backup") return "2°";

  return normalized.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "SLT";
}

function normalizeSlotKey(value: string | null | undefined) {
  return normalizeCallType(value).toLowerCase();
}

function getDefaultCallSlots(calls: ProgramCallItem[]) {
  const hasBackup = calls.some(
    (call) => normalizeSlotKey(call.callType) === "backup"
  );

  return [
    {
      key: "Primary",
      label: "Primary",
      color: "amber",
    },
    ...(hasBackup
      ? [
          {
            key: "Backup",
            label: "Backup",
            color: "sky",
          },
        ]
      : []),
  ];
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

function buildDraftAssignmentsFromSlotMap(
  slotMap: Map<string, ProgramCallItem | null>
): CallDraftAssignment[] {
  const assignments: CallDraftAssignment[] = [];

  for (const [slotId, call] of slotMap.entries()) {
    if (!call) continue;

    assignments.push({
      id: call.id,
      callId: call.id,
      rosterId: call.rosterId ?? call.membershipId ?? null,
      programMembershipId: call.programMembershipId ?? null,
      residentName: call.residentName,
      trainingLevel: call.trainingLevel,
      callDate: call.callDate,
      callType: call.callType,
      startDatetime: call.startDatetime,
      endDatetime: call.endDatetime,
      slotId,
    });
  }

  return assignments;
}

function DraggableCallCard({
  call,
  slotId,
  onClick,
  disabled,
}: {
  call: ProgramCallItem;
  slotId: string;
  onClick: () => void;
  disabled: boolean;
}) {
  const tone = getCallTone(call);
  const slotBadge = formatSlotShortLabel(call.callType);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `call:${call.id}`,
      data: {
        kind: "call",
        call,
        sourceSlotId: slotId,
      } satisfies DragCallData,
      disabled,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
  };
  const dragProps = disabled
    ? {}
    : {
        ...attributes,
        ...listeners,
      };

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      {...dragProps}
      className={[
        "flex h-full w-full min-h-0 max-w-full items-center gap-1.5 overflow-hidden rounded-md border px-1.5 py-1 text-left transition",
        tone.card,
        disabled
          ? "cursor-default opacity-70"
          : "cursor-grab active:cursor-grabbing hover:border-amber-300",
        isDragging ? "opacity-40 shadow-lg" : "",
      ].join(" ")}
    >
      <div className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold leading-none ${tone.chip}`}>
        {slotBadge}
      </div>

      <div className="min-w-0 flex-1 truncate">
        <p className={`truncate text-[10px] font-semibold leading-4 md:text-[11px] ${tone.text}`}>
          {formatCompactResidentName(call.residentName)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {call.trainingLevel ? (
          <span className="hidden shrink-0 text-[9px] leading-3 text-slate-500 xl:inline">
            {call.trainingLevel}
          </span>
        ) : null}
        {!isEditableQuickCall(call) ? (
          <Clock3 className="h-2.5 w-2.5 shrink-0 text-slate-400" />
        ) : null}
        <GripVertical className="h-3 w-3 shrink-0 text-slate-400" />
      </div>
    </button>
  );
}

function DraggableResidentCard({
  resident,
  count,
  validationIssues,
  disabled,
}: {
  resident: ResidentOption;
  count: number;
  validationIssues: CallValidationIssue[];
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `resident:${resident.rosterId}`,
      data: {
        kind: "resident",
        resident,
      } satisfies DragResidentData,
      disabled,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
  };
  const dragProps = disabled
    ? {}
    : {
        ...attributes,
        ...listeners,
      };
  const residentIssueSeverity = getWorstValidationSeverity(validationIssues);
  const residentIssueClass =
    residentIssueSeverity === "error"
      ? "ring-1 ring-rose-200 border-rose-200 bg-rose-50/60"
      : residentIssueSeverity === "warning"
      ? "ring-1 ring-amber-200 border-amber-200 bg-amber-50/60"
      : "";
  const residentIssueTitle = getValidationTooltip(validationIssues);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragProps}
      title={residentIssueTitle}
      className={`rounded-md border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition ${
        disabled
          ? "cursor-default opacity-70"
          : "cursor-grab hover:border-amber-300 hover:shadow-md active:cursor-grabbing"
      } ${residentIssueClass} ${isDragging ? "opacity-40 shadow-lg" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold leading-4 text-slate-950">
            {formatCompactResidentName(resident.residentName)}
          </p>
          <p className="mt-0.5 text-[10px] leading-3 text-slate-500">
            {resident.trainingLevel ?? "Resident"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {validationIssues.length > 0 ? (
            <span
              title={residentIssueTitle}
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${
                residentIssueSeverity === "error"
                  ? "bg-rose-600 text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              {validationIssues.length}
            </span>
          ) : null}
          <div className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-600">
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
}) {
  const canDrop =
    inMonth &&
    !deleteMode &&
    (!call || isEditableQuickCall(call));
  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
    data: {
      kind: "slot",
      slotId,
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
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={[
        "relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md border px-1.5 py-1 text-left transition",
        call
          ? "border-slate-200 bg-white hover:border-amber-300"
          : "border-dashed border-slate-200 bg-slate-50/80",
        !call && canDrop ? "cursor-pointer hover:border-amber-300 hover:bg-amber-50/60" : "",
        !call && !canDrop ? "cursor-default opacity-70" : "",
        deleteMode && call && isEditableQuickCall(call)
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
    </button>
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
  const resolvedCallSlots = useMemo(
    () => (callSlots && callSlots.length > 0 ? callSlots : getDefaultCallSlots(calls)),
    [callSlots, calls]
  );
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
  const draftAssignments = useMemo(
    () => buildDraftAssignmentsFromSlotMap(slotMap),
    [slotMap]
  );
  const validationResidents = useMemo(
    () => buildValidationResidents(residents),
    [residents]
  );
  const draftValidation = useMemo(
    () =>
      validateCallMonthDraft({
        assignments: draftAssignments,
        residents: validationResidents,
      }),
    [draftAssignments, validationResidents]
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
        const items = resolvedCallSlots.map((slot) => {
          const slotId = serializeSlotId({
            dateKey,
            callType: slot.key,
          });

          return {
            slot,
            slotId,
            call: slotMap.get(slotId) ?? null,
            inMonth: isSameMonth(date, year, monthIndex),
            isToday: dateKey === todayKey,
          };
        });

        map.set(dateKey, items);
      }
    }

    return map;
  }, [monthIndex, resolvedCallSlots, slotMap, todayKey, weeks, year]);

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
    const selectedSlots = selectedDeleteAssignments.filter(({ call }) =>
      isEditableQuickCall(call)
    );

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
  }

  async function handleSaveChanges() {
    if (!hasPendingChanges) return;
    if (draftValidation.hasErrors) {
      setLocalError("Fix blocking schedule errors before saving.");
      return;
    }

    const slotMapSnapshot = new Map(slotMap);
    const pendingSnapshot = [...pendingChanges];

    try {
      setWorking(true);
      setLocalError(null);

      if (process.env.NODE_ENV !== "production") {
        console.info("[edit-mode-call-save]", {
          source: "edit-mode",
          pendingChanges: pendingSnapshot.map((change) => ({
            kind: change.kind,
            residentName:
              "resident" in change ? change.resident.residentName : null,
            rosterId: "resident" in change ? change.resident.rosterId : null,
            programMembershipId:
              "resident" in change ? change.resident.programMembershipId : null,
            slot:
              "slot" in change
                ? change.slot
                : "targetSlotId" in change
                ? deserializeSlotId(change.targetSlotId)
                : null,
          })),
          loadedResidentCount: validationResidents.length,
          loadedResidentIds: validationResidents.map((resident) => resident.rosterId),
          timestamp: new Date().toISOString(),
        });
      }

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

      const committedBaseline = new Map(slotMapSnapshot);
      setBaselineSlotMap(committedBaseline);
      clearServerValidation();
      setPendingChanges([]);
      setDeleteSelectedCallIds([]);
      setDeleteMode(false);
      setShowDeleteConfirm(false);
    } catch (err) {
      const serverValidation = getCallMutationValidation(err);

      if (serverValidation) {
        setServerValidationResult(serverValidation);
        setLocalError(
          "Server rejected this schedule. Review the highlighted conflicts below."
        );
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

        if (!isEditableQuickCall(selectedCall)) {
          throw new Error("This timed call should be edited from the full call editor.");
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
    if (!isEditableQuickCall(call)) {
      setLocalError("Timed calls should be edited in the full workflow.");
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

    if (!overData.canDrop) return;

    if (sourceData.kind === "call") {
      const sourceCall = sourceData.call;
      const sourceSlotId = sourceData.sourceSlotId;

      if (sourceSlotId === overData.slotId) return;
      if (!isEditableQuickCall(sourceCall)) return;

      if (overData.call) {
        if (!isEditableQuickCall(overData.call)) return;
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

    if (overData.call) {
      if (!isEditableQuickCall(overData.call)) return;
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

    if (data.kind === "call") {
      setActiveDragCall(data.call);
      setActiveDragResident(null);
      return;
    }

    setActiveDragCall(null);
    setActiveDragResident(data.resident);
  }

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
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
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
      <div className="sticky top-0 z-20 mb-1 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {pendingChanges.length} pending changes
        </span>
        <button
          type="button"
          onClick={() => void handleSaveChanges()}
          disabled={!hasPendingChanges || working || draftValidation.hasErrors}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PencilLine className="h-3.5 w-3.5" />
          {working ? "Saving..." : "Save changes"}
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
        {deleteMode && deleteSelectedCallIds.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete selected ({deleteSelectedCallIds.length})
          </button>
        ) : null}
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
                ? "Fix errors before saving"
                : "Warnings will not block save"}
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
              const dayItems = slotItemsByDate.get(dateKey) ?? [];
              const dayCallCount = dayItems.filter((item) => !!item.call).length;

              return (
                <div
                  key={dateKey}
                  className={[
                    "flex h-[90px] min-h-0 flex-col overflow-hidden rounded-md border px-1 py-0.5 text-left transition md:h-[96px] xl:h-[104px]",
                    inMonth
                      ? "border-slate-200 bg-white"
                      : "border-transparent bg-slate-50/60",
                    isToday && inMonth ? "ring-2 ring-amber-300" : "",
                    selectedDateKey === dateKey ? "ring-2 ring-sky-300" : "",
                  ].join(" ")}
                >
                  <div className="mb-0.5 flex items-start justify-between gap-1">
                    <span
                      className={[
                        "text-[10px] font-semibold",
                        inMonth ? "text-slate-700" : "text-slate-300",
                      ].join(" ")}
                    >
                      {date.getDate()}
                    </span>

                    <div className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-1 py-0.5 text-[8px] font-bold text-white shadow-sm">
                      <PhoneCall className="h-2.5 w-2.5" />
                      {dayCallCount}
                    </div>
                  </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                      {dayItems.map((item) => {
                        const slotKey = normalizeCallType(item.slot.key);
                        const slotCall = item.call;
                        const slotBadge = formatSlotShortLabel(item.slot.key);
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
                            onClick={() => {
                              setSelectedDateKey(dateKey);

                              if (item.call) {
                                if (deleteMode) {
                                  if (isEditableQuickCall(item.call)) {
                                    toggleDeleteSelection(item.call.id);
                                  } else {
                                    setLocalError(
                                      "Timed calls should be edited in the full workflow."
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
                                disabled={
                                  deleteMode ||
                                  working ||
                                  !isEditableQuickCall(slotCall)
                                }
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
                              <div className="flex h-full min-h-0 items-center gap-1.5 overflow-hidden">
                                <div className="shrink-0 rounded bg-slate-200 px-1 py-0.5 text-[9px] font-bold leading-none text-slate-700">
                                  {slotBadge}
                                </div>
                                <div className="min-w-0 flex-1 truncate text-[10px] font-medium text-slate-400">
                                  Open
                                </div>
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
              <div
                className={`w-[200px] rounded-lg border px-2.5 py-2 shadow-2xl ${getCallTone(
                  activeDragCall
                ).card}`}
              >
                <p
                  className={`truncate text-sm font-semibold ${getCallTone(activeDragCall).text}`}
                >
                  {formatCompactResidentName(activeDragCall.residentName)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {activeDragCall.trainingLevel ?? activeDragCall.callType ?? "Call"}
                </p>
              </div>
            ) : activeDragResident ? (
              <div className="w-[200px] rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-2xl">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {formatCompactResidentName(activeDragResident.residentName)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {activeDragResident.trainingLevel ?? "Resident"}
                </p>
              </div>
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
              <select
                value={targetRosterId}
                onChange={(e) => setTargetRosterId(e.target.value)}
                className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-300"
              >
                <option value="">Select resident</option>
                {residents.map((resident) => (
                  <option key={resident.rosterId} value={resident.rosterId}>
                    {resident.residentName}
                    {resident.trainingLevel ? ` • ${resident.trainingLevel}` : ""}
                  </option>
                ))}
              </select>
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
                      {formatCompactResidentName(call.residentName)}
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
