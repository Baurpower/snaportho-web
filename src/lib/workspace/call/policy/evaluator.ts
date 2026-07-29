/**
 * Call Hub Policy Engine — evaluateSlot (the single evaluator).
 *
 * Returns everything a consumer needs about a (resident, slot, date): whether the
 * slot is present/required that day, the best eligibility tier the resident
 * qualifies for, hard blocks and soft warnings, and cross-slot pairing status.
 *
 * Phase-1 design note: the POOL decision comes from the compiled eligibility tiers
 * (replacing evaluatePgyEligibility); every OTHER hard/soft constraint is computed
 * by reusing the exact pure functions in rule-evaluator.ts, orchestrated identically
 * to programcallevaluator.evaluateResidentForSlot. This keeps `eligible` bit-for-bit
 * equal to today's `.allowed` (verified by policy-parity.test.ts) while presence,
 * tiering, and pairing are the new expressive layers. Later phases migrate the
 * remaining globals into predicates and delete programcallevaluator.
 */
import type {
  DraftDayAssignment,
  ResidentAvailabilityForDate,
  ResidentAvailabilityMap,
  ResidentOption,
  RuleEvaluationBlock,
} from "@/components/workspace/call/programcalltypes";
import type { SchedulingContext } from "@/lib/workspace/call/policy/context";
import { evalPredicate, firstMatchingTier } from "@/lib/workspace/call/policy/predicates";
import type {
  CallPolicy,
  PairingResult,
  SlotEvaluation,
  SlotPolicy,
} from "@/lib/workspace/call/policy/types";
import {
  countUniqueWeekendBuckets,
  evaluateDayOfWeekPreferenceForResident,
  evaluateMonthlyLimitForResident,
  evaluateMonthlyLoadTargetForResident,
  evaluateRotationCallLimitForResident,
  evaluateRotationEligibility,
  evaluateSpacingForResident,
  evaluateWeekendLimitForResident,
  evaluateWeekendPairingForResident,
  getAdjacentWeekendDateKey,
  getWeekendBucket,
  isWeekendDateKey,
  type RuleLike,
  type RuleViolation,
} from "@/lib/workspace/call/rule-evaluator";

const SLOT_ROSTER_FIELD: Record<string, keyof DraftDayAssignment> = {
  Primary: "primaryRosterId",
  Backup: "backupRosterId",
  Buddy: "buddyRosterId",
};

// ── Availability blocks/warnings (mirrors programcallevaluator private helpers) ──

function availabilityBlocks(
  availability: ResidentAvailabilityForDate | null
): RuleEvaluationBlock[] {
  if (!availability) return [];
  const approved = availability.timeOffConflicts.filter(
    (c) => c.approvalStatus === "approved"
  );
  return approved.map((c) => ({
    ruleType: "time_off",
    ruleName: "Approved time off",
    message: c.title ? `Approved time off: ${c.title}` : "Approved time off",
    isHardRule: true,
  }));
}

function availabilityWarnings(
  availability: ResidentAvailabilityForDate | null
): RuleEvaluationBlock[] {
  if (!availability) return [];
  const requested = availability.timeOffConflicts.filter(
    (c) => c.approvalStatus === "requested"
  );
  return requested.map((c) => ({
    ruleType: "time_off",
    ruleName: "Requested time off",
    message: c.title ? `Requested time off: ${c.title}` : "Requested time off",
    isHardRule: false,
  }));
}

// ── Assignment helpers (mirror programcallevaluator) ──

function getAssignedDatesForResident(
  residentId: string,
  assignments: Record<string, DraftDayAssignment>
): string[] {
  return Object.entries(assignments)
    .filter(
      ([, a]) =>
        a?.primaryRosterId === residentId ||
        a?.backupRosterId === residentId ||
        a?.buddyRosterId === residentId
    )
    .map(([dateKey]) => dateKey)
    .sort();
}

function countSlotAssignments(
  residentId: string,
  slot: string,
  assignments: Record<string, DraftDayAssignment>
): number {
  const field = SLOT_ROSTER_FIELD[slot];
  if (!field) return 0;
  return Object.values(assignments).filter((a) => a?.[field] === residentId).length;
}

function blockFromViolation(violation: RuleViolation<RuleLike>): RuleEvaluationBlock {
  return {
    ruleId: violation.rule.id ?? null,
    ruleType: violation.rule.rule_type ?? "rule",
    ruleName: violation.rule.name ?? violation.rule.rule_type ?? "rule",
    message: violation.message,
    isHardRule: violation.severity === "error",
  };
}

// ── Presence / requiredness (day-level; candidate resident is irrelevant) ──

