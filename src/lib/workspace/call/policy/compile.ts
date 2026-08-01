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

/**
 * Opt-in "grey zone" configuration read (loosely) from the program's buddy_requirement
 * rule. Every field is optional; when unset the compiler produces exactly the Phase-1/2
 * behavior (verified by policy-parity.test.ts), so enabling these is per-program.
 */
type GreyZone = {
  buddyPgyYears: number[];
  serviceTokens: string[];
  /** Broader service tokens used to count an intern's orthopedic months for Primary progression. */
  primaryServiceTokens: string[];
  /** Gen-Ortho month indices a buddy is eligible in (e.g. [1] = first month). null = not configured. */
  buddyMonthIndices: number[] | null;
  /** PGY years accepted as a Buddy's Primary partner. */
  partnerPgyYears: number[];
  /** True when partnerPgyYears was explicitly configured (drives presence override). */
  partnerExplicit: boolean;
  /** Interns (buddyPgyYears) join the Primary pool from this service-month index. null = off. */
  internPrimaryFromMonthIndex: number | null;
};

function resolveGreyZone(rules: ProgramRule[]): GreyZone {
  const buddyPolicy = resolveBuddyPolicy(rules);
  const config = resolveMatchingRules(rules, ["buddy_requirement"])[0]?.config ?? {};

  const buddyMonthIndices = Array.isArray(config.eligibleServiceMonthIndices)
    ? normalizeNumericList(config.eligibleServiceMonthIndices)
    : [1];

  const partnerConfigured =
    Array.isArray(config.partnerPgyYears) && config.partnerPgyYears.length > 0;
  const partnerPgyYears = partnerConfigured
    ? normalizeNumericList(config.partnerPgyYears)
    : [buddyPolicy.partnerPgyYear];

  const internPrimaryFromMonthIndex =
    typeof config.internPrimaryFromServiceMonthIndex === "number" &&
    Number.isFinite(config.internPrimaryFromServiceMonthIndex)
      ? config.internPrimaryFromServiceMonthIndex
      : 2;

  const configuredPrimaryTokens = Array.isArray(config.internPrimaryServiceTokens)
    ? config.internPrimaryServiceTokens
        .filter((token): token is string => typeof token === "string")
        .map((token) => token.trim())
        .filter(Boolean)
    : [];

  return {
    buddyPgyYears: buddyPolicy.buddyPgyYears,
    serviceTokens: buddyPolicy.eligibleRotationNameTokens,
    primaryServiceTokens:
      configuredPrimaryTokens.length > 0 ? configuredPrimaryTokens : ["ortho"],
    buddyMonthIndices,
    partnerPgyYears,
    partnerExplicit: partnerConfigured,
    internPrimaryFromMonthIndex,
  };
}

/** or(serviceMonthIndex == n) over a set of indices. */
function serviceMonthIndexInPredicate(tokens: string[], indices: number[]): Predicate {
  const terms: Predicate[] = indices.map((n) => ({
    kind: "serviceMonthIndex",
    tokens,
    op: "eq",
    n,
  }));
  if (terms.length === 0) return { kind: "always" };
  return terms.length === 1 ? terms[0] : { kind: "or", of: terms };
}

