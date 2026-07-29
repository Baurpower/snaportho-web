/**
 * Call Hub Policy Engine — predicate evaluation.
 *
 * `evalPredicate` walks a Predicate tree against the SchedulingContext facts for a
 * (resident, date) subject. This is the ONE place predicate semantics live; every
 * consumer reaches them through the evaluator. Adding a new predicate kind means a
 * new `case` here (and a new variant in types.ts) — nothing else changes.
 */
import type { DraftDayAssignment } from "@/components/workspace/call/programcalltypes";
import type { SchedulingContext } from "@/lib/workspace/call/policy/context";
import { normalizeServiceName } from "@/lib/workspace/call/policy/context";
import type {
  EligibilityTier,
  Predicate,
  PredicateOp,
} from "@/lib/workspace/call/policy/types";

export type PredicateSubject = { residentId: string; dateKey: string };

const SLOT_ROSTER_FIELD: Record<string, keyof DraftDayAssignment> = {
  Primary: "primaryRosterId",
  Backup: "backupRosterId",
  Buddy: "buddyRosterId",
};

function compareOp(actual: number, op: PredicateOp, n: number): boolean {
  switch (op) {
    case "eq":
      return actual === n;
    case "ne":
      return actual !== n;
    case "gte":
      return actual >= n;
    case "lte":
      return actual <= n;
    case "gt":
      return actual > n;
    case "lt":
      return actual < n;
  }
}

function dayOfWeek(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00`).getDay();
}

export function evalPredicate(
  predicate: Predicate,
  subject: PredicateSubject,
  ctx: SchedulingContext
): boolean {
  const { residentId, dateKey } = subject;

  switch (predicate.kind) {
    case "always":
      return true;
    case "never":
      return false;

    case "pgyIn": {
      const pgy = ctx.pgyOf(residentId, dateKey);
      return pgy !== null && predicate.years.includes(pgy);
    }

    case "onService": {
      const tokens = predicate.tokens.map(normalizeServiceName);
      return ctx.rotationsOn(residentId, dateKey).some((r) => {
        const normalized = normalizeServiceName(r.name);
        return normalized !== "" && tokens.some((t) => normalized.includes(t));
      });
    }

    case "onRotationId": {
      const ids = new Set(predicate.rotationIds);
      return ctx
        .rotationsOn(residentId, dateKey)
        .some((r) => r.id !== null && ids.has(r.id));
    }

    case "serviceMonthIndex": {
      const index = ctx.serviceMonthIndex(residentId, dateKey, predicate.tokens);
      // Index 0 means "not on the service that date" — never satisfies a positive
      // comparison; treat it as no-match rather than a numeric 0.
      if (index === 0) return false;
      return compareOp(index, predicate.op, predicate.n);
    }

    case "dayOfWeekIn":
      return predicate.days.includes(dayOfWeek(dateKey));

    case "slotOccupantPgyIn": {
      const field = SLOT_ROSTER_FIELD[predicate.slot];
      if (!field) return false;
      const occupantId = ctx.assignmentOn(dateKey)?.[field] ?? null;
      if (!occupantId) return false;
      const pgy = ctx.pgyOf(occupantId, dateKey);
      return pgy !== null && predicate.years.includes(pgy);
    }

    case "availabilityClear":
      return ctx.isAvailabilityClear(residentId, dateKey);

    case "and":
      return predicate.of.every((p) => evalPredicate(p, subject, ctx));
    case "or":
      return predicate.of.some((p) => evalPredicate(p, subject, ctx));
    case "not":
      return !evalPredicate(predicate.of, subject, ctx);
  }
}

/**
 * Return the lowest-`preference` tier whose predicate matches the subject, or null.
 * Ties broken by original order. Fallback tiers have higher `preference`.
 */
export function firstMatchingTier(
  tiers: EligibilityTier[],
  subject: PredicateSubject,
  ctx: SchedulingContext
): EligibilityTier | null {
  let best: EligibilityTier | null = null;
  for (const tier of tiers) {
    if (!evalPredicate(tier.predicate, subject, ctx)) continue;
    if (best === null || tier.preference < best.preference) best = tier;
  }
  return best;
}
