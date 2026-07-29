/**
 * Call Hub Policy Engine — core types.
 *
 * A `CallPolicy` is the compiled, normalized description of how a program schedules
 * call. It is produced by `compilePolicy()` from the program's stored rules and read
 * by a single `evaluateSlot()` that every consumer (generator, validation, UI pickers,
 * swaps, AI packet) calls. See docs/call-hub-policy-engine.md.
 *
 * This module is pure types + no runtime logic, so it can be imported anywhere
 * (server, worker, browser, tests) without side effects.
 */
import type { RuleEvaluationBlock } from "@/components/workspace/call/programcalltypes";

// ── Predicates ──────────────────────────────────────────────────────────────

export type PredicateOp = "eq" | "ne" | "gte" | "lte" | "gt" | "lt";

/**
 * A composable condition over a (resident, date) subject with access to the
 * SchedulingContext facts and the current assignment snapshot. New kinds are added
 * here and in `evalPredicate` in one place, then are usable by every consumer.
 */
export type Predicate =
  | { kind: "always" }
  | { kind: "never" }
  /** Resident's effective PGY (at the date) is one of `years`. */
  | { kind: "pgyIn"; years: number[] }
  /** Resident is on a rotation whose normalized name contains one of `tokens` on this date. */
  | { kind: "onService"; tokens: string[] }
  /** Resident is on one of these rotation IDs (program_rotations.id) on this date. */
  | { kind: "onRotationId"; rotationIds: string[] }
  /**
   * 1-based index of this date's month among the resident's distinct months on a
   * `tokens`-matching service within the academic year (0 when not on service that
   * date), compared with `n` via `op`. e.g. `{tokens:["genortho"], op:"eq", n:1}`
   * = "first Gen-Ortho month".
   */
  | { kind: "serviceMonthIndex"; tokens: string[]; op: PredicateOp; n: number }
  /** The date's day-of-week (0=Sun … 6=Sat) is one of `days`. */
  | { kind: "dayOfWeekIn"; days: number[] }
  /** The resident currently occupying `slot` on this date has a PGY in `years`. */
  | { kind: "slotOccupantPgyIn"; slot: string; years: number[] }
  /** Resident has no approved time-off (and, when configured, no blocking rotation) on this date. */
  | { kind: "availabilityClear" }
  | { kind: "and"; of: Predicate[] }
  | { kind: "or"; of: Predicate[] }
  | { kind: "not"; of: Predicate };

// ── Slot policy ─────────────────────────────────────────────────────────────

/**
 * One eligibility tier for a slot. The evaluator picks the lowest-`preference`
 * tier whose predicate matches; higher-preference tiers are "fallbacks" that the
 * generator only uses when preferred tiers are infeasible and the UI shows under
 * an "if needed" heading. `preference: 0` is the primary pool.
 */
export type EligibilityTier = {
  predicate: Predicate;
  preference: number;
  /** Human label shown when a fallback tier is used, e.g. "Fallback: PGY-4 covering". */
  softLabel?: string;
};

/**
 * A constraint linking this slot's occupant to another slot's occupant on the same
 * date, e.g. Buddy's Primary partner must be PGY-4 or 5. `predicate` is evaluated
 * with the OTHER slot's occupant as the subject resident.
 */
export type PairingConstraint = {
  otherSlot: string;
  predicate: Predicate;
  severity: "hard" | "soft";
  /** Message surfaced when the constraint is violated. */
  message?: string;
};

export type SlotPolicy = {
  callType: string; // "Primary" | "Backup" | "Buddy" | custom
  /** Does this slot exist on a given day? (Replaces conditional slot visibility.) */
  present: Predicate;
  /** When present, must it be filled? (Drives generation + missing-slot flags.) */
  required: Predicate;
  /** Ordered eligibility tiers; the first (lowest-preference) match wins. */
  eligibility: EligibilityTier[];
  /** Cross-slot pairing constraints. */
  pairing: PairingConstraint[];
  countsTowardWorkload: boolean;
  sortOrder: number;
};

// ── Global (cross-slot) constraints ─────────────────────────────────────────

/**
 * Constraints that are not per-slot-eligibility. Phase 1 keeps these as normalized
 * config that the evaluator feeds into the existing (reused) rule-evaluator.ts
 * functions, guaranteeing parity with today. The raw enabled rules are retained so
 * those pure evaluators can be called without re-deriving config.
 */
export type PolicyGlobals = {
  buddy: {
    /**
     * HARD cap on buddy weekends per eligible intern per month. The generator must
     * never place more than this many buddy days for one intern; buddy is optional
     * up to the cap (not a required minimum). Default 2.
     */
    maxWeekendsPerInternMonth: number;
    /** Rotation-name tokens that make a resident buddy-eligible (service tokens). */
    serviceTokens: string[];
  };
};

/**
 * The compiled policy. `rules` are the enabled program rules, retained so the
 * evaluator can reuse the existing pure global evaluators for parity. As later
 * phases migrate globals into predicates, `rules` shrinks toward empty.
 */
export type CallPolicy = {
  version: number;
  slots: SlotPolicy[];
  globals: PolicyGlobals;
  /** Enabled program rules (source of truth for reused global evaluators). */
  rules: PolicyRule[];
};

/** Minimal shape the reused global evaluators need (mirrors ProgramRule). */
export type PolicyRule = {
  id?: string | null;
  rule_type: string;
  name?: string | null;
  is_enabled?: boolean;
  is_hard_rule?: boolean;
  config?: Record<string, unknown> | null;
};

// ── Evaluation results ──────────────────────────────────────────────────────

export type PairingResult = {
  ok: boolean;
  /** Hard-severity pairing violations (block the assignment). */
  violations: RuleEvaluationBlock[];
  /** Soft-severity pairing violations (warn only). */
  warnings: RuleEvaluationBlock[];
};

export type SlotEvaluation = {
  /** Whether the slot exists on this date at all. */
  present: boolean;
  /** Whether, being present, it must be filled. */
  required: boolean;
  /** Best (lowest-preference) tier the resident qualifies for, or null. */
  tier: EligibilityTier | null;
  tierPreference: number | null;
  /** True when the resident is in a tier AND has no hard blocks AND pairing ok. */
  eligible: boolean;
  /** Hard reasons the resident cannot take this slot (pool miss, time off, caps, pairing). */
  blocks: RuleEvaluationBlock[];
  /** Soft reasons (spacing, load target, fallback tier, day-of-week preference). */
  warnings: RuleEvaluationBlock[];
  pairing: PairingResult;
};