/** Day-of-week / condition → the slot's presence predicate. */
function slotPresencePredicate(def: ProgramCallSlotDefinition, gz: GreyZone): Predicate {
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

  // Buddy partner-set override: when a program configures partnerPgyYears, the Buddy
  // slot is present when the Primary occupant is any of those PGYs (e.g. 4 OR 5).
  if (def.callType === "Buddy" && gz.partnerExplicit) {
    const sources =
      cond.sourceSlotCallTypes && cond.sourceSlotCallTypes.length > 0
        ? cond.sourceSlotCallTypes
        : ["Primary"];
    const terms: Predicate[] = sources.map((slot) => ({
      kind: "slotOccupantPgyIn",
      slot,
      years: gz.partnerPgyYears,
    }));
    const condPredicate: Predicate =
      terms.length === 1 ? terms[0] : { kind: "or", of: terms };
    return { kind: "and", of: [base, condPredicate] };
  }

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

/** Backup-style fallback tier authored on a call_slot_definition's `slotFallbackPgyYears`. */
function fallbackTierForCallType(
  callType: string,
  rules: ProgramRule[]
): EligibilityTier | null {
  for (const match of resolveMatchingRules(rules, ["call_slot_definition"])) {
    const config = match.config;
    if (config.slotCallType !== callType) continue;
    if (!Array.isArray(config.slotFallbackPgyYears)) continue;
    const fallbackPgyYears = normalizeNumericList(config.slotFallbackPgyYears);
    if (fallbackPgyYears.length === 0) continue;
    const label =
      typeof config.slotFallbackLabel === "string"
        ? config.slotFallbackLabel
        : `Fallback: PGY-${fallbackPgyYears.join("/")} covering`;
    return {
      predicate: { kind: "pgyIn", years: fallbackPgyYears },
      preference: 1,
      softLabel: label,
    };
  }
  return null;
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
  rules: ProgramRule[],
  gz: GreyZone
): EligibilityTier[] {
  const tiers: EligibilityTier[] = [];

  // Base pool tier (preference 0).
  if (callType === "Buddy" && gz.buddyMonthIndices !== null) {
    // Grey-zone Buddy: an eligible intern (buddyPgyYears) on the buddy service in one
    // of the configured Gen-Ortho month indices (e.g. first month only). Replaces the
    // legacy any-month PGY-1 pool tier.
    tiers.push({
      preference: 0,
      predicate: {
        kind: "and",
        of: [
          { kind: "pgyIn", years: gz.buddyPgyYears },
          serviceMonthIndexInPredicate(gz.serviceTokens, gz.buddyMonthIndices),
        ],
      },
    });
  } else {
    tiers.push({ predicate: poolEligibilityPredicate(callType, rules), preference: 0 });
  }

  // Intern → Primary progression: interns join the Primary pool once experienced.
  if (callType === "Primary" && gz.internPrimaryFromMonthIndex !== null) {
    tiers.push({
      preference: 0,
      predicate: {
        kind: "and",
        of: [
          { kind: "pgyIn", years: gz.buddyPgyYears },
          {
            kind: "serviceMonthIndex",
            tokens: gz.primaryServiceTokens,
            op: "gte",
            n: gz.internPrimaryFromMonthIndex,
          },
        ],
      },
    });
  }

  // Fallback pool tier (preference 1), e.g. Backup = PGY-5 preferred, PGY-4 if needed.
  const fallback = fallbackTierForCallType(callType, rules);
  if (fallback) tiers.push(fallback);

  return tiers;
}

function buildPairing(callType: string, gz: GreyZone): PairingConstraint[] {
  if (callType !== "Buddy") return [];
  const label = gz.partnerPgyYears.map((y) => `PGY-${y}`).join(" or ");
  return [
    {
      otherSlot: "Primary",
      predicate: { kind: "pgyIn", years: gz.partnerPgyYears },
      severity: "hard",
      message: `Buddy must be paired with a ${label} Primary.`,
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
  const greyZone = resolveGreyZone(enabledRules);

  const slots: SlotPolicy[] = defs.map((def) => {
    const requiredWhenVisible = def.requiredWhenVisible !== false;
    const isRequiredCallType = requiredCallTypes.has(def.callType as never);
    const required: Predicate =
      requiredWhenVisible || isRequiredCallType
        ? { kind: "always" }
        : { kind: "never" };

    return {
      callType: def.callType,
      present: slotPresencePredicate(def, greyZone),
      required,
      eligibility: buildEligibilityTiers(def.callType, enabledRules, greyZone),
      pairing: buildPairing(def.callType, greyZone),
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