export function evaluateSlotPresence(
  policy: CallPolicy,
  slot: string,
  dateKey: string,
  ctx: SchedulingContext
): { present: boolean; required: boolean; slotPolicy: SlotPolicy | null } {
  const slotPolicy = policy.slots.find((s) => s.callType === slot) ?? null;
  if (!slotPolicy) return { present: false, required: false, slotPolicy: null };
  const subject = { residentId: "", dateKey };
  const present = evalPredicate(slotPolicy.present, subject, ctx);
  const required = present && evalPredicate(slotPolicy.required, subject, ctx);
  return { present, required, slotPolicy };
}

// ── Pairing ──

function evaluatePairing(
  slotPolicy: SlotPolicy,
  dateKey: string,
  ctx: SchedulingContext
): PairingResult {
  const violations: RuleEvaluationBlock[] = [];
  const warnings: RuleEvaluationBlock[] = [];

  for (const constraint of slotPolicy.pairing) {
    const field = SLOT_ROSTER_FIELD[constraint.otherSlot];
    if (!field) continue;
    const otherOccupantId = ctx.assignmentOn(dateKey)?.[field] ?? null;
    // Can't verify a pairing until the partner slot is filled — not a violation yet.
    if (!otherOccupantId) continue;

    const ok = evalPredicate(
      constraint.predicate,
      { residentId: otherOccupantId, dateKey },
      ctx
    );
    if (ok) continue;

    const block: RuleEvaluationBlock = {
      ruleType: "pairing",
      ruleName: `${slotPolicy.callType} pairing`,
      message:
        constraint.message ??
        `${slotPolicy.callType} partner in ${constraint.otherSlot} does not satisfy the pairing rule.`,
      isHardRule: constraint.severity === "hard",
    };
    if (constraint.severity === "hard") violations.push(block);
    else warnings.push(block);
  }

  return { ok: violations.length === 0, violations, warnings };
}

// ── The evaluator ──

