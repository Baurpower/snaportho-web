/**
 * Call Hub Policy Engine — runtime adapter for live consumers.
 *
 * Builds a compiled policy + scheduling context once from the data a consumer already
 * has (rules, slot definitions, residents, availability, assignments) and exposes the
 * handful of helpers consumers need: per-(resident,slot,date) evaluation, slot
 * presence, and the eligible resident list for a picker. This is the single seam the
 * pickers, add/edit views, generator, validation, swaps, and AI packet call so none of
 * them re-implement eligibility.
 *
 * Note on Buddy: `evaluateSlot` deliberately mirrors today's slot eligibility (any
 * PGY-1 is Buddy-"allowed" per the call pool), which keeps the parity harness exact.
 * The "buddy roster" gate (intern must be ON the buddy service that day) is applied
 * here in `selectableResidentsForSlot`, reproducing the old buddy-roster behavior
 * without the standalone buddy engine. The "first ortho month only" temporal tightening
 * moves into the Buddy eligibility tier in Phase 3.
 */
import type {
  DraftDayAssignment,
  ProgramCallSlotDefinition,
  ProgramRule,
  ResidentAvailabilityMap,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";
import { buildSchedulingContext, type SchedulingContext } from "@/lib/workspace/call/policy/context";
import { compilePolicy } from "@/lib/workspace/call/policy/compile";
import { evaluateSlot, evaluateSlotPresence } from "@/lib/workspace/call/policy/evaluator";
import { evalPredicate } from "@/lib/workspace/call/policy/predicates";
import type { CallPolicy, SlotEvaluation } from "@/lib/workspace/call/policy/types";

export type EngineHelpers = {
  policy: CallPolicy;
  ctx: SchedulingContext;
  /** Full evaluation for a (resident, slot, date). */
  evaluate: (resident: ResidentOption, slot: string, dateKey: string) => SlotEvaluation;
  /** Hard-eligibility only (parity with isResidentAllowedForSlot). */
  isAllowed: (resident: ResidentOption, slot: string, dateKey: string) => boolean;
  /**
   * Whether a resident may be ASSIGNED to a slot on a date: hard-eligible AND, for
   * Buddy, on the buddy service (the roster gate). This is what taps/candidate lists
   * should gate on; `isAllowed` is the raw parity-eligibility.
   */
  isSelectable: (resident: ResidentOption, slot: string, dateKey: string) => boolean;
  /** Slot presence/requiredness on a date (no candidate needed). */
  presence: (slot: string, dateKey: string) => { present: boolean; required: boolean };
  /**
   * Residents eligible to take `slot` on `dateKey`, ordered by tier preference then
   * PGY. For Buddy, additionally gated to the buddy service (the buddy roster).
   */
  selectableResidentsForSlot: (
    slot: string,
    dateKey: string,
    candidates: ResidentOption[]
  ) => ResidentOption[];
};

export function makeEngineHelpers(params: {
  rules: ProgramRule[];
  slotDefinitions?: ProgramCallSlotDefinition[];
  residents: ResidentOption[];
  availability?: ResidentAvailabilityMap;
  assignments?: Record<string, DraftDayAssignment>;
}): EngineHelpers {
  const {
    rules,
    slotDefinitions,
    residents,
    availability = {},
    assignments = {},
  } = params;

  const policy = compilePolicy(rules, slotDefinitions);
  const ctx = buildSchedulingContext({ residents, availability, assignments });
  const buddyServiceTokens = policy.globals.buddy.serviceTokens;

  const evaluate = (resident: ResidentOption, slot: string, dateKey: string) =>
    evaluateSlot({
      resident,
      slot,
      dateKey,
      ctx,
      policy,
      assignments,
      availabilityByResident: availability,
    });

  const isAllowed = (resident: ResidentOption, slot: string, dateKey: string) =>
    evaluate(resident, slot, dateKey).eligible;

  const presence = (slot: string, dateKey: string) => {
    const { present, required } = evaluateSlotPresence(policy, slot, dateKey, ctx);
    return { present, required };
  };

  const onBuddyService = (residentId: string, dateKey: string) =>
    buddyServiceTokens.length === 0 ||
    evalPredicate(
      { kind: "onService", tokens: buddyServiceTokens },
      { residentId, dateKey },
      ctx
    );

  const isSelectable = (resident: ResidentOption, slot: string, dateKey: string) => {
    if (!evaluate(resident, slot, dateKey).eligible) return false;
    if (slot === "Buddy" && !onBuddyService(resident.residentId, dateKey)) return false;
    return true;
  };

  const selectableResidentsForSlot = (
    slot: string,
    dateKey: string,
    candidates: ResidentOption[]
  ): ResidentOption[] => {
    const eligible = candidates
      .map((resident) => ({ resident, ev: evaluate(resident, slot, dateKey) }))
      .filter(({ resident, ev }) => {
        if (!ev.eligible) return false;
        // Buddy roster gate: intern must be on the buddy service that day.
        if (slot === "Buddy" && !onBuddyService(resident.residentId, dateKey)) {
          return false;
        }
        return true;
      });

    // Order by tier preference (preferred pool first), then PGY, then name.
    eligible.sort((a, b) => {
      const pa = a.ev.tierPreference ?? 0;
      const pb = b.ev.tierPreference ?? 0;
      if (pa !== pb) return pa - pb;
      const ya = ctx.pgyOf(a.resident.residentId, dateKey) ?? 99;
      const yb = ctx.pgyOf(b.resident.residentId, dateKey) ?? 99;
      if (ya !== yb) return ya - yb;
      return a.resident.displayName.localeCompare(b.resident.displayName);
    });

    return eligible.map(({ resident }) => resident);
  };

  return {
    policy,
    ctx,
    evaluate,
    isAllowed,
    isSelectable,
    presence,
    selectableResidentsForSlot,
  };
}
