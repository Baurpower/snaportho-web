/**
 * Call Hub Policy Engine — compile stored rules into a CallPolicy.
 *
 * Translates the program's existing `program_call_rules` (slot definitions, PGY call
 * pools, buddy requirement, load targets, spacing, caps, rotation restrictions) into
 * the normalized policy the evaluator reads. No DB migration is required: legacy rule
 * types compile into the new model, and the new expressiveness (fallback tiers,
 * temporal predicates, pairing sets) is authored on top. Global constraints that the
 * evaluator still computes via the reused rule-evaluator.ts functions are carried on
 * `policy.rules` rather than duplicated here.
 */
import type {
  ProgramCallSlotDefinition,
  ProgramRule,
  SlotCondition,
} from "@/components/workspace/call/programcalltypes";
import { extractSlotDefinitions } from "@/lib/workspace/call/rule-definitions";
import { resolveBuddyPolicy } from "@/lib/workspace/call/buddy-requirements";
import {
  getRequiredCallTypesFromRules,
  isRuleEnabled,
  normalizeCallTypeList,
  normalizeNumericList,
  resolveMatchingRules,
} from "@/lib/workspace/call/rule-evaluator";
import type {
  CallPolicy,
  EligibilityTier,
  PairingConstraint,
  Predicate,
  SlotPolicy,
} from "@/lib/workspace/call/policy/types";

const POLICY_VERSION = 1;

/** Day-of-week / condition → the slot's presence predicate. */
function slotPresencePredicate(def: ProgramCallSlotDefinition): Predicate {
  const base: Predicate =
    def.daysOfWeek && def.daysOfWeek.length > 0
      ? { kind: "dayOfWeekIn", days: def.daysOfWeek }
      : { kind: "always" };

  if (def.requiredMode === "always" || def.requiredMode === "optional") {
    return base;
  }

  // conditional
  const cond = def.condition;
  if (!cond) return { kind: "never" };
  const condPredicate = conditionToPredicate(cond);
  return { kind: "and", of: [base, condPredicate] };
}

function conditionToPredicate(cond: SlotCondition): Predicate {
  if (cond.type === "when_pgy_scheduled") {
    const sources =
      cond.sourceSlotCallTypes && cond.sourceSlotCallTypes.length > 0
        ? cond.sourceSlotCallTypes
        : ["Primary"];
    const terms: Predicate[] = sources.map((slot) => ({
      kind: "slotOccupantPgyIn",
      slot,
      years: cond.pgyYears,
    }));
    return terms.length === 1 ? terms[0] : { kind: "or", of: terms };
  }
  return { kind: "never" };
}

/**
 * Compile restrict_call_type_by_pgy rules into a single eligibility predicate for a
 * call type. A resident is pool-eligible for callType C iff, for every rule that
 * restricts their PGY and excludes C, their PGY is NOT in that rule's restricted set.
 * This reproduces evaluatePgyEligibility exactly (verified by policy-parity.test.ts).
 */
function poolEligibilityPredicate(callType: string, rules: ProgramRule[]): Predicate {
  const conjuncts: Predicate[] = [];

  for (const match of resolveMatchingRules(rules, [
    "restrict_call_type_by_pgy",
    "pgy_slot_restriction",
  ])) {
    const config = match.config;
    if (!Array.isArray(config.allowedCallTypes)) continue;
    const allowedCallTypes = normalizeCallTypeList(config.allowedCallTypes);
    const restrictedPgyYears = normalizeNumericList(config.restrictedPgyYears);
    if (restrictedPgyYears.length === 0) continue;

    const allowsNoCall = allowedCallTypes.length === 0;
    const slotAllowed = allowedCallTypes.includes(callType as never);
    // Rule only restricts C when it disallows C.
    if (!allowsNoCall && slotAllowed) continue;

    conjuncts.push({
      kind: "not",
      of: { kind: "pgyIn", years: restrictedPgyYears },
    });
  }

  if (conjuncts.length === 0) return { kind: "always" };
  if (conjuncts.length === 1) return conjuncts[0];
  return { kind: "and", of: conjuncts };
}

function buildEligibilityTiers(
  callType: string,
  rules: ProgramRule[]
): EligibilityTier[] {
  // Phase 1: a single tier per call type from the legacy pool rules. Fallback tiers
  // (e.g. Backup PGY-4 covering) are authored on top in Phase 3.
  return [{ predicate: poolEligibilityPredicate(callType, rules), preference: 0 }];
}

function buildPairing(
  callType: string,
  rules: ProgramRule[]
): PairingConstraint[] {
  if (callType !== "Buddy") return [];
  const buddyPolicy = resolveBuddyPolicy(rules);
  // Buddy's Primary partner must be the configured partner PGY.
  return [
    {
      otherSlot: "Primary",
      predicate: { kind: "pgyIn", years: [buddyPolicy.partnerPgyYear] },
      severity: "hard",
      message: `Buddy must be paired with a PGY-${buddyPolicy.partnerPgyYear} Primary.`,
    },
  ];
}

export function compilePolicy(
  rules: ProgramRule[],
  slotDefinitions?: ProgramCallSlotDefinition[]
): CallPolicy {
  const enabledRules = rules.filter(isRuleEnabled);
  const defs =
    slotDefinitions && slotDefinitions.length > 0
      ? slotDefinitions
      : extractSlotDefinitions(enabledRules);

  const requiredCallTypes = new Set(getRequiredCallTypesFromRules(enabledRules));
  const buddyPolicy = resolveBuddyPolicy(enabledRules);

  const slots: SlotPolicy[] = defs.map((def) => {
    const requiredWhenVisible = def.requiredWhenVisible !== false;
    const isRequiredCallType = requiredCallTypes.has(def.callType as never);
    const required: Predicate =
      requiredWhenVisible || isRequiredCallType
        ? { kind: "always" }
        : { kind: "never" };

    return {
      callType: def.callType,
      present: slotPresencePredicate(def),
      required,
      eligibility: buildEligibilityTiers(def.callType, enabledRules),
      pairing: buildPairing(def.callType, enabledRules),
      countsTowardWorkload: def.countsTowardWorkload,
      sortOrder: def.sortOrder ?? 0,
    };
  });

  slots.sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    version: POLICY_VERSION,
    slots,
    globals: {
      buddy: {
        // Hard cap. The legacy `requiredDaysPerMonth` (default 2) is the intended
        // maximum; the new engine treats it as a ceiling, never a per-intern minimum
        // to top up toward (that was the #3 over-production bug).
        maxWeekendsPerInternMonth: buddyPolicy.requiredDaysPerMonth,
        serviceTokens: buddyPolicy.eligibleRotationNameTokens,
      },
    },
    rules: enabledRules,
  };
}