export function evaluateSlot(params: {
  resident: ResidentOption;
  slot: string;
  dateKey: string;
  ctx: SchedulingContext;
  policy: CallPolicy;
  assignments: Record<string, DraftDayAssignment>;
  availabilityByResident: ResidentAvailabilityMap;
}): SlotEvaluation {
  const { resident, slot, dateKey, ctx, policy, assignments, availabilityByResident } =
    params;

  const residentId = resident.residentId;
  const rules = policy.rules as RuleLike[];
  const subject = { residentId, dateKey };

  const { present, required, slotPolicy } = evaluateSlotPresence(
    policy,
    slot,
    dateKey,
    ctx
  );

  const blocks: RuleEvaluationBlock[] = [];
  const warnings: RuleEvaluationBlock[] = [];

  // (1) Pool eligibility via compiled tiers (replaces evaluatePgyEligibility).
  const tier = slotPolicy
    ? firstMatchingTier(slotPolicy.eligibility, subject, ctx)
    : null;
  if (!slotPolicy || tier === null) {
    blocks.push({
      ruleType: "restrict_call_type_by_pgy",
      ruleName: `${slot} call pool`,
      message: `Resident is not in the ${slot} call pool.`,
      isHardRule: true,
    });
  } else if (tier.preference > 0 && tier.softLabel) {
    // Fallback tier used — surface as a soft note (never blocks).
    warnings.push({
      ruleType: "eligibility_tier",
      ruleName: `${slot} fallback`,
      message: tier.softLabel,
      isHardRule: false,
    });
  }

  // (2) Availability (approved time off = hard; requested = warning).
  const availability = availabilityByResident?.[residentId]?.[dateKey] ?? null;
  for (const b of availabilityBlocks(availability)) blocks.push(b);
  for (const w of availabilityWarnings(availability)) warnings.push(w);

  // ── Derivations shared by the reused global evaluators (mirror programcallevaluator) ──
  const assignedDates = getAssignedDatesForResident(residentId, assignments);
  const alreadyAssignedOnDate = assignedDates.includes(dateKey);
  const currentWeekendBucket = getWeekendBucket(dateKey);
  const alreadyAssignedInWeekendBucket =
    currentWeekendBucket !== null &&
    assignedDates.some((d) => getWeekendBucket(d) === currentWeekendBucket);
  const assignedWeekendCount = countUniqueWeekendBuckets(assignedDates);
  const adjacentDateKey = getAdjacentWeekendDateKey(dateKey);
  const adjacentAssignment = adjacentDateKey ? assignments[adjacentDateKey] : null;
  const adjacentResidentId =
    slot === "Primary"
      ? adjacentAssignment?.primaryRosterId ?? null
      : adjacentAssignment?.backupRosterId ?? null;
  const residentPgyYear = ctx.pgyOf(residentId, dateKey);
  const rotationConflictIds =
    availability?.rotationConflicts.map((c) => c.rotationId) ?? [];

  const route = (violations: RuleViolation<RuleLike>[]) => {
    for (const violation of violations) {
      const target = violation.rule.is_hard_rule ? blocks : warnings;
      target.push(blockFromViolation(violation));
    }
  };

  // (3) Spacing.
  route(
    evaluateSpacingForResident({
      assignedDates: assignedDates.filter((d) => d !== dateKey),
      dateKey,
      rules,
    })
  );

  // (4) Monthly limit.
  const projectedMonthCount = alreadyAssignedOnDate
    ? assignedDates.length
    : assignedDates.length + 1;
  route(evaluateMonthlyLimitForResident({ assignmentCount: projectedMonthCount, rules }));

  // (5) Weekend limit.
  const projectedWeekendCount = alreadyAssignedInWeekendBucket
    ? assignedWeekendCount
    : assignedWeekendCount + (currentWeekendBucket ? 1 : 0);
  route(
    evaluateWeekendLimitForResident({
      dateKey,
      weekendCount: projectedWeekendCount,
      rules,
    })
  );

  // (6) Rotation eligibility (restrict_call_by_rotation).
  route(
    evaluateRotationEligibility({
      rotationIds: rotationConflictIds,
      callType: slot as "Primary" | "Backup" | "Buddy",
      rules,
      residentPgyYear,
    })
  );

  // (7) Per-rotation call-day limit (only when on a rotation this date).
  if (rotationConflictIds.length > 0) {
    const isWeekend = isWeekendDateKey(dateKey);
    const weekendDates = assignedDates.filter((d) => isWeekendDateKey(d));
    const weekdayDates = assignedDates.filter((d) => !isWeekendDateKey(d));
    const projectedWeekendDays =
      isWeekend && !alreadyAssignedOnDate ? weekendDates.length + 1 : weekendDates.length;
    const projectedWeekdayDays =
      !isWeekend && !alreadyAssignedOnDate ? weekdayDates.length + 1 : weekdayDates.length;
    const projectedTotalDays = alreadyAssignedOnDate
      ? assignedDates.length
      : assignedDates.length + 1;
    route(
      evaluateRotationCallLimitForResident({
        rotationIds: rotationConflictIds,
        isWeekendDate: isWeekend,
        weekendCallDays: projectedWeekendDays,
        weekdayCallDays: projectedWeekdayDays,
        totalCallDays: projectedTotalDays,
        callType: slot as "Primary" | "Backup" | "Buddy",
        rules,
      })
    );
  }

  // (8) Weekend pairing.
  route(
    evaluateWeekendPairingForResident({
      residentId,
      adjacentResidentId,
      dateKey,
      callType: slot as "Primary" | "Backup" | "Buddy",
      rules,
    })
  );

  // (9) Monthly load target by PGY.
  if (slot === "Primary" || slot === "Backup" || slot === "Buddy") {
    const currentSlotCount = countSlotAssignments(residentId, slot, assignments);
    const projectedSlotCount = alreadyAssignedOnDate
      ? currentSlotCount
      : currentSlotCount + 1;
    route(
      evaluateMonthlyLoadTargetForResident({
        residentPgyYear,
        callType: slot,
        projectedCount: projectedSlotCount,
        rules,
      })
    );
  }

  // (10) Day-of-week preference (soft).
  route(
    evaluateDayOfWeekPreferenceForResident({
      dateKey,
      callType: slot as "Primary" | "Backup" | "Buddy",
      rotationIds: rotationConflictIds,
      residentPgyYear,
      rules,
    })
  );

  const pairing = slotPolicy
    ? evaluatePairing(slotPolicy, dateKey, ctx)
    : { ok: true, violations: [], warnings: [] };

  const hasHardBlock = blocks.length > 0;

  return {
    present,
    required,
    tier,
    tierPreference: tier?.preference ?? null,
    // `eligible` intentionally mirrors today's evaluateResidentForSlot.allowed:
    // pool + reused globals + availability. Pairing/presence are separate signals
    // consumers layer on (generator requires present && eligible && pairing.ok).
    eligible: !hasHardBlock,
    blocks,
    warnings,
    pairing,
  };
}

/** Convenience: hard-eligibility only (parity with isResidentAllowedForSlot). */
export function isResidentEligibleForSlot(params: {
  resident: ResidentOption;
  slot: string;
  dateKey: string;
  ctx: SchedulingContext;
  policy: CallPolicy;
  assignments: Record<string, DraftDayAssignment>;
  availabilityByResident: ResidentAvailabilityMap;
}): boolean {
  return evaluateSlot(params).eligible;
}
