import type {
  CalendarDay,
  DraftDayAssignment,
  ExistingResidentStats,
  ProgramAvailabilityMonthResponse,
  ProgramRule,
  QuickAssignSlotMode,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";
import type { ProgramCallSlotDefinition } from "@/lib/workspace/call/rule-definitions";
import { generateCallSchedule } from "@/components/workspace/call/programcallautogenerator";

/**
 * Phase 3 worker protocol.
 *
 * `generateCallSchedule` takes `CalendarDay[]`, and each `CalendarDay` carries a
 * live `Date` object. `Date` survives `structuredClone` but the pure worker code
 * must not depend on Date identity, so we send a plain `CalendarDaySnapshot`
 * (derived entirely from the date key) across the worker boundary and rebuild the
 * `CalendarDay` on the other side.
 *
 * `runGenerateRequest` is the exact function the worker's `onmessage` handler
 * calls. Keeping it here (not inside the worker file) makes the whole
 * request → response path unit-testable without a Worker runtime; the worker
 * becomes a thin postMessage wrapper.
 */

export type CalendarDaySnapshot = {
  key: string;
  dayNumber: number;
  dayName: string;
  isWeekend: boolean;
};

export function toCalendarDaySnapshot(day: CalendarDay): CalendarDaySnapshot {
  return {
    key: day.key,
    dayNumber: day.dayNumber,
    dayName: day.dayName,
    isWeekend: day.isWeekend,
  };
}

/** Rebuild a full CalendarDay (including its Date) from a serializable snapshot. */
export function calendarDayFromSnapshot(snapshot: CalendarDaySnapshot): CalendarDay {
  return {
    date: new Date(`${snapshot.key}T00:00:00`),
    key: snapshot.key,
    dayNumber: snapshot.dayNumber,
    dayName: snapshot.dayName,
    isWeekend: snapshot.isWeekend,
  };
}

/** Serializable payload for a generation request (worker-boundary safe). */
export type GenerateRequestPayload = {
  requestId: string;
  monthDays: CalendarDaySnapshot[];
  residents: ResidentOption[];
  existingAssignments: Record<string, DraftDayAssignment>;
  rules: ProgramRule[];
  slotDefinitions?: ProgramCallSlotDefinition[];
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"];
  historicalStats: ExistingResidentStats[];
  slotMode?: QuickAssignSlotMode;
  generationVersion?: number;
  forceRegenerate?: boolean;
  enableLocalSearch?: boolean;
  localSearchMaxIterations?: number;
  useCallPolicyV2?: boolean;
};

/** Serializable response payload (worker-boundary safe). */
export type GenerateResponsePayload = {
  requestId: string;
  assignments: Record<string, DraftDayAssignment>;
  stats: ReturnType<typeof generateCallSchedule>["stats"];
  generationReport: ReturnType<typeof generateCallSchedule>["generationReport"];
};

/** Message envelopes for the eventual Web Worker (main-thread ⇄ worker). */
export type GenerateWorkerRequest = {
  kind: "generate";
} & GenerateRequestPayload;

export type GenerateWorkerResponse =
  | ({ kind: "result" } & GenerateResponsePayload)
  | { kind: "error"; requestId: string; message: string };

/**
 * Runs a serialized generation request end-to-end: reconstruct CalendarDays,
 * call the generator, return a serializable response. Pure — no Worker, no DOM.
 */
export function runGenerateRequest(
  payload: GenerateRequestPayload
): GenerateResponsePayload {
  const monthDays = payload.monthDays.map(calendarDayFromSnapshot);

  const result = generateCallSchedule({
    monthDays,
    residents: payload.residents,
    existingAssignments: payload.existingAssignments,
    rules: payload.rules,
    slotDefinitions: payload.slotDefinitions,
    availabilityByResident: payload.availabilityByResident,
    historicalStats: payload.historicalStats,
    slotMode: payload.slotMode,
    generationVersion: payload.generationVersion,
    forceRegenerate: payload.forceRegenerate,
    enableLocalSearch: payload.enableLocalSearch,
    localSearchMaxIterations: payload.localSearchMaxIterations,
    useCallPolicyV2: payload.useCallPolicyV2,
  });

  return {
    requestId: payload.requestId,
    assignments: result.assignments,
    stats: result.stats,
    generationReport: result.generationReport,
  };
}
